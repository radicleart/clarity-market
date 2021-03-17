import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
describe("counter contract test suite", () => {
  let loopbombClient: Client;
  let provider: Provider;
  before(async () => {
    provider = await ProviderRegistry.createProvider();
    loopbombClient = new Client("SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB.loopbomb", "loopbomb", provider);
  });
  it("should have a valid syntax", async () => {
    await loopbombClient.checkContract();
  });
  describe("deploying an instance of the contract", () => {
    const getCounter = async () => {
      const query = loopbombClient.createQuery({
        method: { name: "get-sale-data", args: [] }
      });
      const receipt = await loopbombClient.submitQuery(query);
      const result = Result.unwrapInt(receipt);
      return result;
    }
    const execMethod = async (method: string) => {
      const tx = loopbombClient.createTransaction({
        method: {
          name: method,
          args: [],
        },
      });
      await tx.sign("SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7");
      const receipt = await loopbombClient.submitTransaction(tx);
      return receipt;
    }
    before(async () => {
      await loopbombClient.deployContract();
    });
  });
  after(async () => {
    await provider.close();
  });
});
