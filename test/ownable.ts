import {
  Client,
  Provider,
  ProviderRegistry,
  Result,
} from "@blockstack/clarity";
import { assert } from "chai";

describe("ownable-lib contract test suite", () => {
  let ownableClient: Client;
  let provider: Provider;

  before(async () => {
    provider = await ProviderRegistry.createProvider();
    ownableClient = new Client(
      "S1G2081040G2081040G2081040G208105NK8PE5.ownable",
      "ownable",
      provider
    );
  });

  it("should have a valid syntax", async () => {
    await ownableClient.checkContract();
  });

  describe("deploying an instance of the ownable contract", () => {
    before(async () => {
      await ownableClient.deployContract();
    });

    it("should return owner", async () => {
      const query = ownableClient.createQuery({
        method: {
          name: "get-owner",
          args: [],
        },
      });
      const receipt = await ownableClient.submitQuery(query);
      const result = Result.unwrap(receipt);
      assert.equal(result, "S1G2081040G2081040G2081040G208105NK8PE5");
    });

    it("should check owner", async () => {
      var query = ownableClient.createTransaction({
        method: {
          name: "is-owner",
          args: [],
        },
      });
      query.sender = "S1G2081040G2081040G2081040G208105NK8PE5";
      const receipt = await ownableClient.submitTransaction(query);
      const result = Result.unwrap(receipt);
      assert.equal(
        result,
        "Transaction executed and committed. Returned: true\n[]"
      );
    });

    it("should assert owner", async () => {
      var query = ownableClient.createTransaction({
        method: {
          name: "only-owner",
          args: [],
        },
      });
      query.sender = "S1G2081040G2081040G2081040G208105NK8PE5";
      const receipt = await ownableClient.submitTransaction(query);
      const result = Result.unwrap(receipt);
      assert.equal(
        result,
        "Transaction executed and committed. Returned: none\n[]"
      );
    });

    it("should transfer ownership", async () => {
      var query = ownableClient.createTransaction({
        method: {
          name: "transfer-ownership",
          args: ["'ST22T6ZS7HVWEMZHHFK77H4GTNDTWNPQAX8WZAKHJ"],
        },
      });
      query.sender = "S1G2081040G2081040G2081040G208105NK8PE5";
      const receipt = await ownableClient.submitTransaction(query);
      const result = Result.unwrap(receipt);
      assert.equal(
        result,
        "Transaction executed and committed. Returned: true\n[]"
      );
    });

    it("should check owner", async () => {
      var query = ownableClient.createTransaction({
        method: {
          name: "is-owner",
          args: [],
        },
      });
      query.sender = "S1G2081040G2081040G2081040G208105NK8PE5";
      const receipt = await ownableClient.submitTransaction(query);
      const result = Result.unwrap(receipt);
      assert.equal(
        result,
        "Transaction executed and committed. Returned: false\n[]"
      );
    });
  });
  after(async () => {
    await provider.close();
  });
});
