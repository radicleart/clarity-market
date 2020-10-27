import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
import { readFromContract, execMethod } from "./query-utils"
import * as fs from "fs";
describe("nongibles tutorial test suite", () => {

  const contractKeys = JSON.parse(fs.readFileSync("./keys-contract-base.json").toString());
  const project1Keys = JSON.parse(fs.readFileSync("./keys-project1.json").toString());
  const project2Keys = JSON.parse(fs.readFileSync("./keys-project2.json").toString());
  let client: Client;
  let provider: Provider;

  const contractKey = contractKeys.stacksAddress;
  const project1Key = project1Keys.stacksAddress;
  const project2Key = project2Keys.stacksAddress;

  before(async () => {
    provider = await ProviderRegistry.createProvider();
    client = new Client(contractKey + ".nongibles", "nongibles", provider);
  });

  describe("Deploying an instance of the contract", () => {
    it("should have a valid syntax", async () => {
      await client.checkContract();
      await client.deployContract();
    });
  });

  describe("== Nongibles tests ================================================", () => {
    it("should return the contract address", async () => {
      const result = await readFromContract(client, "get-address", []);
      assert.isOk(result.rawResult.indexOf(contractKey) > -1);
    })
    it("should let administrator mint an asset", async () => {
      let txreceive = await execMethod(client, contractKey, "admin-mint", ["\"admin asset\"", "100"]);
      assert.isOk(txreceive.success, "Transaction succeeded");
    });
    it("should return correct project id", async () => {
      const result = await readFromContract(client, "get-project-id", ["\"admin asset\""]);
      assert.isOk(result.rawResult.indexOf("100") > -1);
    })
    it("should return correct owner (administrator)", async () => {
      const result = await readFromContract(client, "get-owner", ["\"admin asset\""], true);
      assert.isOk(result.rawResult.indexOf(contractKey) > -1);
    })
  })
  
  after(async () => {
    await provider.close();
  });
});
