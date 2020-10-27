import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
import { readFromContract, execMethod } from "./query-utils"
import * as fs from "fs";
describe("app-map tutorial test suite", () => {

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
    client = new Client(contractKey + ".app-map", "app-map", provider);
  });

  describe("Deploying an instance of the contract", () => {
    it("should have a valid syntax", async () => {
      await client.checkContract();
      await client.deployContract();
    });
  });

  describe("Project map tests", () => {
    it("should return the contract address", async () => {
      const result = await readFromContract(client, "get-administrator", []);
      assert.isOk(result.rawResult.indexOf("STGPPTWJEZ2YAA7XMPVZ7EGKH0WX9F2DBNHTG5EY") > -1);
    })
    it("should allow insert if tx-sender is contract owner", async () => {
      let txreceive = await execMethod(client, contractKey, "add-project", [ `'${project1Key}`, "\"http://project1.com/assets/v1\"","u5000"]);
      assert.isOk(txreceive.success, "Transaction succeeded");
      const result = await readFromContract(client, "get-project", [`'${project1Key}`]);
      assert.isOk(result.rawResult.indexOf('u5000') > -1, "Ensure mint price is correct");
      assert.equal(result.strings[0], "http://project1.com/assets/v1");
      assert.equal(result.strings.length, 1);
    })
    it("should return error if no project found", async () => {
      const result = await readFromContract(client, "get-project", [`'${project2Key}`], true);
      assert.isOk(result.rawResult.indexOf('err u100') > -1, "returns error: not found");
      assert.equal(result.strings.length, 0);
    })
    it("should prevent update if project already exists", async () => {
      let txreceive = await execMethod(client, contractKey, "add-project", [ `'${project1Key}`, "\"http://apples.com/assets/v1\"","u7000"]);
      assert.isOk(txreceive.success, "Transaction succeeded");
      const result = await readFromContract(client, "get-project", [`'${project1Key}`]);
      assert.isOk(result.rawResult.indexOf('u7000') === -1, "Ensure mint price has not been changed");
      assert.equal(result.strings[0], "http://project1.com/assets/v1");
      assert.equal(result.strings.length, 1);
    })
    it("should get the minting fee of the project", async () => {
      const result = await readFromContract(client, "get-mint-fee", [`'${project1Key}`], true);
      assert.isOk(result.rawResult === '(ok u5000)', "Ensure mint price is returned");
    })
    it("should prevent insert when tx signer not contract owner", async () => {
      let txreceive = await execMethod(client, project1Key, "add-project", [ `'${project1Key}`, "\"http://apples.com/assets/v1\"","u7000"]);
      assert.isNotOk(txreceive.success, "Transaction failed");
    })
    it("should allow insert of new project", async () => {
      let txreceive = await execMethod(client, contractKey, "add-project", [ `'${project2Key}`, "\"http://project2.com/assets/v1\"","u10000"]);
      assert.isOk(txreceive.success, "Transaction failed");
      const result = await readFromContract(client, "get-project", [`'${project2Key}`]);
      assert.isOk(result.rawResult.indexOf('u10000') > -1, "Ensure mint price is correct");
      assert.equal(result.strings[0], "http://project2.com/assets/v1");
      assert.equal(result.strings.length, 1);
    })
    it("should allow update of existing project only if tx signer is project owner", async () => {
      let txreceive = await execMethod(client, project2Key, "update-project", [ `'${project2Key}`, "\"http://project2.com/assets/v2\"","u8000"]);
      assert.isOk(txreceive.success, "Transaction failed");
      const result = await readFromContract(client, "get-project", [`'${project2Key}`]);
      assert.isOk(result.rawResult.indexOf('u8000') > -1, "Ensure mint price is correct");
      assert.equal(result.strings[0], "http://project2.com/assets/v2");
      assert.equal(result.strings.length, 1);
    })
  });
  
  after(async () => {
    await provider.close();
  });
});
