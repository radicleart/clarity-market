import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
import { readFromContract, execMethod } from "./query-utils"
import * as fs from "fs";
import { exec } from "child_process";

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

    it("Should return the administrator address", async () => {
      const result = await readFromContract(loopbombClient, "get-administrator", [], false)
      assert.isOk(result.rawResult == "(ok ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)")
    });

    it("Should return the initial mint-counter", async () => {
      const result = await readFromContract(loopbombClient, "get-mint-counter", [], false)
      assert.isOk(result.rawResult == "(ok u0)")
    });

    it("Should return the token name", async () => {
      const result = await readFromContract(loopbombClient, "get-token-name", [], false)
      assert.isOk(result.rawResult == "(ok loopbomb)")
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
      const args = ["cdfd455d3dd114ad1c74a79405ea5668c1ba13d24b9eab54607444df213bf0da",
                   "u5",
                   "list " + project1Key + " " + project2Key,
                   "list 5000 5000"]
      const txresult = await execMethod(loopbombClient, 
                                      project2Key, 
                                      "mint-token", 
                                      args,
                                      false)
      assert.isOk(txresult.success)
    });
  })


  after(async () => {
    await provider.close();
  });
});
