import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.10.0/index.ts";
import {
  assertEquals,
  assertStringIncludes,
  assertArrayIncludes,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";

import { LoopbombClient, ErrCode } from "../src/loopbomb-client.ts";

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  deployer: Account;
  wallet_1: Account;
  wallet_2: Account;
  newAdministrator: Account;
  client: LoopbombClient;
} => {
  const deployer = accounts.get("deployer")!;
  const wallet_1 = accounts.get("wallet_1")!;
  const wallet_2 = accounts.get("wallet_2")!;
  const newAdministrator = accounts.get("wallet_3")!;
  const client = new LoopbombClient(chain, deployer);
  return { deployer, wallet_1, wallet_2, newAdministrator, client };
};

Clarinet.test({
  name: "Loopbomb - test variables of contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should return admin address
    let currentAdministrator = client.getAdministrator();
    console.log(currentAdministrator);
    currentAdministrator.result
      .expectOk()
      .expectPrincipal("ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW");
  },
});
