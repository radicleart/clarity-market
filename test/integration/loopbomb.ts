//---------------------------------------------------------------------------------------------
// Importing the packages needed and creating global variables
//---------------------------------------------------------------------------------------------
import { assert } from "chai";
import * as fs from "fs";
import {
  makeContractDeploy,
  makeContractCall,
  callReadOnlyFunction,
  ClarityValue,
  broadcastTransaction,
} from "@stacks/transactions";
import { StacksTestnet } from '@stacks/network';
import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { describe } from "mocha";
import axios from 'axios'
import { bufferCV, listCV, standardPrincipalCV, uintCV, hexToCV } from "@stacks/transactions";

const BigNum = require("bn.js"); 
const network = new StacksTestnet();
const fee = new BigNum(3000);
const portRpc = 20443;
const portAPI = 3999;
const keys = {
  'contract-base': JSON.parse(fs.readFileSync("./keys-contract-base.json").toString()),
  'minter': JSON.parse(fs.readFileSync("./keys-minter.json").toString()),
  'project1': JSON.parse(fs.readFileSync("./keys-project1.json").toString()),
  'project2': JSON.parse(fs.readFileSync("./keys-project2.json").toString()),
}
let loopbombClient: Client;
let provider: Provider;
let contractName: 'loopbomb-v1';

before(async () => {
  provider = await ProviderRegistry.createProvider();
  loopbombClient = new Client(keys['contract-base'] + "." + contractName, contractName, provider);
});

//---------------------------------------------------------------------------------------------
// Defining the functions used to call the contract
//---------------------------------------------------------------------------------------------

async function deployContract(contractName: string, nonce): Promise<Object> {
  console.log("deploying contract: " + contractName);
  network.coreApiUrl = "http://localhost:" + portRpc;
  const codeBody = fs.readFileSync("./contracts/" + contractName + ".clar").toString();
  var transaction = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey: keys['contract-base'].secretKey, // using same key allows contract-call?
    // nonce: nonce,   // watch for nonce increments if this works - may need to restart mocknet!
    network,
  });
  var result = await broadcastTransaction(transaction, network);
  await new Promise((r) => setTimeout(r, 10000)); 
  return result;
}
async function callContract(nonce, sender: string, contractName: string, functionName: string, functionArgs: ClarityValue[]): Promise<any> {
  var transaction = await makeContractCall({
    contractAddress: keys['contract-base'].stacksAddress,
    contractName,
    functionName,
    functionArgs,
    senderKey: keys[sender].secretKey,
    network,
  });
  var result = await broadcastTransaction(transaction, network);
  await new Promise((r) => setTimeout(r, 10000)); 
  const url = "http://localhost:" + portAPI + "/extended/v1/tx/" + result
  const output = await axios.get(url)
  return output.data
}

async function callReadOnly(nonce, sender: string, contractName: string, functionName: string, functionArgs: any): Promise<any> {
  const options = {
    arguments : functionArgs,
    sender : keys[sender].stacksAddress
  }
  const headers = {
    'Content-Type': 'application/json'
  }
  const url = "http://localhost:" + portAPI + "/v2/contracts/call-read/" + keys[sender].stacksAddress + "/" + contractName + "/" + functionName
  const output = await axios.post(url, options, { headers: headers })
  let uncryptedOutput = null;
  try {
    uncryptedOutput = hexToCV(output.data.result)
  } catch {
    uncryptedOutput = output
  }
  return uncryptedOutput;
}

//---------------------------------------------------------------------------------------------
// Starting the tests
//---------------------------------------------------------------------------------------------

describe("Deploying contracts", () => {

  it("should have a valid syntax", async () => {
    await loopbombClient.checkContract();
  });

  it("should deploy loopbomb and projects and wait for confirmation", async () => {
    let result: any = await deployContract(contractName, new BigNum(0));
    assert.equal(result.error, null, result.error);
  });
});

//---------------------------------------------------------------------------------------------
// 1) Read only functions and parameters of the contract
//---------------------------------------------------------------------------------------------

describe("Read only functions and parameters of the contract", () => {
  it("should read the address of the administrator", async () => {
    let result: any = await callReadOnly(new BigNum(0), "contract-base", contractName, "get-administrator", []);
    assert.equal(result.address.hash160, '5d9f3212597e5aae391a7b661c1683024e2af32f', result);
  });

  it("should read the contract data", async () => {
    let result: any = await callReadOnly(new BigNum(0), "contract-base", contractName, "get-contract-data", []);
    assert.equal(result.value.data.tokenSymbol.data, 'LOOP', result);
  });

  it("should update the minting price if it is the administrator", async () => {
    let result: any = await callContract(new BigNum(0), "project1", contractName, "update-mint-price", [uintCV(5000)]);
    assert.equal(result.tx_result.repr, '(err u10)', result);

    result = await callContract(new BigNum(0), "contract-base", contractName, "update-mint-price", [uintCV(5000)]);
    assert.equal(result.tx_result.repr, '(ok true)', result)
  }); 

  it("should update the fees only if it is the administrator", async () => {
    let result: any = await callContract(new BigNum(0), "contract-base", contractName, "change-fee", [uintCV(4)]);
    assert.equal(result.tx_result.repr, '(ok true)', result);
  });

  it("Should be able to change the administrator", async () => {
    let result: any = await callContract(new BigNum(0), "contract-base", contractName, "transfer-administrator", [standardPrincipalCV(keys['project1'].stacksAddress)]);
    assert.equal(result.tx_result.repr, '(ok true)', result)

    result = await callReadOnly(new BigNum(0), "contract-base", contractName, "get-administrator", []);
    assert.notEqual(result.address.hash160, '5d9f3212597e5aae391a7b661c1683024e2af32f', result)

    await callContract(new BigNum(0), "project1", contractName, "transfer-administrator", [standardPrincipalCV(keys['contract-base'].stacksAddress)]);
    result = await callReadOnly(new BigNum(0), "contract-base", contractName, "get-administrator", []);
    assert.equal(result.address.hash160, '5d9f3212597e5aae391a7b661c1683024e2af32f', result);
  });
});

//---------------------------------------------------------------------------------------------
// 2) Minting process
//---------------------------------------------------------------------------------------------

describe("Minting process", () => {
  it("Should mint a new token, using the mint-token function", async () => {
    const assetHash = Buffer.from("9d20c6dd2881c64abf26ff30f")
    const gaiaUsername = Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    const args = [bufferCV(assetHash),
                  bufferCV(gaiaUsername),
                  uintCV(5),
                  listCV([standardPrincipalCV(keys['project1'].stacksAddress), standardPrincipalCV(keys['project2'].stacksAddress),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG")]),
                  listCV([uintCV(500), uintCV(500),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0)])]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "mint-token", args)
    assert.equal(result.tx_result.repr, '(ok u0)', result)
  });

  it("Should set the sale-data of the previous token", async () => {
    const nftIndex = uintCV(0)
    const saleType = uintCV(1)
    const incrementStx = uintCV(1000)
    const reserveStx = uintCV(0)
    const amountStx = uintCV(10000)
    const biddingEndTime = uintCV(181440000)
    const args = [nftIndex, saleType, incrementStx, reserveStx, amountStx, biddingEndTime]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "set-sale-data", args)
    assert.equal(result.tx_result.repr, '(ok u0)', result)
  });

  it("Should return the mintCounter variable", async () => {
    let result = await callReadOnly(new BigNum(0), "contract-base", contractName, "get-mint-counter", [])
    assert.equal(result.value.value.toNumber(), '1', result)
  });

  it("Should mint a new edition of an existing token, using the mint-edition function", async () => {
    const nftIndex = uintCV(0)
    const nextBidAmount = uintCV(10000)
    let args = [nftIndex, nextBidAmount]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "mint-edition", args)
    assert.equal(result.tx_result.repr, '(ok u1)', result)
  });

  it("Should return the mintCounter variable", async () => {
    let result = await callReadOnly(new BigNum(0), "contract-base", contractName, "get-mint-counter", [])
    console.log(result.value.value.toNumber())
    assert.equal(result.value.value.toNumber(), '2', result)
  });

  it("Should mint another new token, using the mint-token function", async () => {
    const assetHash = Buffer.from("65775868aac1c64abf26ff30f")
    const gaiaUsername = Buffer.from("bbbbbbbbbbbbbbbbbbbbbbbbbbb")
    const args = [bufferCV(assetHash),
                  bufferCV(gaiaUsername),
                  uintCV(2),
                  listCV([standardPrincipalCV(keys['project1'].stacksAddress), standardPrincipalCV(keys['project2'].stacksAddress),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG")]),
                  listCV([uintCV(3000), uintCV(1000),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0)])]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "mint-token", args)
    assert.equal(result.tx_result.repr, '(ok u2)', result)
  });

  it("Should set the sale-data of the previous token", async () => {
    const nftIndex = uintCV(2)
    const saleType = uintCV(2)
    const incrementStx = uintCV(1000)
    const reserveStx = uintCV(0)
    const amountStx = uintCV(20000)
    const biddingEndTime = uintCV(1618915500)
    const args = [nftIndex, saleType, incrementStx, reserveStx, amountStx, biddingEndTime]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "set-sale-data", args)
    assert.equal(result.tx_result.repr, '(ok u2)', result)
  });

  it("Should mint two new editions of an existing token, using the mint-edition function. The second one should fail.", async () => {
    const nftIndex = uintCV(2)
    const nextBidAmount = uintCV(20000)
    let args = [nftIndex, nextBidAmount]
    let result = await callContract(new BigNum(0), "project1", contractName, "mint-edition", args)
    assert.equal(result.tx_result.repr, '(ok u3)', result)

    result = await callContract(new BigNum(0), "project2", contractName, "mint-edition", args)
    assert.equal(result.tx_result.repr, '(err u20)', result)
  });

  it("Should mint a new token, which will be used for the offer tests.", async () => {
    const assetHash = Buffer.from("aeeb58686171c64abf26ff30f")
    const gaiaUsername = Buffer.from("ccccccccccccccccccccccccc")
    const args = [bufferCV(assetHash),
                  bufferCV(gaiaUsername),
                  uintCV(5),
                  listCV([standardPrincipalCV(keys['project1'].stacksAddress), standardPrincipalCV(keys['project2'].stacksAddress),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG"),standardPrincipalCV("STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG")]),
                  listCV([uintCV(4000), uintCV(4000),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0),uintCV(0)])]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "mint-token", args)
    assert.equal(result.tx_result.repr, '(ok u4)', result)
  });

  it("Should set the sale data of the previous token then mint an edition of the token", async () => {
    const nftIndex = uintCV(4)
    const saleType = uintCV(3)
    const incrementStx = uintCV(1000)
    const reserveStx = uintCV(0)
    const amountStx = uintCV(50000)
    const biddingEndTime = uintCV(1618915500)
    let args = [nftIndex, saleType, incrementStx, reserveStx, amountStx, biddingEndTime]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "set-sale-data", args)
    assert.equal(result.tx_result.repr, '(ok u4)', result)

    const nextBidAmount = uintCV(50000)
    args = [nftIndex, nextBidAmount]
    result = await callContract(new BigNum(0), "project1", contractName, "mint-edition", args)
    assert.equal(result.tx_result.repr, '(ok u5)', result)
  });
});

// ---------------------------------------------------------------------------------------------
// 3) Sale-type is 1 : buy now (token 0 and 1)
// ---------------------------------------------------------------------------------------------

describe("Sale-type = 1", () => {
  it('Should verify who is the owner of the token', async () => {
    const nftIndex = uintCV(1)
    let args = [nftIndex]
    let result = await callReadOnly(new BigNum(0), "project1", contractName, "get-owner", args)
    assert.equal(result.address.hash160, "5d9f3212597e5aae391a7b661c1683024e2af32f", result)
  });

  it("Should be able to buy now because the first token is in u1 sale type", async () => {
    const nftIndex = uintCV(1)
    let args = [nftIndex]
    let result = await callContract(new BigNum(0), "project1", contractName, "buy-now", args)
    assert.equal(result.tx_result.repr, '(ok u0)', result)
  });

  it("Should verify that the owner of the token really changed", async () => {
    const nftIndex = uintCV(1)
    let args = [nftIndex]
    let result = await callReadOnly(new BigNum(0), "project1", contractName, "get-owner", args)
    assert.notEqual(result.address.hash160, "5d9f3212597e5aae391a7b661c1683024e2af32f", result)
  });

  it("Should verify that the amount has been distributed as it should", async () => {
    const args = [keys['project2'].stacksAddress]
    let result = await callReadOnly(new BigNum(0), "project2", contractName, "get-balance", args)
    assert.equal(result, 'ok u100000500')
  });
});

// ---------------------------------------------------------------------------------------------
// 4) Sale-type is 2 : bidding process (token 2 and 3)
// ---------------------------------------------------------------------------------------------

describe("Sale-type = 2", () => {
  it('Should verify who is the owner of the token', async () => {
    const nftIndex = uintCV(2)
    let args = [nftIndex]
    let result = await callReadOnly(new BigNum(0), "project1", contractName, "get-owner", args)
    assert.equal(result.address.hash160, "5d9f3212597e5aae391a7b661c1683024e2af32f", result)
  });

  it('Should be able to place a first bid', async () => {
    const args = [uintCV(2), uintCV(10000), uintCV(1618915176)]
    let result = await callContract(new BigNum(0), "project2", contractName, "place-bid", args)
    assert.equal(result.tx_result.repr, '(ok true)', result)
  })

  it("Should be able to place another bid on the same item", async () => {
    const args = [uintCV(2), uintCV(11000), uintCV(1618915250)]
    let result = await callContract(new BigNum(0), "project1", contractName, "place-bid", args)
    assert.equal(result.tx_result.repr, '(ok true)', result)
  });

  it("Should try to place a last bid, but it is too late !", async () => {
    const args = [uintCV(2), uintCV(12000), uintCV(1618915600)]
    let result = await callContract(new BigNum(0), "project2", contractName, "place-bid", args)
    assert.equal(result.tx_result.repr, '(ok true)', result)
  });
});

// ---------------------------------------------------------------------------------------------
// 5) Sale-type is 3 : offer process (token 4 and 5)
// ---------------------------------------------------------------------------------------------

describe("Sale-type = 3 :", () => {
  it("Should be able to make an offer on the token.", async () => {
    const args = [uintCV(3), uintCV(13000), uintCV(1618915250)]
    let result = await callContract(new BigNum(0), "project1", contractName, "make-offer", args)
    assert.equal(result.tx_result.repr, '(ok u1)', result)
  });

  it("Should be able to make another offer on the same token.", async () => {
    const args = [uintCV(3), uintCV(11000), uintCV(1618915280)]
    let result = await callContract(new BigNum(0), "project2", contractName, "make-offer", args)
    assert.equal(result.tx_result.repr, '(ok u1)', result)
  });

  it("Should be able to choose the best offer among both", async () => {
    const args = [uintCV(3), uintCV(0), keys['contract-base'].stacksAddress, keys['project1'].stacksAddress]
    let result = await callContract(new BigNum(0), "contract-base", contractName, "accept-offer", args)
    assert.equal(result.tx_result.repr, '(ok true)', result)
  });
});

after(async () => {
  // await provider.close();
});
