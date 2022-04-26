import {
  Clarinet,
  Chain,
  types,
  Account
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { ContractClient, ErrCode } from "./src/contract-client.ts";
import { CustomEventsClient } from "./src/custom-events-client.ts";

const commissionAddress1 = "ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5";
const commissionAddress2 = "ST1WJY09D3DEE45B1PY8TAV838VCH9HNEJXB2ZBPQ";

const nonFungibleName = 'artwork-token'
const fungibleName = 'edition-token'
const contractName = 'editions-013'

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
  commission1: string;
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
  const commission1 = accounts.get("deployer")!.address + '.commission-editions';
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
    commission1,
    client,
    events
  };
};

const mintToken = (tokenId: number, amount: number, recipient: string, chain: Chain, accounts: Map<string, Account>) => {
  const { deployer, phil, client, events } = getWalletsAndClient(
    chain,
    accounts
  );

  const entries = [
    { 'token-id': tokenId, amount: amount, recipient: recipient }
  ]
  let block = chain.mineBlock([
    client.setAdminMintPass(phil.address, deployer.address),
    client.adminMintMany(entries, phil.address),
  ]);
  block.receipts[0].result.expectOk().expectBool(true);

  // check events
  assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[1].events[1], { owner: recipient, 'token-id': 'u' + tokenId }, recipient, `${deployer.address}.${contractName}::${nonFungibleName}`))

  events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 1)
  events.expectEventCount(block.receipts[1].events, 'ft_transfer_event', 0)
  events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 1)
  events.expectEventCount(block.receipts[1].events, 'nft_transfer_event', 0)
  events.expectEventCount(block.receipts[1].events, 'contract_event', 1)
  events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
  events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)
}

// -- check simple listing and unlisting --------------------------------------------
Clarinet.test({
  name: "Market Test - Ensure can list and unlist by owner and that unlist again return false",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { phil, daisy, bobby, commission1, tokenStacks, deployer, client } = getWalletsAndClient(chain, accounts);

    mintToken(1, 500, daisy.address, chain, accounts);
    mintToken(1, 500, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(500);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(500);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    client.getOverallSupply().result.expectOk().expectUint(1000);
  
    client.getListingInToken(1, daisy.address).result.expectNone();
    client.getListingInToken(1, bobby.address).result.expectNone();
    let block = chain.mineBlock([
      client.listInToken(1, 1000000, commission1, tokenStacks, phil.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);
    block = chain.mineBlock([
      client.listInToken(1, 1000000, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(
      client.getListingInToken(1, daisy.address).result.expectSome().expectTuple(),
      { price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );
    block = chain.mineBlock([
      client.unlistInToken(1, deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);
    block = chain.mineBlock([
      client.unlistInToken(1, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([
      client.unlistInToken(1, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(false);
    client.getListingInToken(1, daisy.address).result.expectNone();
  },
});

Clarinet.test({
  name: "Market Test - Ensure can NFT be listed and bought in stx",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, commission1, tokenStacks, daisy, bobby, client, events } = getWalletsAndClient(chain, accounts);

    mintToken(1, 500, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(500);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(500);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(500);
    client.getOverallSupply().result.expectOk().expectUint(500);

    client.getListingInToken(1, daisy.address).result.expectNone();
    let block = chain.mineBlock([
      client.listInToken(1, 1000000, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      client.getListingInToken(1, daisy.address).result.expectSome().expectTuple(),
      {  price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );

    // check cant buy more than daisy has
    block = chain.mineBlock([
      client.buyInToken(1, 501, daisy.address, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(102);

    block = chain.mineBlock([
      client.buyInToken(1, 100, daisy.address, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // console.log(block.receipts[0].events)

    client.getBalance(1, daisy.address).result.expectOk().expectUint(400);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(100);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(400);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(100);
    client.getTotalSupply(1).result.expectOk().expectUint(500);
    client.getOverallSupply().result.expectOk().expectUint(500);

    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 1)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[0].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 1)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[0].events, 'stx_transfer_event', 3)

    block.receipts[0].events.expectSTXTransferEvent(100000000, bobby.address, daisy.address);
    block.receipts[0].events.expectSTXTransferEvent(5000000, bobby.address, commissionAddress1);
    block.receipts[0].events.expectSTXTransferEvent(5000000, bobby.address, commissionAddress2);

    assertEquals(true, events.expectSemiFungibleTokenBurnEvent(block.receipts[0].events.find((o) => o.type === 'nft_burn_event'), { owner: daisy.address, 'token-id': 'u' + 1 }, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[0].events.find((o) => o.type === 'nft_mint_event' && o.nft_mint_event.recipient === bobby.address), { owner: bobby.address, 'token-id': 'u' + 1 }, bobby.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[0].events.find((o) => o.type === 'nft_mint_event' && o.nft_mint_event.recipient === daisy.address), { owner: daisy.address, 'token-id': 'u' + 1 }, daisy.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
  },
});
