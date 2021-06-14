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
  administratorAddress: string;
  deployer: Account;
  wallet1: Account;
  wallet2: Account;
  newAdministrator: Account;
  client: LoopbombClient;
} => {
  const administratorAddress = "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW";
  const deployer = accounts.get("deployer")!;
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const newAdministrator = accounts.get("wallet_3")!;
  const client = new LoopbombClient(chain, deployer);
  return {
    administratorAddress,
    deployer,
    wallet1,
    wallet2,
    newAdministrator,
    client,
  };
};

Clarinet.test({
  name: "Loopbomb - test variables of contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administratorAddress,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should return admin address
    const currentAdministrator = client.getAdministrator();
    currentAdministrator.result
      .expectOk()
      .expectPrincipal(administratorAddress);

    // should return initial mint price
    const mintPrice = client.getMintPrice();
    mintPrice.result.expectOk().expectUint(1000000);

    // should return base token uri
    const baseTokenUri = client.getBaseTokenUri();
    baseTokenUri.result
      .expectOk()
      .expectAscii("https://thisisnumberone.com/index/v2/asset/");

    // should return initial mint counter
    const mintCounter = client.getMintCounter();
    mintCounter.result.expectOk().expectUint(0);

    // should return initial platform fee
    const platformFee = client.getPlatformFee();
    platformFee.result.expectOk().expectUint(5);

    // should return token name
    const tokenName = client.getTokenName();
    tokenName.result.expectOk().expectAscii("numberone");

    // should return token symbol
    const tokenSymbol = client.getTokenSymbol();
    tokenSymbol.result.expectOk().expectAscii("#1");
  },
});

Clarinet.test({
  name: "Loopbomb - test transfer-administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administratorAddress,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to transfer administrator if sender not current administrator
    let block = chain.mineBlock([
      client.transferAdministrator(newAdministrator.address, wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to change contract administrator
    block = chain.mineBlock([
      client.transferAdministrator(
        newAdministrator.address,
        administratorAddress
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new admin address
    const currentAdministrator = client.getAdministrator();
    currentAdministrator.result
      .expectOk()
      .expectPrincipal("ST21HMSJATHZ888PD0S0SSTWP4J61TCRJYEVQ0STB");
  },
});

Clarinet.test({
  name: "Loopbomb - test change-fee",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administratorAddress,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to change fee if sender not current administrator
    let block = chain.mineBlock([client.changeFee(10, wallet1.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to change fee
    block = chain.mineBlock([client.changeFee(10, administratorAddress)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new fee
    const currentAdministrator = client.getPlatformFee();
    currentAdministrator.result.expectOk().expectUint(10);
  },
});

// Clarinet.test({
//   name: "Loopbomb - test transfer-administrator",
//   async fn(chain: Chain, accounts: Map<string, Account>) {
//     const { administratorAddress, deployer, wallet1, wallet2, newAdministrator, client } =
//       getWalletsAndClient(chain, accounts);
//   },
// });
