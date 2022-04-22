import {
  Clarinet,
  Chain,
  types,
  Account
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { ContractClient, ErrCode } from "./src/contract-client.ts";
// import { trueCV } from "@stacks/transactions";

const assetName = 'artwork-token'

const expectSemiFungibleTokenMintEvent = (
  event: { type: string, nft_mint_event: { 'asset_identifier': string, 'recipient': string, 'value': string, } },
  value: { 'owner': string, 'token-id': string },
  address: string,
  assetIdentifier: string
): boolean => {
  assertEquals(event.type, 'nft_mint_event')
  assertEquals(event.nft_mint_event.recipient, address)
  assertEquals(event.nft_mint_event.asset_identifier, assetIdentifier)
  console.log(event)
  assertEquals(event.nft_mint_event.value.indexOf(value.owner) > -1, true)
  assertEquals(event.nft_mint_event.value.indexOf(value['token-id']) > -1, true)
  return true
  // expectSemiFungibleTokenMintEvent(block.receipts[2].events[1], value, wallet1.address, `${deployer.address}.editions-013`, assetName)
};
/**
**/
const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  tokenStacks: string;
  wallet1: Account;
  wallet2: Account;
  newAdministrator: Account;
  client: ContractClient;
} => {
  const administrator = accounts.get("deployer")!;
  const deployer = accounts.get("deployer")!;
  const tokenStacks = accounts.get("deployer")!.address + '.unwrapped-stx-token';
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const client = new ContractClient(chain, deployer);
  return {
    administrator,
    deployer,
    tokenStacks,
    wallet1,
    wallet2,
    newAdministrator,
    client
  };
};

Clarinet.test({
  name: "Mint Test - Ensure only admin mint pass can use admin-mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setAdminMintPass(wallet1.address, deployer.address),
      client.adminMint(10, 10, wallet2.address, wallet2.address),
      client.adminMint(1000, 10, wallet1.address, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(115);
    block.receipts[2].result.expectOk().expectUint(1000);
    assertEquals(block.receipts[2].events.length, 3);
    // console.log(block.receipts[2].events)
    block.receipts[2].events.expectFungibleTokenMintEvent(
      10,
      wallet1.address,
      `${deployer.address}.editions-013::edition-token`
    );
    const value = { owner: wallet1.address, 'token-id': 'u1000' }
    expectSemiFungibleTokenMintEvent(block.receipts[2].events[1], value, wallet1.address, `${deployer.address}.editions-013::${assetName}`)
    // NB this doesn't work because the asset-identifier is a tuple not a uint
    // block.receipts[2].events.expectNonFungibleTokenMintEvent(types.tuple(value), wallet1.address, `${deployer.address}.editions-013`, assetName);
  }
});

Clarinet.test({
  name: "Mint Test - Ensure constraints respected",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setAdminMintPass(wallet1.address, deployer.address),
      client.adminMint(1001, 10, wallet1.address, wallet1.address),
      client.adminMint(0, 10, wallet1.address, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(108);
    block.receipts[2].result.expectOk().expectUint(1);
    block.receipts[3].result.expectErr().expectUint(1);
    block.receipts[4].result.expectErr().expectUint(108);
    block.receipts[2].events.expectNonFungibleTokenMintEvent(
      types.uint(1), wallet1.address, `${deployer.address}.${assetName}`, assetName
    );
  }
});

