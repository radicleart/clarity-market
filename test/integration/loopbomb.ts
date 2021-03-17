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

async function deployContract(contractName: string, nonce): Promise<Object> {
  console.log("deploying contract: " + contractName);
  network.coreApiUrl = "http://localhost:" + port;
  const codeBody = fs.readFileSync("./contracts/" + contractName + ".clar").toString();
  var transaction = await makeContractDeploy({
    contractName,
    codeBody,
    fee,
    senderKey: keys['contract-base'].secretKey, // using same key allows contract-call?
    // nonce: nonce,   // watch for nonce increments if this works - may need to restart mocknet!
    network,
  });
  var result = await broadcastTransaction(transaction, network);
  await new Promise((r) => setTimeout(r, 30000));
  return result;
}
async function callContract(nonce, sender: string, contractName: string, functionName: string, functionArgs: ClarityValue[]): Promise<StacksTransaction> {
  console.log("transaction: contract=" + contractName + " sender=" + sender + " function=" + functionName + " args= .. ");
  var transaction = await makeContractCall({
    contractAddress: keys['contract-base'].stacksAddress,
    contractName,
    functionName,
    functionArgs,
    fee,
    senderKey: keys[sender].secretKey,
    nonce,
    network,
  });
  var result = await broadcastTransaction(transaction, network);
  // console.log(transaction);
  // console.log(result);
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
    senderAddress: keys[sender].secretKey,
  };  
  var result = await callReadOnlyFunction(options);
  return result;
}

describe("Deploying contracts", () => {
  it("should deploy loopbomb and projects and wait for confirmation", async () => {
    let result: any = await deployContract("loopbomb", new BigNum(0));
    assert.isNotOk(result.error, "Transaction succeeded");
    console.log(result.error)
  });
});

describe("Check contracts deployed", () => {
  it("should read address of administrator", async () => {
    let result: any = await callReadOnly(new BigNum(0), "contract-base", "loopbomb", "get-administrator", []);
    assert.isOk(result.error, "Transaction succeeded");
  })
})
/**
describe("Test project admin functions", () => {
  it("should allow insert if tx-sender is contract owner", async () => {
    let args = [standardPrincipalCV(keys['project1'].stacksAddress), bufferCV(Buffer.from("http://project1.com/assets/v1")), uintCV(0x5000)];
    let result: any = await callContract(new BigNum(2), "contract-base", "loopbomb", "add-project", args);
    assert.isNotOk(result.error, "Transaction succeeded");
    console.log(result.error)
  })
  it("should allow read of inserted project", async () => {
    let args = [standardPrincipalCV(keys['project1'].stacksAddress)];
    let result: any = await callContract(new BigNum(0), "project1", "loopbomb", "get-project", args);
  })
  it("should return error if no project found", async () => {
    let args = [standardPrincipalCV(keys['project1'].stacksAddress)];
    let result: any = await callContract(new BigNum(0), "project2", "loopbomb", "get-project", args);
    assert.isNotOk(result.error, "Transaction succeeded");
    console.log(result.error)
  })
});

describe("Test minting functions", () => {
  it("should mint a non fungible token", async () => {
    let args = [intCV(0x100),  uintCV(0x5000), bufferCV(Buffer.from("asset1"))];
    let result: any = await callContract(new BigNum(0), "minter", "loopbomb", "mint-to", args);
    assert.isNotOk(result.error, "Transaction succeeded");
    console.log(result.error)
  });
  it("should override the mint fee with the projects fee", async () => {
    let args = [intCV(0x100),  uintCV(0x5000), bufferCV(Buffer.from("asset1"))];
    let result: any = await callContract(new BigNum(0), "minter", "loopbomb", "mint-to", args);
    assert.isNotOk(result.error, "Transaction succeeded");
    console.log(result.error)
  });
  it("should return a project for an asset", async () => {
    let args = [bufferCV(Buffer.from("asset1"))];
    let result: any = await callContract(new BigNum(0), "minter", "loopbomb", "get-project-id", args);
    assert.isNotOk(result.error, "Transaction succeeded");
    console.log(result.error)
  });
});
  **/

after(async () => {
  // await provider.close();
});
