import {
  Clarinet,
  Chain,
  Account,
  types,
  Tx,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { GenesisVersion2Client, ErrCode } from "../../../../src/thisisnumberone-version2-client.ts";
import { WrappedBitcoin } from "../../../../src/wrapped-bitcoin-client.ts";
import { WrappedDiko } from "../../../../src/wrapped-diko-client.ts";

const mintAddress1 = "SP2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1KVFJ21";
const mintAddress2 = "SP132K8CVJ9B2GEDHTQS5MH3N7BR5QDMN1PXVS8MY";

const commissionAddress1 = "SPZRAE52H2NC2MDBEV8W99RFVPK8Q9BW8H88XV9N";
const commissionAddress2 = "SP162D87CY84QVVCMJKNKGHC7GGXFGA0TAR9D0XJW";
const commissionAddress3 = "SP1CS4FVXC59S65C3X1J3XRNZGWTG212JT7CG73AG";
const commissionAddress4 = "SPZRAE52H2NC2MDBEV8W99RFVPK8Q9BW8H88XV9N";
const commissionAddress5 = "SP2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1KVFJ21";
const commissionAddress6 = "SP3N4AJFZZYC4BK99H53XP8KDGXFGQ2PRSQP2HGT6";

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  tokenBitcoin: string;
  tokenDiko: string;
  tokenStacks: string;
  tokenWrappedStacks: string;
  commission1: string;
  wallet1: Account;
  wallet2: Account;
  wallet3: Account;
  wallet4: Account;
  wallet5: Account;
  newAdministrator: Account;
  clientV2: GenesisVersion2Client;
  clientWrappedBitcoin: WrappedBitcoin;
  clientWrappedDiko: WrappedDiko;
} => {
  const administrator = accounts.get("deployer")!;
  const deployer = accounts.get("deployer")!;
  const tokenBitcoin = accounts.get("deployer")!.address + '.Wrapped-Bitcoin';
  const tokenDiko = accounts.get("deployer")!.address + '.arkadiko-token';
  const tokenStacks = accounts.get("deployer")!.address + '.stx-token';
  const tokenWrappedStacks = accounts.get("deployer")!.address + '.wrapped-stx-token';
  const commission1 = accounts.get("deployer")!.address + '.commission-genesis';
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const wallet3 = accounts.get("wallet_3")!;
  const wallet4 = accounts.get("wallet_4")!;
  const wallet5 = accounts.get("wallet_5")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const clientV2 = new GenesisVersion2Client(chain, deployer);
  const clientWrappedBitcoin = new WrappedBitcoin(chain, deployer);
  const clientWrappedDiko = new WrappedDiko(chain, deployer);
  return {
    administrator,
    deployer,
    tokenBitcoin,
    tokenDiko,
    tokenStacks,
    tokenWrappedStacks,
    commission1,
    wallet1,
    wallet2,
    wallet3,
    wallet4,
    wallet5,
    newAdministrator,
    clientV2,
    clientWrappedBitcoin,
    clientWrappedDiko
  };
};

const mintV2Token = (tokenId: number, chain: Chain, accounts: Map<string, Account>) => {
  const { tokenStacks, wallet1, wallet2, clientV2, deployer } = getWalletsAndClient(chain, accounts);

  let block = chain.mineBlock([
    clientV2.setMintCommission(tokenStacks, 0, mintAddress1, mintAddress2, 40, deployer.address),
    clientV2.setMintPass(wallet1.address, 5, deployer.address),
    clientV2.mintWith(tokenStacks, wallet1.address)
  ]);
  block.receipts[0].result.expectOk().expectBool(true);
  block.receipts[1].result.expectOk();
  assertEquals(block.receipts[2].events.length, 1);
  block.receipts[2].events.expectNonFungibleTokenMintEvent(
    types.uint(tokenId),
    wallet1.address,
    `${deployer.address}.thisisnumberone`,
    "thisisnumberone"
  );

};

Clarinet.test({
  name: "Market Test - Ensure can list and unlist by owner and that unlist again return false",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet1, commission1, tokenStacks, deployer, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(1, chain, accounts);

    // shouldn't be listed
    clientV2.getListingInToken(1).result.expectNone();

    // check that it can't be listed by not the owner
    let block = chain.mineBlock([
      clientV2.listInToken(
        1,
        10000000,
        commission1,
        tokenStacks,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // list for 100 stx
    block = chain.mineBlock([
      clientV2.listInToken(1, 100000000, commission1, tokenStacks, wallet1.address
        ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check is listed
    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      { price: types.uint(100000000), commission: commission1, token: tokenStacks }
    );

    // check that it can't be unlisted by not the owner
    block = chain.mineBlock([clientV2.unlistInToken(1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // unlist
    block = chain.mineBlock([clientV2.unlistInToken(1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([clientV2.unlistInToken(1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(false);
    clientV2.getListingInToken(1).result.expectNone();
  },
});

Clarinet.test({
  name: "Market Test - Ensure can NFT be listed and bought in stx",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, commission1, tokenStacks, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(1, chain, accounts);

    // shouldn't be listed
    clientV2.getListingInToken(1).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInToken(
        1,
        100000000,
        commission1,
        tokenStacks,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: commission1,
        token: tokenStacks
      }
    );

    block = chain.mineBlock([
      clientV2.buyInToken(1, commission1, tokenStacks, wallet2.address),
    ]);
    // console.log(block)
    block.receipts[0].result.expectOk().expectBool(true);

    block.receipts[0].events.expectSTXTransferEvent(
      100000000,
      wallet2.address,
      wallet1.address
    );
    block.receipts[0].events.expectSTXTransferEvent(
      8000000,
      wallet2.address,
      commissionAddress1
    );
    block.receipts[0].events.expectSTXTransferEvent(
      400000,
      wallet2.address,
      commissionAddress2
    );
    block.receipts[0].events.expectSTXTransferEvent(
      400000,
      wallet2.address,
      commissionAddress3
    );
    block.receipts[0].events.expectSTXTransferEvent(
      400000,
      wallet2.address,
      commissionAddress4
    );
    block.receipts[0].events.expectSTXTransferEvent(
      400000,
      wallet2.address,
      commissionAddress5
    );
    block.receipts[0].events.expectSTXTransferEvent(
      400000,
      wallet2.address,
      commissionAddress6
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "Market Test - Ensure can NFT be listed and bought in wBTC",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, tokenBitcoin, commission1, wallet1, wallet2, clientWrappedBitcoin, clientV2 } =
      getWalletsAndClient(chain, accounts);

      mintV2Token(1, chain, accounts);

      // shouldn't be listed
      clientV2.getListingInToken(1).result.expectNone();
      clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);

      // list for 100 stx
      let block = chain.mineBlock([clientV2.listInToken(1, 1000, commission1, tokenBitcoin, wallet1.address )]);
      block.receipts[0].result.expectOk().expectBool(true);

      assertEquals(clientV2.getListingInToken(1).result.expectSome().expectTuple(), { price: types.uint(1000), commission: commission1, token: tokenBitcoin });
      block = chain.mineBlock([
        clientWrappedBitcoin.mintWrappedBitcoin(100000000, wallet1.address, deployer.address),
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet2.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_TOKENS);

      block = chain.mineBlock([
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet1.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_SENDER_IS_RECIPIENT);

      block = chain.mineBlock([
        clientWrappedBitcoin.mintWrappedBitcoin(1000000, wallet2.address, wallet2.address),
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet2.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      clientV2.getOwner(1).result.expectOk().expectSome().expectPrincipal(wallet2.address);
      clientWrappedBitcoin.getBalance(wallet2.address, wallet2).result.expectOk().expectUint(998900);

      block.receipts[1].events.expectFungibleTokenTransferEvent(
        1000,
        wallet2.address,
        wallet1.address,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        80,
        wallet2.address,
        commissionAddress1,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        4,
        wallet2.address,
        commissionAddress2,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );

      block.receipts[1].events.expectNonFungibleTokenTransferEvent(
        types.uint(1),
        wallet1.address,
        wallet2.address,
        `${deployer.address}.thisisnumberone`,
        "thisisnumberone"
      );
    },
});

Clarinet.test({
  name: "Market Test - Ensure ERR_WRONG_TOKEN when NFT is listed in wBTC and relisted in Diko and then attempt made to buy in wBTC",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, tokenBitcoin, tokenDiko, commission1, wallet1, wallet2, clientWrappedBitcoin, clientWrappedDiko, clientV2 } =
      getWalletsAndClient(chain, accounts);

      mintV2Token(1, chain, accounts);

      // shouldn't be listed
      clientV2.getListingInToken(1).result.expectNone();
      clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);
      clientWrappedDiko.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);

      // list for 100 wBTC
      let block = chain.mineBlock([clientV2.listInToken(1, 100, commission1, tokenBitcoin, wallet1.address )]);
      block.receipts[0].result.expectOk().expectBool(true);

      // overwrites previous listing
      block = chain.mineBlock([clientV2.listInToken(1, 100, commission1, tokenDiko, wallet1.address )]);
      block.receipts[0].result.expectOk().expectBool(true);

      assertEquals(clientV2.getListingInToken(1).result.expectSome().expectTuple(), { price: types.uint(100), commission: commission1, token: tokenDiko });
      block = chain.mineBlock([
        clientWrappedBitcoin.mintWrappedBitcoin(100000000, wallet2.address, deployer.address),
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet2.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_WRONG_TOKEN);
    }
});

Clarinet.test({
  name: "Market Test - Ensure that NFT can't be bought with different sip10 token to listing or with insufficient funds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, tokenBitcoin, tokenDiko, commission1, wallet1, wallet2, clientWrappedBitcoin, clientWrappedDiko, clientV2 } =
      getWalletsAndClient(chain, accounts);

      mintV2Token(1, chain, accounts);

      // shouldn't be listed
      clientV2.getListingInToken(1).result.expectNone();
      clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);
      clientWrappedDiko.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);

      // list for 100 stx
      let block = chain.mineBlock([clientV2.listInToken(1, 1000, commission1, tokenBitcoin, wallet1.address )]);
      block.receipts[0].result.expectOk().expectBool(true);
      assertEquals(clientV2.getListingInToken(1).result.expectSome().expectTuple(), { price: types.uint(1000), commission: commission1, token: tokenBitcoin });
      
      // check it can't be bought for diko
      block = chain.mineBlock([
        clientWrappedDiko.mintWrappedDiko(100000000, wallet1.address, deployer.address),
        clientV2.buyInToken(1, commission1, tokenDiko, wallet2.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_WRONG_TOKEN);

      block = chain.mineBlock([
        clientWrappedBitcoin.mintWrappedBitcoin(100000000, wallet1.address, deployer.address),
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet2.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_TOKENS);

      block = chain.mineBlock([
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet1.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_SENDER_IS_RECIPIENT);

      block = chain.mineBlock([
        clientWrappedBitcoin.mintWrappedBitcoin(1000000, wallet2.address, wallet2.address),
        clientV2.buyInToken(1, commission1, tokenBitcoin, wallet2.address)
      ]);
      clientWrappedBitcoin.getBalance(wallet2.address, wallet2).result.expectOk().expectUint(998900);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      block.receipts[1].events.expectFungibleTokenTransferEvent(
        1000,
        wallet2.address,
        wallet1.address,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        80,
        wallet2.address,
        commissionAddress1,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        4,
        wallet2.address,
        commissionAddress2,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );

      block.receipts[1].events.expectNonFungibleTokenTransferEvent(
        types.uint(1),
        wallet1.address,
        wallet2.address,
        `${deployer.address}.thisisnumberone`,
        "thisisnumberone"
      );
    },
});

Clarinet.test({
  name: "Market Test - Ensure that NFT can't be bought with different commission trait",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, commission1, tokenStacks, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(1, chain, accounts);


    // shouldn't be listed
    clientV2.getListingInToken(1).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInToken(1, 100000000, commission1, tokenStacks, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: commission1,
        token: tokenStacks
      }
    );

    block = chain.mineBlock([
      clientV2.buyInToken(
        1,
        `${deployer.address}.commission-nop`,
        tokenStacks,
        wallet2.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_WRONG_COMMISSION);
  },
});

Clarinet.test({
  name: "Market Test - Ensure NFT can't be bought when unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, commission1, tokenStacks, wallet1, wallet2, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    mintV2Token(1, chain, accounts);

    // shouldn't be listed
    clientV2.getListingInToken(1).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInToken(
        1,
        100000000,
        commission1,
        tokenStacks,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: commission1,
        token: tokenStacks
      }
    );

    // unlist
    block = chain.mineBlock([clientV2.unlistInToken(1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    clientV2.getListingInToken(1).result.expectNone();

    // wallet 2 trying to buy should fail
    block = chain.mineBlock([
      clientV2.buyInToken(
        1,
        commission1,
        tokenStacks,
        wallet2.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
  },
});

Clarinet.test({
  name: "Market Test - Ensure NFT can't be transferred when listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, commission1, tokenStacks, wallet1, wallet2, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(1, chain, accounts);

    // shouldn't be listed
    clientV2.getListingInToken(1).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInToken(
        1,
        100000000,
        commission1,
        tokenStacks,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      { price: types.uint(100000000), commission: commission1, token: tokenStacks }
    );

    // wallet 1 trying to transfer should fail
    block = chain.mineBlock([
      clientV2.transfer(1, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NFT_LISTED);
  },
});

Clarinet.test({
  name: "Market Test - Ensure can freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    const firstUri =
      "ipfs://QmXBaNb1XmLcXbcZ7TgJ85yuJMHnUA3vG7mWEVniL4WYge/thisisnumberone-{id}.json";
    const nextUri = "ipfs/QmdcBZnzSUwAKQdnVMKSkbVYoDD6DBkghPPUAwtVQjpwgq/{id}";
    clientV2
      .getTokenUri(0)
      .result.expectOk()
      .expectSome()
      .expectAscii(firstUri);

    // wallet 1 cant change token uri since not contract owner
    let block = chain.mineBlock([
      clientV2.setTokenUri(nextUri, wallet1.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // deployer can
    block = chain.mineBlock([
      clientV2.setTokenUri(nextUri, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    clientV2.getTokenUri(0).result.expectOk().expectSome().expectAscii(nextUri);

    // wallet 1 cant freeze since not contract owner
    block = chain.mineBlock([clientV2.freezeMetadata(wallet1.address)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // administrator can
    block = chain.mineBlock([clientV2.freezeMetadata(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer can't change back
    block = chain.mineBlock([
      clientV2.setTokenUri(firstUri, deployer.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_METADATA_FROZEN);

    clientV2.getTokenUri(0).result.expectOk().expectSome().expectAscii(nextUri);
  },
});

Clarinet.test({
  name: "Market Test - ensure burning removes listing",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, commission1, tokenStacks, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(1, chain, accounts);
    clientV2.getListingInToken(1).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInToken(1, 100000000, commission1, tokenStacks, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      { price: types.uint(100000000), commission: commission1, token: tokenStacks }
    );
    // wallet 1 can burn
    block = chain.mineBlock([clientV2.burn(1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );
    // burning removes listing
    clientV2.getListingInToken(1).result.expectNone();
  }
});

Clarinet.test({
  name: "Market Test - ensure can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(1, chain, accounts);

    // admin cannot burn
    let block = chain.mineBlock([clientV2.burn(1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // wallet 1 can burn
    block = chain.mineBlock([clientV2.burn(1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "Market Test - Ensure can transfer administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, newAdministrator, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // non administrator can't change administrator
    let block = chain.mineBlock([
      clientV2.setAdministrator(
        newAdministrator.address,
        newAdministrator.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // administrator can change administrator
    block = chain.mineBlock([
      clientV2.setAdministrator(
        newAdministrator.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // try an administrator function with new administrator
    block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 5, newAdministrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // old administrator can't
    block = chain.mineBlock([
      clientV2.setMintPass(wallet2.address, 5, deployer.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
  },
});

Clarinet.test({
  name: "Market Test - ensure can give approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(1, chain, accounts);
  
    // wallet 1 owns nft 0, admin can't transfer
    let block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // check wallet2 can give admin approval to wallet 1's NFT, but admin still won't be able to transfer it
    block = chain.mineBlock([
      clientV2.setApproved(1, deployer.address, true, wallet2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(402);

    // check admin can't transfer still
    block = chain.mineBlock([
      clientV2.transfer(0, wallet1.address, wallet2.address, deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // let wallet 1 transfer to wallet 2
    block = chain.mineBlock([
      clientV2.transfer(1, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );

    // admin should be able to transfer on behalf of wallet 2
    block = chain.mineBlock([
      clientV2.transfer(1, wallet2.address, wallet3.address, wallet2.address ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet2.address,
      wallet3.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "Market Test - ensure can give and remove approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(1, chain, accounts);

    // check wallet1 can give admin approval to its NFT
    let block = chain.mineBlock([
      clientV2.setApproved(1, deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );

    // transfer nft back to wallet1
    block = chain.mineBlock([
      clientV2.transfer(1, wallet2.address, wallet1.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet2.address,
      wallet1.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );

    // remove approval
    chain.mineBlock([
      clientV2.setApproved(1, deployer.address, false, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should no longer be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "Market Test - ensure can give and remove approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(1, chain, accounts);

    // check wallet1 can give admin approval to its NFT
    let block = chain.mineBlock([
      clientV2.setApproved(1, deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );

    // transfer nft back to wallet1
    block = chain.mineBlock([
      clientV2.transfer(1, wallet2.address, wallet1.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet2.address,
      wallet1.address,
      `${deployer.address}.thisisnumberone`,
      "thisisnumberone"
    );

    // remove approval
    chain.mineBlock([
      clientV2.setApproved(1, deployer.address, false, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should no longer be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
  },
});