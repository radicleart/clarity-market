import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
import { readFromContract, execMethod } from "./query-utils"
import * as fs from "fs";
import axios from 'axios'

describe("appmap tutorial test suite", () => {

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
    client = new Client(contractKey + ".appmap", "appmap", provider);
  });

  describe("Deploying an instance of the contract", () => {
    it("should have a valid syntax", async () => {
      await client.checkContract();
      await client.deployContract();
    });
  });

  describe("Project map tests", () => {
    
    it("should return the admin address", async () => {
      const result = await readFromContract(client, "get-administrator", [], false);
      assert.isOk(result.rawResult.indexOf("ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW") > -1);
    })
    
    it("should fail insert new application if illegal storage", async () => {
      let txreceive = await execMethod(client, project1Key, "add-app", [ "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-project\"","u50"]);
      assert.isNotOk(txreceive.success, "Transaction succeeded");

      txreceive = await execMethod(client, project1Key, "add-app", [ "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-project\"","-1"]);
      assert.isNotOk(txreceive.success, "Transaction succeeded");
    })

    it("should fail insert new application if owner more than 80 chars", async () => {
      let txreceive = await execMethod(client, project1Key, "add-app", [ "\"mijoco.id.blockstackmijoco.id.blockstackmijoco.id.blockstackmijoco.id.blockstackmijoco.id.blockstackijoco.id.blockstackmijoco.id.blockstack\"", "\"" + project1Key + ".my-project\"","u1"]);
      assert.isNotOk(txreceive.success, "Transaction succeeded");
    })

    it("should allow insert 2 new applications", async () => {
      let txreceive = await execMethod(client, project1Key, "add-app", [ "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-gaia-project\"","u1"]);
      assert.isOk(txreceive.success, "Transaction succeeded");

      txreceive = await execMethod(client, project1Key, "add-app", [ "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-filecoin-project\"","u2"]);
      assert.isOk(txreceive.success, "Transaction succeeded");

      txreceive = await execMethod(client, project2Key, "add-app", [ "\"radicle.id.blockstack\"", "\"" + project1Key + ".my-upfs-project\"","u5"]);
      assert.isOk(txreceive.success, "Transaction succeeded");

      txreceive = await execMethod(client, project2Key, "add-app", [ "\"radicle.id.blockstack\"", "\"" + project1Key + ".my-storj-project\"","u6"]);
      assert.isOk(txreceive.success, "Transaction succeeded");

      // const result = await readFromContract(client, "add-app", [`'${project1Key}`]);
      // assert.isOk(result.rawResult.indexOf('u5000') > -1, "Ensure mint price is correct");
      // assert.equal(result.strings[0], "http://project1.com/assets/v1");
      // assert.equal(result.strings.length, 1);
    })

    it("should be able to get apps from map", async () => {
      let result = await readFromContract(client, "get-app", [ "u0"], false);
      assert.isOk(result.rawResult.indexOf('(ok (tuple (owner 0x6d696a6f636f2e69642e626c6f636b737461636b) (projectId 0x53544d59413545414e57364330484e5331533537565835324d3042373935484846444257325842452e6d792d676169612d70726f6a656374) (status u0) (storage-model u1)))') > -1, "returns error: not found");
      assert.equal(result.strings.length, 2);

      result = await readFromContract(client, "get-app", [ "u1"], true);
      assert.isOk(result.rawResult.indexOf('(ok (tuple') > -1, "returns error: not found");
      assert.equal(result.strings.length, 2);
      assert.equal(result.strings[1], 'STMYA5EANW6C0HNS1S57VX52M0B795HHFDBW2XBE.my-filecoin-project');
    })

    it("should be able to set apps to live if not administrator", async () => {
      let txreceive = await execMethod(client, contractKey, "set-app-live", [ "u0", "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-gaia-project\"", "u1"], false);
      assert.isOk(txreceive.success, "Transaction succeeded");

      txreceive = await execMethod(client, project1Key, "set-app-live", [ "u0", "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-gaia-project\"", "u1"], false);
      assert.isNotOk(txreceive.success, "Transaction succeeded");
    })

    it("should be able to set apps to live after changing the contract administrator", async () => {
      let txreceive = await execMethod(client, contractKey, "transfer-administrator", [ `'${project1Key}` ], false);
      assert.isOk(txreceive.success, "Transaction succeeded");

      txreceive = await execMethod(client, project1Key, "set-app-live", [ "u0", "\"mijoco.id.blockstack\"", "\"" + project1Key + ".my-gaia-project\"", "u1"], false);
      assert.isOk(txreceive.success, "Transaction succeeded");
    })

    /**
    it("should have a map of apps of length 2", async () => {
      axios.post('http://localhost:20443/v2/map_entry/' + contractKey + "/appmap/app-map").then((response) => {
        console.log(response.data)
      }).catch((error) => {
        assert.isTrue(error.response.status === 200, "Call failed");
        console.log(' --------------------------')
        console.log(error.response.status + ' --------------------------')
        console.log(error.response.statusText + ' --------------------------')
      })
    })
    **/
  });
  
  after(async () => {
    await provider.close();
  });
});
