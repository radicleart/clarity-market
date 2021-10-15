import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
import { readFromContract, execMethod } from "./query-utils"
import * as fs from "fs";
import { exec } from "child_process";
import { bufferCV, listCV, standardPrincipalCV, uintCV } from "@stacks/transactions";

describe("Loopbomb contract test suite", () => {

  const contractKeys = JSON.parse(fs.readFileSync("./keys-contract-base.json").toString());
  const project1Keys = JSON.parse(fs.readFileSync("./keys-project1.json").toString());
  const project2Keys = JSON.parse(fs.readFileSync("./keys-project2.json").toString());

  const contractKey = contractKeys.stacksAddress;
  const project1Key = project1Keys.stacksAddress;
  const project2Key = project2Keys.stacksAddress;

  let loopbombClient: Client;
  let provider: Provider;

  before(async () => {
    provider = await ProviderRegistry.createProvider();
    loopbombClient = new Client(contractKey + ".loopbomb", "loopbomb", provider);
  });

  //Verify that the contract is correctly written and can be deployed

  describe("Deploying an instance of the contract", () => {

    it("should have a valid syntax", async () => {
      await loopbombClient.checkContract();
    });

    it("should deploy the contract", async () => {
      await loopbombClient.deployContract();
    });
  });


  //Verify some basic read-only functions of the contract

  describe("Verifing the variable of the contract", () => {

    it("Verify signature", async () => {
      const assetHash = Buffer.from("0x46295599467141f4f02cecc97cfd576067407a4f904f798674780601a1319c6c")
      const pubky = Buffer.from("0x0242dc3e6bb59ed05a5f71c97af420b4cc4c732d022c9e2b265ef3df92947de0b2")
      const sig = Buffer.from("0xf198cd50a495324d5174d37af22afc826cf6b06b92cddf75140c3bd9656560eeb96cfc73e82c2da49a44d4905dd7829b25791efc1a59642202e11a2404ceb5b801")
      const args = [bufferCV(assetHash),
        bufferCV(pubky),
        bufferCV(sig)
      ]
      let txresult = await execMethod(loopbombClient, project1Key, "verify-sig", [args], false)
      assert.isNotOk(txresult.success)
    });

    it("Should return the administrator address", async () => {
      const result = await readFromContract(loopbombClient, "get-administrator", [], false)
      assert.isOk(result.rawResult == "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW")
    });

    it("Should return the initial mint-counter", async () => {
      const result = await readFromContract(loopbombClient, "get-mint-counter", [], false)
      assert.isOk(result.rawResult == "(ok u0)")
    });

    it("Should return the token name", async () => {
      const result = await readFromContract(loopbombClient, "get-token-name", [], false)
      assert.isOk(result.rawResult == "(ok \"loopbomb\")")
    });

    it("Should only be able to modify the mint price if we are an administartor", async () => {
      let txresult = await execMethod(loopbombClient, project1Key, "update-mint-price", ["u8000"], false)
      assert.isNotOk(txresult.success)

      txresult = await execMethod(loopbombClient, contractKey, "update-mint-price", ["u8000"], false)
      assert.isOk(txresult.success)
    });
  });

  describe("Minting a first NFT", () => {

    it("Should be able to mint a first NFT as anyone", async () => {
      const assetHash = Buffer.from("8d2c4c44ad131300b8d7ac86b14fa1e321f362e9d20c6dd2881c64abf26ff30f")
      const gaiaUsername = Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
      const args = [bufferCV(assetHash),
                    bufferCV(gaiaUsername),
                    uintCV(5),
                    listCV([standardPrincipalCV(project1Key), standardPrincipalCV(project2Key)]),
                    listCV([uintCV(5000), uintCV(5000)])]
      const txresult = await execMethod(loopbombClient, project2Key, "mint-token", args, true)
      assert.isOk(txresult.success)
    });
  });

  after(async () => {
    await provider.close();
  });
});
