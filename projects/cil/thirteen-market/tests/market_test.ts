import {
  Clarinet,
  Chain,
  types,
  Account
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { ContractClient, ErrCode } from "./src/contract-client.ts";
import { MarketplaceClient, MarketErrCode } from "./src/marketplace-client.ts";
import { CustomEventsClient } from "./src/custom-events-client.ts";
import { WrappedBitcoin } from "./src/wrapped-bitcoin-client.ts";

const commissionAddress1 = "ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5";
const commissionAddress2 = "ST1WJY09D3DEE45B1PY8TAV838VCH9HNEJXB2ZBPQ";

const nonFungibleName = 'artwork-token'
const fungibleName = 'edition-token'
const contractName = 'thirteen-mint'
const marketContractName = 'thirteen-market'

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  tokenStacks: string;
  tokenBitcoin: string;
  phil: Account;
  daisy: Account;
  bobby: Account;
  hunter: Account;
  newAdministrator: Account;
  marketContractAddress: string;
  nftContract1Address: string;
  nftContract2Address: string;
  commission1: string;
  commission2: string;
  client: ContractClient;
  marketplaceClient: MarketplaceClient;
  events: CustomEventsClient;
  bitcoinClient: WrappedBitcoin;
} => {
  const administrator = accounts.get("deployer")!;
  const deployer = accounts.get("deployer")!;
  const tokenStacks = accounts.get("deployer")!.address + '.unwrapped-stx-token';
  const tokenBitcoin = accounts.get("deployer")!.address + '.Wrapped-Bitcoin';
  const phil = accounts.get("wallet_1")!;
  const daisy = accounts.get("wallet_2")!;
  const bobby = accounts.get("wallet_3")!;
  const hunter = accounts.get("wallet_4")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const marketContractAddress = accounts.get("deployer")!.address + '.thirteen-market';
  const nftContract1Address = accounts.get("deployer")!.address + '.thirteen-mint';
  const nftContract2Address = accounts.get("deployer")!.address + '.fourteen-mint';
  const commission1 = accounts.get("deployer")!.address + '.commission-editions';
  const commission2 = accounts.get("deployer")!.address + '.commission-eag';
  const client = new ContractClient(chain, deployer, contractName);
  const marketplaceClient = new MarketplaceClient(chain, deployer, marketContractName);
  const bitcoinClient = new WrappedBitcoin(chain, deployer);
  const events = new CustomEventsClient();
  return {
    administrator,
    deployer,
    tokenStacks,
    tokenBitcoin,
    phil,
    daisy,
    bobby,
    hunter,
    newAdministrator,
    marketContractAddress,
    nftContract1Address,
    nftContract2Address,
    commission1,
    commission2,
    client,
    marketplaceClient,
    events,
    bitcoinClient
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
  name: "Market Test - Ensure nft can't be listed if error conditions are not met",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, phil, daisy, commission1, tokenStacks, tokenBitcoin, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    const listing1 = { tokenId: 1, unitPrice: 1000000, amount: 50, expiry: 10}
    const listing2 = { tokenId: 1, unitPrice: 1000000, amount: 55, expiry: 10}
    const listing3 = { tokenId: 1, unitPrice: 1000000, amount: 25, expiry: 10}
  
    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address),
      marketplaceClient.setAllowed(nftContract1Address, true, phil.address),
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, phil.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenStacks, daisy.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing3, commission1, tokenBitcoin, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_ASSET_NOT_ALLOWED);
    block.receipts[1].result.expectErr().expectUint(MarketErrCode.ERR_NOT_ADMINISTRATOR);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(MarketErrCode.ERR_PAYMENT_CONTRACT_NOT_ALLOWED);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE); // phil has no tokens
    block.receipts[6].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE); // daisy has 25 tokens
    marketplaceClient.getListing(0).result.expectNone();
    marketplaceClient.getListing(1).result.expectNone();
    marketplaceClient.getListing(2).result.expectNone();
  },
});

Clarinet.test({
  name: "Market Test - Ensure two fractions of same nft can be listed in two separate payment tokens and commission contracts",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, phil, daisy, commission1, commission2, tokenStacks, tokenBitcoin, deployer, client, bitcoinClient, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    const listing1 = { tokenId: 1, unitPrice: 1000000, amount: 25, expiry: 10}
    const listing2 = { tokenId: 1, unitPrice: 1000000, amount: 25, expiry: 10}

    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      bitcoinClient.mintWrappedBitcoin(1000, daisy.address, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission2, tokenStacks, daisy.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenBitcoin, daisy.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectUint(1);
    block.receipts[5].result.expectOk().expectUint(2);

    marketplaceClient.getListing(0).result.expectNone();
    marketplaceClient.getListing(3).result.expectNone();
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(25), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission2, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );
    assertEquals(
      marketplaceClient.getListing(2).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(25), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission1, token: tokenBitcoin, 'nft-asset-contract': nftContract1Address }
    );

    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContract1Address, daisy.address),
      marketplaceClient.unlistInToken(2, nftContract1Address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    marketplaceClient.getListing(1).result.expectNone();
    marketplaceClient.getListing(2).result.expectNone();
  },
});

Clarinet.test({
  name: "Market Test - Ensure can't be unlisted if error conditions aren't met",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, nftContract2Address, daisy, bobby, commission1, tokenStacks, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    mintToken(1, 50, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(100);

    const listing1 = { tokenId: 1, unitPrice: 1000000, amount: 10, expiry: 10}

    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, false, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address),
      marketplaceClient.setAllowed(nftContract1Address, false, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(MarketErrCode.ERR_PAYMENT_CONTRACT_NOT_ALLOWED);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectErr().expectUint(MarketErrCode.ERR_ASSET_NOT_ALLOWED);

    const listing2 = { tokenId: 1, unitPrice: 1000000, amount: 3, expiry: 10}
    block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[2].result.expectOk().expectUint(1);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(3), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContract1Address, bobby.address),
      marketplaceClient.unlistInToken(1, nftContract2Address, daisy.address),
      marketplaceClient.unlistInToken(2, nftContract1Address, bobby.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_NOT_OWNER);
    block.receipts[1].result.expectErr().expectUint(MarketErrCode.ERR_NFT_ASSET_MISMATCH);
    block.receipts[2].result.expectErr().expectUint(MarketErrCode.ERR_UNKNOWN_LISTING);
  }
});

Clarinet.test({
  name: "Market Test - Ensure can list and independently unlist different fractions of same asset multiple times with various properties",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, nftContract2Address, phil, daisy, commission1, commission2, tokenBitcoin, tokenStacks, deployer, client, bitcoinClient, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 100, phil.address, chain, accounts);
    client.getBalance(1, phil.address).result.expectOk().expectUint(100);

    const listing1 = { tokenId: 1, unitPrice: 1000000, amount: 3, expiry: 10}
    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(nftContract2Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
      bitcoinClient.mintWrappedBitcoin(100000, phil.address, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, phil.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectUint(1);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(3), 'unit-price': types.uint(1000000), maker: phil.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );

    const listing2 = { tokenId: 1, unitPrice: 1000000, amount: 4, expiry: 7, taker: phil.address}
    const listing3 = { tokenId: 1, unitPrice: 2, amount: 1, expiry: 30, taker: daisy.address}
    block = chain.mineBlock([
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, phil.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenStacks, phil.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing3, commission2, tokenBitcoin, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(2);
    block.receipts[1].result.expectOk().expectUint(3);
    block.receipts[2].result.expectOk().expectUint(4);
    marketplaceClient.getListing(0).result.expectNone()
    marketplaceClient.getListing(1).result.expectSome()
    marketplaceClient.getListing(2).result.expectSome()
    marketplaceClient.getListing(3).result.expectSome()
    marketplaceClient.getListing(4).result.expectSome()
    marketplaceClient.getListing(5).result.expectNone()
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(3), 'unit-price': types.uint(1000000), maker: phil.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );
    assertEquals(
      marketplaceClient.getListing(2).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(3), 'unit-price': types.uint(1000000), maker: phil.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );
    assertEquals(
      marketplaceClient.getListing(3).result.expectSome().expectTuple(),
      { taker: types.some(phil.address), 'token-id': types.uint(1), expiry: types.uint(7), amount: types.uint(4), 'unit-price': types.uint(1000000), maker: phil.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );
    assertEquals(
      marketplaceClient.getListing(4).result.expectSome().expectTuple(),
      { taker: types.some((daisy.address)), 'token-id': types.uint(1), expiry: types.uint(30), amount: types.uint(1), 'unit-price': types.uint(2), maker: phil.address, commission: commission2, token: tokenBitcoin, 'nft-asset-contract': nftContract1Address }
    );
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(2, nftContract1Address, phil.address),
      marketplaceClient.unlistInToken(3, nftContract1Address, phil.address),
    ]);
    marketplaceClient.getListing(0).result.expectNone()
    marketplaceClient.getListing(1).result.expectSome()
    marketplaceClient.getListing(2).result.expectNone()
    marketplaceClient.getListing(3).result.expectNone()
    marketplaceClient.getListing(4).result.expectSome()
    marketplaceClient.getListing(5).result.expectNone()
  },
});

Clarinet.test({
  name: "Market Test - Ensure can't transfer if listed and can list if recipient of transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, marketContractAddress, deployer, phil, daisy, bobby, commission1, tokenStacks, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    const entries = [
      { 'token-id': 1, amount: 100, recipient: phil.address }
    ]
    const listing1 = { tokenId: 1, unitPrice: 100, amount: 3, expiry: 10, taker: bobby.address}
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, phil.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectUint(1);
    client.getBalance(1, phil.address).result.expectOk().expectUint(97);
    client.getBalance(1, marketContractAddress).result.expectOk().expectUint(3);

    const listing2 = { tokenId: 1, unitPrice: 100, amount: 97, expiry: 10, taker: bobby.address}
    block = chain.mineBlock([
      client.transfer(1, 98, phil.address, daisy.address, phil.address),
      client.transfer(1, 97, phil.address, daisy.address, phil.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, phil.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
    block.receipts[3].result.expectOk().expectUint(2);
  }
});

Clarinet.test({
  name: "Market Test - Ensure can't list for 0 tokens",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, nftContract1Address, daisy, bobby, commission1, tokenStacks, tokenBitcoin, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
    ]);
    
    const listing1 = { tokenId: 1, unitPrice: 0, amount: 3, expiry: 10, taker: bobby.address}
    const listing2 = { tokenId: 1, unitPrice: 0, amount: 3, expiry: 10, taker: bobby.address}

    block = chain.mineBlock([
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_PRICE_WAS_ZERO);
    
    block = chain.mineBlock([
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenBitcoin, daisy.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_PRICE_WAS_ZERO);
  }
});

Clarinet.test({
  name: "Market Test - Ensure only taker can buy",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, phil, daisy, bobby, commission1, tokenStacks, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
  
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
    ]);

    const listing1 = { tokenId: 1, unitPrice: 1000000, amount: 20, expiry: 10, taker: bobby.address}
    block = chain.mineBlock([
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.some((bobby.address)), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(20), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContract1Address }
    );
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenStacks, phil.address),
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_UNINTENDED_TAKER);
    block.receipts[1].result.expectOk().expectBool(true);
    marketplaceClient.getListing(1).result.expectNone()
    client.getBalance(1, daisy.address).result.expectOk().expectUint(30);
    client.getBalance(1, phil.address).result.expectOk().expectUint(0);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(20);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
  }
});

Clarinet.test({
  name: "Market Test - Ensure can't buy if... not owned, not listed, listed with different commission or token",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, nftContract1Address, nftContract2Address, marketContractAddress, tokenBitcoin, bitcoinClient, commission1, commission2, tokenStacks, phil, daisy, bobby, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    bitcoinClient.getBalance(daisy.address, daisy).result.expectOk().expectUint(0);

    let block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_UNKNOWN_LISTING);

    block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      bitcoinClient.mintWrappedBitcoin(1000, daisy.address, deployer.address),
    ]);

    const listing1 = { tokenId: 1, unitPrice: 100, amount: 3, expiry: 4, taker: bobby.address}
    const listing2 = { tokenId: 1, unitPrice: 100, amount: 3, expiry: 8, taker: bobby.address}
    block = chain.mineBlock([
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenBitcoin, daisy.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenBitcoin, daisy.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_EXPIRY_IN_PAST);
    block.receipts[1].result.expectOk().expectUint(1);
    marketplaceClient.getListing(1).result.expectSome();

    client.getBalance(1, daisy.address).result.expectOk().expectUint(47);
    client.getBalance(1, marketContractAddress).result.expectOk().expectUint(3);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(47);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenStacks, bobby.address),
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenBitcoin, daisy.address),
      marketplaceClient.buyInToken(1, nftContract1Address, commission2, tokenBitcoin, bobby.address),
      marketplaceClient.buyInToken(1, nftContract2Address, commission2, tokenBitcoin, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_WRONG_TOKEN);
    block.receipts[1].result.expectErr().expectUint(MarketErrCode.ERR_MAKER_TAKER_EQUAL);
    block.receipts[2].result.expectErr().expectUint(MarketErrCode.ERR_WRONG_COMMISSION);
    block.receipts[3].result.expectErr().expectUint(MarketErrCode.ERR_NFT_ASSET_MISMATCH);
    
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenBitcoin, bobby.address),
    ]);
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenBitcoin, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_SENDER_NOT_ENOUGH_BALANCE);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenBitcoin, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_UNINTENDED_TAKER);

    block = chain.mineBlock([])
    block = chain.mineBlock([
      bitcoinClient.mintWrappedBitcoin(1000, bobby.address, deployer.address),
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenBitcoin, bobby.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(MarketErrCode.ERR_LISTING_EXPIRED);

    // console.log(block.receipts[0].events)
    client.getBalance(1, daisy.address).result.expectOk().expectUint(47);
    client.getBalance(1, marketContractAddress).result.expectOk().expectUint(3);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(47);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
  }
});

//----------------------------------------------------------------------------------------------
Clarinet.test({
  name: "Market Test - Ensure correct amounts of SFT owned after purchase in stx",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, deployer, commission1, tokenStacks, daisy, bobby, client, marketplaceClient, events } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    mintToken(1, 50, bobby.address, chain, accounts);
    mintToken(2, 50, daisy.address, chain, accounts);
    mintToken(2, 50, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(50);
    client.getBalance(2, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(2, bobby.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(100);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(100);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getTotalSupply(2).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(200);

    const listing1 = { tokenId: 1, unitPrice: 1000000, amount: 10, expiry: 10}
    const listing2 = { tokenId: 2, unitPrice: 1000000, amount: 10, expiry: 10}
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenStacks, daisy.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing2, commission1, tokenStacks, bobby.address)
    ]);
    block.receipts[2].result.expectOk().expectUint(1);
    block.receipts[3].result.expectOk().expectUint(2);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenStacks, bobby.address),
      marketplaceClient.buyInToken(2, nftContract1Address, commission1, tokenStacks, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    // console.log(block.receipts[0].events)

    client.getBalance(1, daisy.address).result.expectOk().expectUint(40);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(60);
    client.getBalance(2, daisy.address).result.expectOk().expectUint(60);
    client.getBalance(2, bobby.address).result.expectOk().expectUint(40);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(100);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(100);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getTotalSupply(2).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(200);

    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 1)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[0].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 2)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[0].events, 'stx_transfer_event', 3)

    block.receipts[0].events.expectSTXTransferEvent(10000000, bobby.address, daisy.address);
    block.receipts[0].events.expectSTXTransferEvent(500000, bobby.address, commissionAddress1);
    block.receipts[0].events.expectSTXTransferEvent(500000, bobby.address, commissionAddress2);
  }
});

Clarinet.test({
  name: "Market Test - Ensure correct amounts of SFT owned after purchase in xbtc",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContract1Address, marketContractAddress, deployer, tokenBitcoin, bitcoinClient, commission1, daisy, bobby, client, marketplaceClient, events } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    mintToken(1, 50, bobby.address, chain, accounts);
    mintToken(2, 50, daisy.address, chain, accounts);
    mintToken(2, 50, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(50);
    client.getBalance(2, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(2, bobby.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(100);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(100);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getTotalSupply(2).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(200);
    
    const listing1 = { tokenId: 1, unitPrice: 10, amount: 3, expiry: 10}
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContract1Address, true, deployer.address),
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
      bitcoinClient.mintWrappedBitcoin(1000, bobby.address, deployer.address),
      marketplaceClient.listInTokenTuple(nftContract1Address, listing1, commission1, tokenBitcoin, daisy.address),
    ]);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContract1Address, commission1, tokenBitcoin, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    marketplaceClient.getListing(1).result.expectNone()
    client.getBalance(1, daisy.address).result.expectOk().expectUint(47);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(53);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(97);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(103);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getTotalSupply(2).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(200);

    // console.log(block.receipts[0].events)

    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 4) // xBTC to seller to commission ad the semi fung transfer
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[0].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 2)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[0].events, 'stx_transfer_event', 0)

    // payment
    block.receipts[0].events.expectFungibleTokenTransferEvent(30, bobby.address, daisy.address, `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`);
    block.receipts[0].events.expectFungibleTokenTransferEvent(1, bobby.address, commissionAddress1, `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`);
    block.receipts[0].events.expectFungibleTokenTransferEvent(1, bobby.address, commissionAddress2, `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`);
    // fractional transfer
    block.receipts[0].events.expectFungibleTokenTransferEvent(3, marketContractAddress, bobby.address, `${deployer.address}.${contractName}::${fungibleName}`);
  }
});
