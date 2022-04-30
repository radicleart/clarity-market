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
const contractName = 'editions-013'
const marketContractName = 'symposium-market'

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
  nftContractAddress: string;
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
  const nftContractAddress = accounts.get("deployer")!.address + '.editions-013';
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
    nftContractAddress,
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
  name: "Market Test - Ensure nft can be listed but only once potential error conditions are met",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, phil, daisy, commission1, tokenStacks, tokenBitcoin, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 50, 10, '', commission1, tokenStacks, daisy.address),
      marketplaceClient.setAllowed(nftContractAddress, true, phil.address),
      marketplaceClient.setAllowed(nftContractAddress, true, deployer.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 50, 10, '', commission1, tokenStacks, daisy.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 50, 10, '', commission1, tokenStacks, phil.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 55, 10, '', commission1, tokenStacks, daisy.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 25, 10, '', commission1, tokenStacks, daisy.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 25, 10, '', commission1, tokenBitcoin, daisy.address),
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 25, 10, '', commission1, tokenBitcoin, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_ASSET_NOT_ALLOWED);
    block.receipts[1].result.expectErr().expectUint(MarketErrCode.ERR_NOT_ADMINISTRATOR);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(MarketErrCode.ERR_PAYMENT_CONTRACT_NOT_ALLOWED);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE); // phil has no tokens
    block.receipts[6].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE); // daisy has 25 tokens
    block.receipts[7].result.expectOk().expectUint(1);
    block.receipts[8].result.expectErr().expectUint(MarketErrCode.ERR_PAYMENT_CONTRACT_NOT_ALLOWED);
    console.log(block.receipts[7].result)
    marketplaceClient.getListing(0).result.expectNone();
    marketplaceClient.getListing(2).result.expectNone();
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(25), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContractAddress }
    );
  },
});

Clarinet.test({
  name: "Market Test - Ensure bobby can list different fractions of same NFT in different tokens",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, phil, daisy, bobby, commission1, tokenStacks, tokenBitcoin, deployer, client, bitcoinClient, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    mintToken(1, 50, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContractAddress, true, deployer.address),
      marketplaceClient.setAllowed(tokenBitcoin, true, deployer.address),
      bitcoinClient.mintWrappedBitcoin(1000, daisy.address, deployer.address),
      bitcoinClient.mintWrappedBitcoin(1000, bobby.address, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);

    block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 25, 10, '', commission1, tokenStacks, daisy.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1, 25, 10, '', commission1, tokenBitcoin, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectUint(2);

    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(25), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission1, token: tokenStacks, 'nft-asset-contract': nftContractAddress }
    );
    assertEquals(
      marketplaceClient.getListing(2).result.expectSome().expectTuple(),
      { taker: types.none(), 'token-id': types.uint(1), expiry: types.uint(10), amount: types.uint(25), 'unit-price': types.uint(1000000), maker: daisy.address, commission: commission1, token: tokenBitcoin, 'nft-asset-contract': nftContractAddress }
    );
  },
});














Clarinet.test({
  name: "Market Test - Ensure bobby and daisy can list and de-list their asset",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, phil, daisy, bobby, commission1, tokenStacks, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    mintToken(1, 50, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(100);

    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.setAllowed(nftContractAddress, true, deployer.address),
      marketplaceClient.setAllowed(tokenStacks, true, deployer.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 50, 10, '', commission1, tokenStacks, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_ASSET_NOT_ALLOWED);

    block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 3, 10, '', commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContractAddress, deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_NOT_OWNER);
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContractAddress, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContractAddress, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(false);
    marketplaceClient.getListing(1).result.expectNone();
  },
});

Clarinet.test({
  name: "Market Test - Ensure can list and unlist by owner and that unlist again return false",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, phil, daisy, bobby, commission1, tokenStacks, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    mintToken(1, 50, bobby.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(100);

    marketplaceClient.getListing(1).result.expectNone();
    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 3, 10, '', commission1, tokenStacks, phil.address)
    ]);

    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_NOT_OWNER);
    block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 3, 10, '', commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContractAddress, deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_NOT_OWNER);
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContractAddress, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([
      marketplaceClient.unlistInToken(1, nftContractAddress, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(false);
    marketplaceClient.getListing(1).result.expectNone();
  },
});

Clarinet.test({
  name: "Market Test - Ensure can't transfer if listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, deployer, phil, daisy, bobby, commission1, tokenStacks, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    const entries = [
      { 'token-id': 1, amount: 100, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
      marketplaceClient.listInToken(nftContractAddress, 1, 100, 3, 10, bobby.address, commission1, tokenStacks, phil.address)
    ]);
    block = chain.mineBlock([
      client.transfer(1, 50, phil.address, daisy.address, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NFT_LISTED);
  }
});


Clarinet.test({
  name: "Market Test - Ensure can't transfer if listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, phil, daisy, bobby, commission1, tokenStacks, deployer, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
  
    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 3, 10, bobby.address, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );
    block = chain.mineBlock([
      client.transfer(1, 1, phil.address, daisy.address, deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );
  }
});

Clarinet.test({
  name: "Market Test - Ensure can't list for 0 tokens",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, daisy, bobby, commission1, tokenStacks, tokenBitcoin, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 0, 3, 10, bobby.address, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_PRICE_WAS_ZERO);
    
    block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 0, 3, 10, bobby.address, commission1, tokenBitcoin, daisy.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_PRICE_WAS_ZERO);
  }
});

Clarinet.test({
  name: "Market Test - Ensure can't transfer same amount if some are bought but can transfer smaller amount",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, phil, daisy, bobby, commission1, tokenBitcoin, deployer, client, marketplaceClient, bitcoinClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
  
    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 100, 3, 10, bobby.address, commission1, tokenBitcoin, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      { price: types.uint(100), commission: commission1, token: tokenBitcoin }
    );
    block = chain.mineBlock([
      bitcoinClient.mintWrappedBitcoin(100000, bobby.address, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenBitcoin, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    marketplaceClient.getListing(1).result.expectNone();

    block = chain.mineBlock([
      client.transfer(1, 50, daisy.address, phil.address, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);

    block = chain.mineBlock([
      client.transfer(1, 5, daisy.address, phil.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(40);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(5);
    client.getBalance(1, phil.address).result.expectOk().expectUint(5);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
  }
});

Clarinet.test({
  name: "Market Test - Ensure can't buy if... not owned, not listed, listed with different commission or token",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, tokenBitcoin, bitcoinClient, commission1, commission2, tokenStacks, phil, daisy, bobby, client, marketplaceClient } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    bitcoinClient.getBalance(daisy.address, daisy).result.expectOk().expectUint(0);

    let block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);

    block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 100, 3, 10, bobby.address, commission1, tokenBitcoin, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(marketplaceClient.getListing(1).result.expectSome().expectTuple(), { price: types.uint(100), commission: commission1, token: tokenBitcoin });

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenBitcoin, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_WRONG_TOKEN);
    
    mintToken(1, 50, phil.address, chain, accounts);
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
    
    block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 10, 3, 10, bobby.address, commission1, tokenBitcoin, daisy.address),
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[1].result.expectErr().expectUint(MarketErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
    
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenBitcoin, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_SENDER_NOT_ENOUGH_BALANCE);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission2, tokenBitcoin, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_WRONG_COMMISSION);

    // console.log(block.receipts[0].events)

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(1, phil.address).result.expectOk().expectUint(50);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(100);
    client.getOverallSupply().result.expectOk().expectUint(100);
  }
});

Clarinet.test({
  name: "Market Test - Ensure can NFT be listed and bought in stx",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, deployer, commission1, tokenStacks, daisy, bobby, client, marketplaceClient, events } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);

    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(0);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(0);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    marketplaceClient.getListing(1).result.expectNone();
    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 1000000, 3, 10, bobby.address, commission1, tokenStacks, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      marketplaceClient.getListing(1).result.expectSome().expectTuple(),
      {  price: types.uint(1000000), commission: commission1, token: tokenStacks }
    );

    // check cant buy more than daisy has
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(MarketErrCode.ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE);

    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenStacks, bobby.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // console.log(block.receipts[0].events)

    client.getBalance(1, daisy.address).result.expectOk().expectUint(40);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(10);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(40);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(10);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 1)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[0].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 1)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[0].events, 'stx_transfer_event', 3)

    block.receipts[0].events.expectSTXTransferEvent(10000000, bobby.address, daisy.address);
    block.receipts[0].events.expectSTXTransferEvent(500000, bobby.address, commissionAddress1);
    block.receipts[0].events.expectSTXTransferEvent(500000, bobby.address, commissionAddress2);

    assertEquals(true, events.expectSemiFungibleTokenBurnEvent(block.receipts[0].events.find((o) => o.type === 'nft_burn_event'), { owner: daisy.address, 'token-id': 'u' + 1 }, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[0].events.find((o) => o.type === 'nft_mint_event' && o.nft_mint_event.recipient === bobby.address), { owner: bobby.address, 'token-id': 'u' + 1 }, bobby.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[0].events.find((o) => o.type === 'nft_mint_event' && o.nft_mint_event.recipient === daisy.address), { owner: daisy.address, 'token-id': 'u' + 1 }, daisy.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
  },
});

Clarinet.test({
  name: "Market Test - Ensure can NFT be listed and bought in xBTC",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nftContractAddress, deployer, tokenBitcoin, bitcoinClient, commission1, daisy, bobby, client, marketplaceClient, events } = getWalletsAndClient(chain, accounts);

    mintToken(1, 50, daisy.address, chain, accounts);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(50);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);
    bitcoinClient.getBalance(daisy.address, daisy).result.expectOk().expectUint(0);
    
    let block = chain.mineBlock([
      marketplaceClient.listInToken(nftContractAddress, 1, 10, 3, 10, bobby.address, commission1, tokenBitcoin, daisy.address),
      bitcoinClient.mintWrappedBitcoin(1000, bobby.address, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block = chain.mineBlock([
      marketplaceClient.buyInToken(1, nftContractAddress, commission1, tokenBitcoin, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    marketplaceClient.getListing(1).result.expectNone()
    client.getBalance(1, daisy.address).result.expectOk().expectUint(40);
    client.getBalance(1, bobby.address).result.expectOk().expectUint(10);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(40);
    client.getOverallBalance(bobby.address).result.expectOk().expectUint(10);
    client.getTotalSupply(1).result.expectOk().expectUint(50);
    client.getOverallSupply().result.expectOk().expectUint(50);

    // console.log(block.receipts[0].events)

    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 4) // xBTC to seller to commission ad the semi fung transfer
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[0].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 1)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 4)
    events.expectEventCount(block.receipts[0].events, 'stx_transfer_event', 0)

    // payment
    block.receipts[0].events.expectFungibleTokenTransferEvent(100, bobby.address, daisy.address, `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`);
    block.receipts[0].events.expectFungibleTokenTransferEvent(5, bobby.address, commissionAddress1, `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`);
    block.receipts[0].events.expectFungibleTokenTransferEvent(5, bobby.address, commissionAddress2, `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`);
    // fractional transfer
    block.receipts[0].events.expectFungibleTokenTransferEvent(10, daisy.address, bobby.address, `${deployer.address}.${contractName}::${fungibleName}`);

    assertEquals(true, events.expectSemiFungibleTokenBurnEvent(block.receipts[0].events.find((o) => o.type === 'nft_burn_event'), { owner: daisy.address, 'token-id': 'u' + 1 }, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[0].events.find((o) => o.type === 'nft_mint_event' && o.nft_mint_event.recipient === bobby.address), { owner: bobby.address, 'token-id': 'u' + 1 }, bobby.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
    assertEquals(true, events.expectSemiFungibleTokenMintEvent(block.receipts[0].events.find((o) => o.type === 'nft_mint_event' && o.nft_mint_event.recipient === daisy.address), { owner: daisy.address, 'token-id': 'u' + 1 }, daisy.address, `${deployer.address}.${contractName}::${nonFungibleName}`))
  }
});
