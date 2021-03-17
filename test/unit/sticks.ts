import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity";
import { assert } from "chai";
describe("counter contract test suite", () => {
  let sticksClient: Client;
  let provider: Provider;
  before(async () => {
    provider = await ProviderRegistry.createProvider();
    sticksClient = new Client("SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB.sticks", "sticks", provider);
  });
  it("should have a valid syntax", async () => {
    await sticksClient.checkContract();
  });
  describe("deploying an instance of the contract", () => {
    const getCounter = async () => {
      const query = sticksClient.createQuery({
        method: { name: "get-sale-data", args: [] }
      });
      const receipt = await sticksClient.submitQuery(query);
      const result = Result.unwrapInt(receipt);
      return result;
    }
    const execMethod = async (method: string) => {
      const tx = sticksClient.createTransaction({
        method: {
          name: method,
          args: [],
        },
      });
      await tx.sign("SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7");
      const receipt = await sticksClient.submitTransaction(tx);
      return receipt;
    }
    before(async () => {
      await sticksClient.deployContract();
    });
  });
  after(async () => {
    await provider.close();
  });
});
