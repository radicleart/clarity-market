import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";

import { LoopbombClient, ErrCode } from "../src/loopbomb-client.ts";

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  wallet1: Account;
  wallet2: Account;
  newAdministrator: Account;
  client: LoopbombClient;
} => {
  const administrator = {
    address: "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
    balance: 1000000,
    name: "administrator",
    mnemonic: "asdf",
    derivation: "asdf",
  };
  const deployer = accounts.get("deployer")!;
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const newAdministrator = accounts.get("wallet_3")!;
  const client = new LoopbombClient(chain, deployer);
  return {
    administrator,
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
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should return admin address
    const currentAdministrator = client.getAdministrator();
    currentAdministrator.result.expectPrincipal(administrator.address);

    // should return initial mint price
    const mintPrice = client.getMintPrice();
    mintPrice.result.expectUint(1000000);

    // should return base token uri
    const baseTokenUri = client.getBaseTokenUri();
    baseTokenUri.result.expectAscii("https://loopbomb.io/nfts/");

    // should return initial mint counter
    const mintCounter = client.getMintCounter();
    mintCounter.result.expectOk().expectUint(0);

    // should return token name
    const tokenName = client.getTokenName();
    tokenName.result.expectOk().expectAscii("loopbomb");

    // should return token symbol
    const tokenSymbol = client.getTokenSymbol();
    tokenSymbol.result.expectOk().expectAscii("LOOP");
  },
});

Clarinet.test({
  name: "Loopbomb - test transfer-administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
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
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new admin address
    const currentAdministrator = client.getAdministrator();
    currentAdministrator.result.expectPrincipal(newAdministrator.address);
  },
});

Clarinet.test({
  name: "Loopbomb - test update-base-token-uri",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to update base token uri if sender not current administrator
    let block = chain.mineBlock([
      client.updateBaseTokenURI("https://google.com/", wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to change base token uri
    block = chain.mineBlock([
      client.updateBaseTokenURI("https://google.com/", administrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new base token uri
    const currentAdministrator = client.getBaseTokenUri();
    currentAdministrator.result.expectAscii("https://google.com/");
  },
});

Clarinet.test({
  name: "Loopbomb - test update-mint-price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to update mint price if sender not current administrator
    let block = chain.mineBlock([client.updateMintPrice(100, wallet1.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to update mint price
    block = chain.mineBlock([
      client.updateMintPrice(100, administrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new mint price
    const currentAdministrator = client.getMintPrice();
    currentAdministrator.result.expectUint(100);
  },
});

Clarinet.test({
  name: "Loopbomb - test get-balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to get balance if not current administrator
    let balance = client.getBalance(wallet1);
    balance.result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should not be able to get balance if not current administrator
    balance = client.getBalance(administrator);
    balance.result.expectOk().expectUint(0);
  },
});

Clarinet.test({
  name: "Loopbomb - transfer-balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to transfer balance if sender not current administrator
    let block = chain.mineBlock([
      client.transferBalance(wallet1.address, deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should not be able to transfer zero balance
    block = chain.mineBlock([
      client.transferBalance(wallet1.address, administrator.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_FAILED_TO_STX_TRANSFER);
  },
});

// Clarinet.test({
//   name: "Loopbomb - test transfer-administrator",
//   async fn(chain: Chain, accounts: Map<string, Account>) {
//     const { administrator, deployer, wallet1, wallet2, newAdministrator, client } =
//       getWalletsAndClient(chain, accounts);
//   },
// });
