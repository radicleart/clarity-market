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
import { bufferCV, listCV, standardPrincipalCV, uintCV } from "@stacks/transactions";

const BigNum = require("bn.js"); 
const network = new StacksTestnet();
const fee = new BigNum(3000);
const port = 20443;
const keys = {
  'contract-base': JSON.parse(fs.readFileSync("./keys-contract-base.json").toString()),
  'minter': JSON.parse(fs.readFileSync("./keys-minter.json").toString()),
  'project1': JSON.parse(fs.readFileSync("./keys-project1.json").toString()),
  'project2': JSON.parse(fs.readFileSync("./keys-project2.json").toString()),
}
let loopbombClient: Client;
let provider: Provider;

before(async () => {
  provider = await ProviderRegistry.createProvider();
  loopbombClient = new Client(keys['contract-base'] + ".loopbomb", "loopbomb", provider);
});

async function deployContract(contractName: string, nonce): Promise<Object> {
  console.log("deploying contract: " + contractName);
  network.coreApiUrl = "http://localhost:" + port;
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
  console.log("transaction: contract=" + contractName + " sender=" + keys[sender].stacksAddress + " function=" + functionName + " args= .. " + functionArgs);
  var transaction = await makeContractCall({
    contractAddress: keys['contract-base'].stacksAddress,
    contractName,
    functionName,
    functionArgs,
    senderKey: keys[sender].secretKey,
    network,
  });
  var result = await broadcastTransaction(transaction, network);
  // console.log(transaction);
  console.log("Result for the callContract : " + result);
  return result;
}

async function callReadOnly(nonce, sender: string, contractName: string, functionName: string, functionArgs: ClarityValue[]): Promise<any> {
  console.log("transaction: contract=" + contractName + " sender=" + keys[sender].stacksAddress + " function=" + functionName + " args= .. " + functionArgs);
  const options = {
    contractAddress: keys[sender].stacksAddress,
    contractName,
    functionName,
    functionArgs: functionArgs,
    network,
    senderAddress: keys[sender].stacksAddress,
  };  
  var result = await callReadOnlyFunction(options);
  console.log("Result for the readonly : " + result)
  return result;
}

describe("Deploying contracts", () => {

  it("should have a valid syntax", async () => {
    await loopbombClient.checkContract();
  });

  it("should deploy loopbomb and projects and wait for confirmation", async () => {
    let result: any = await deployContract("loopbomb", new BigNum(0));
    assert.equal(result.error, null, result.error);
  });
});

describe("Check contracts deployed", () => {
  it("should read the address of the administrator", async () => {
    let result: any = await callReadOnly(new BigNum(0), "contract-base", "loopbomb", "get-administrator", []);
    assert.equal(result.address.hash160, '5d9f3212597e5aae391a7b661c1683024e2af32f', result);
  });
});

describe("Test the main functions", () => {
  it("Should mint a new token, using the mint-token function", async () => {
    const assetHash = Buffer.from("9d20c6dd2881c64abf26ff30f")
    const gaiaUsername = Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    const args = [bufferCV(assetHash),
                  bufferCV(gaiaUsername),
                  uintCV(5),
                  listCV([standardPrincipalCV(keys['project1'].stacksAddress), standardPrincipalCV(keys['project2'].stacksAddress)]),
                  listCV([uintCV(5000), uintCV(5000)])]
    let result = await callContract(new BigNum(0), "contract-base", "loopbomb", "mint-token", args)
    assert.equal(result.error, null, result.error)
    await new Promise((r) => setTimeout(r, 20000)); 
  });

  it("Should mint a new edition of an existing token, using the mint-edition function", async () => {
    const nftIndex = uintCV(0)
    const nextBidAmount = uintCV(10000)
    let args = [nftIndex, nextBidAmount]
    let result = await callContract(new BigNum(0), "contract-base", "loopbomb", "mint-edition", args)
    assert.equal(result.error, null, result.error)
    await new Promise((r) => setTimeout(r, 20000));
  });

  it("Should not be able to buy now because the token is in u3 sale type", async () => {
    const nftIndex = uintCV(1)
    let args = [nftIndex]
    let result = await callContract(new BigNum(0), "contract-base", "loopbomb", "buy-now", args)
    assert.equal(result.error, "u16", result)
  });
});

after(async () => {
  // await provider.close();
});
