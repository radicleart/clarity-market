import {
  Clarinet,
  Chain,
  types,
  Account
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { ContractClient, ErrCode } from "./src/contract-client.ts";
import { CustomEventsClient } from "./src/custom-events-client.ts";

const nonFungibleName = 'artwork-token'
const fungibleName = 'edition-token'
const contractName = 'thirteen-mint'

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  tokenStacks: string;
  phil: Account;
  daisy: Account;
  bobby: Account;
  hunter: Account;
  newAdministrator: Account;
  client: ContractClient;
  events: CustomEventsClient;
} => {
  const administrator = accounts.get("deployer")!;
  const deployer = accounts.get("deployer")!;
  const tokenStacks = accounts.get("deployer")!.address + '.unwrapped-stx-token';
  const phil = accounts.get("wallet_1")!;
  const daisy = accounts.get("wallet_2")!;
  const bobby = accounts.get("wallet_3")!;
  const hunter = accounts.get("wallet_4")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const client = new ContractClient(chain, deployer, contractName);
  const events = new CustomEventsClient();
  return {
    administrator,
    deployer,
    tokenStacks,
    phil,
    daisy,
    bobby,
    hunter,
    newAdministrator,
    client,
    events
  };
};

Clarinet.test({
  name: "Mint Test - Ensure only admin mint pass can use admin-mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMint(10, 10, daisy.address, daisy.address),
      client.adminMint(1000, 10, phil.address, phil.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMIN_MINT_PASS);
    block.receipts[2].result.expectOk().expectUint(1000);
    assertEquals(block.receipts[2].events.length, 3);
    // console.log(block.receipts[2].events)
    block.receipts[2].events.expectFungibleTokenMintEvent(
      10,
      phil.address,
      `${deployer.address}.${contractName}::${fungibleName}`
    );
    const value = { owner: phil.address, 'token-id': 'u1000' }
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[2].events[1], value, phil.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    // NB this doesn't work because the asset-identifier is a tuple not a uint
    // block.receipts[2].events.expectNonFungibleTokenMintEvent(types.tuple(value), phil.address, `${deployer.address}.${contractName}`, nonFungibleName);
  }
});

Clarinet.test({
  name: "Mint Test - Ensure constraints respected",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMint(1001, 10, phil.address, phil.address),
      client.adminMint(0, 10, phil.address, phil.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_COLLECTION_LIMIT_REACHED);
    block.receipts[2].result.expectErr().expectUint(ErrCode.ERR_COLLECTION_LIMIT_REACHED);
  }
});
Clarinet.test({
  name: "Mint Many Test - Ensure can mint same token twice to same recipient",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );

    const entries = [
      { 'token-id': 1, amount: 1, recipient: daisy.address },
      { 'token-id': 1, amount: 1, recipient: daisy.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMintMany(entries, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true); // reached mint pass limit
    client.getBalance(1, daisy.address).result.expectOk().expectUint(2);
    client.getTotalSupply(1).result.expectOk().expectUint(2);
    client.getOverallSupply().result.expectOk().expectUint(2);
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can mint lots of token 1 to hunter and bobby",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, bobby, client, events } = getWalletsAndClient(
      chain,
      accounts
    );

    const entries = [
      { 'token-id': 1, amount: 25, recipient: daisy.address },
      { 'token-id': 1, amount: 25, recipient: daisy.address },
      { 'token-id': 1, amount: 25, recipient: bobby.address },
      { 'token-id': 1, amount: 25, recipient: bobby.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMintMany(entries, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(100);
    // check events
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 4)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 4)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 2)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can't more than the limit per NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, bobby, client, events } = getWalletsAndClient(
      chain,
      accounts
    );

    const entries = [
      { 'token-id': 1, amount: 25, recipient: daisy.address },
      { 'token-id': 1, amount: 25, recipient: daisy.address },
      { 'token-id': 1, amount: 25, recipient: bobby.address },
      { 'token-id': 1, amount: 26, recipient: bobby.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMintMany(entries, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_LIMIT_PER_FT_EXCEEDED);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(0);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(0);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(0);
    client.getOverallSupply().result.expectOk().expectUint(0);
    // check events
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 0)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 0)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)
  }
});

Clarinet.test({
  name: "Mint Test - Ensure Phil can mint (some of 1) to daisy and (some of 200) to hunter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, hunter, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 10, recipient: daisy.address },
      { 'token-id': 200, amount: 100, recipient: hunter.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMintMany(entries, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].result.expectOk().expectBool(true);
    client.getBalance(1, phil.address).result.expectOk().expectUint(0);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(10);
    client.getBalance(200, hunter.address).result.expectOk().expectUint(100);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(10);
    client.getOverallBalance(hunter.address).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(110);
    client.getTotalSupply(1).result.expectOk().expectUint(10);
    client.getTotalSupply(200).result.expectOk().expectUint(100);
    // check events
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 2)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 2)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)
  }
});

Clarinet.test({
  name: "Mint Test - Ensure Phil can mint (some of 1 and 200) to daisy and (some of 200 and 1) to hunter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, hunter, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 25, recipient: daisy.address },
      { 'token-id': 200, amount: 25, recipient: daisy.address },
      { 'token-id': 1, amount: 25, recipient: hunter.address },
      { 'token-id': 200, amount: 25, recipient: hunter.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, deployer.address),
      client.adminMintMany(entries, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    client.getBalance(1, phil.address).result.expectOk().expectUint(0);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(25);
    client.getBalance(200, daisy.address).result.expectOk().expectUint(25);
    client.getBalance(1, hunter.address).result.expectOk().expectUint(25);
    client.getBalance(200, hunter.address).result.expectOk().expectUint(25);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(hunter.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(100);

    block.receipts[1].events.expectFungibleTokenMintEvent(25, daisy.address, `${deployer.address}.${contractName}::${fungibleName}`);
    block.receipts[1].events.expectFungibleTokenMintEvent(25, daisy.address, `${deployer.address}.${contractName}::${fungibleName}`);
    block.receipts[1].events.expectFungibleTokenMintEvent(25, hunter.address, `${deployer.address}.${contractName}::${fungibleName}`);
    block.receipts[1].events.expectFungibleTokenMintEvent(25, hunter.address, `${deployer.address}.${contractName}::${fungibleName}`);

    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[1].events[1], { owner: daisy.address, 'token-id': 'u1' }, daisy.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[1].events[4], { owner: daisy.address, 'token-id': 'u200' }, daisy.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[1].events[7], { owner: hunter.address, 'token-id': 'u1' }, hunter.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[1].events[10], { owner: hunter.address, 'token-id': 'u200' }, hunter.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    // console.log(block.receipts[1].events)
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 4)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 4)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)
  }
});