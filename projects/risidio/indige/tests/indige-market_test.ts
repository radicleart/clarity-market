import {
  Clarinet,
  Chain,
  Account,
  types,
  Tx,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { IndigeClient, ErrCode } from "../../../../src/risidio-indige-client.ts";
import { WrappedBitcoin } from "../../../../src/wrapped-bitcoin-client.ts";

const mintAddress1 = "SP2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1KVFJ21";
const mintAddress2 = "SP132K8CVJ9B2GEDHTQS5MH3N7BR5QDMN1PXVS8MY";

const commissionAddress1 = "ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5";
const commissionAddress2 = "ST1WJY09D3DEE45B1PY8TAV838VCH9HNEJXB2ZBPQ";

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
  clientV2: IndigeClient;
  clientWrappedBitcoin: WrappedBitcoin;
} => {
  const administrator = accounts.get("deployer")!;
  const deployer = accounts.get("deployer")!;
  const tokenBitcoin = accounts.get("deployer")!.address + '.Wrapped-Bitcoin';
  const tokenDiko = accounts.get("deployer")!.address + '.arkadiko-token';
  const tokenStacks = accounts.get("deployer")!.address + '.stx-token';
  const tokenWrappedStacks = accounts.get("deployer")!.address + '.wrapped-stx-token';
  const commission1 = accounts.get("deployer")!.address + '.commission-indige';
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const wallet3 = accounts.get("wallet_3")!;
  const wallet4 = accounts.get("wallet_4")!;
  const wallet5 = accounts.get("wallet_5")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const clientV2 = new IndigeClient(chain, deployer);
  const clientWrappedBitcoin = new WrappedBitcoin(chain, deployer);
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
    clientWrappedBitcoin
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
    `${deployer.address}.indige`,
    "indige"
  );

};

Clarinet.test({
  name: "Market Test - Ensure can list and unlist by owner",
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
      clientV2.listInToken(
        1,
        100000000,
        commission1,
        tokenStacks,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check is listed
    assertEquals(
      clientV2.getListingInToken(1).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: commission1,
        token: tokenStacks
      }
    );

    // check that it can't be unlisted by not the owner
    block = chain.mineBlock([clientV2.unlistInToken(1, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // unlist
    block = chain.mineBlock([clientV2.unlistInToken(1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
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
      5000000,
      wallet2.address,
      commissionAddress1
    );
    block.receipts[0].events.expectSTXTransferEvent(
      5000000,
      wallet2.address,
      commissionAddress2
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige`,
      "indige"
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
      let block = chain.mineBlock([clientV2.listInToken(1, 100, commission1, tokenBitcoin, wallet1.address )]);
      block.receipts[0].result.expectOk().expectBool(true);

      assertEquals(clientV2.getListingInToken(1).result.expectSome().expectTuple(), { price: types.uint(100), commission: commission1, token: tokenBitcoin });
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
      clientWrappedBitcoin.getBalance(wallet2.address, wallet2).result.expectOk().expectUint(999890);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      block.receipts[1].events.expectFungibleTokenTransferEvent(
        100,
        wallet2.address,
        wallet1.address,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        5,
        wallet2.address,
        commissionAddress1,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        5,
        wallet2.address,
        commissionAddress2,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );

      block.receipts[1].events.expectNonFungibleTokenTransferEvent(
        types.uint(1),
        wallet1.address,
        wallet2.address,
        `${deployer.address}.indige`,
        "indige"
      );
    },
});

Clarinet.test({
  name: "Market Test - Ensure that NFT can't be bought with different sip10 token to listing",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, tokenBitcoin, commission1, wallet1, wallet2, clientWrappedBitcoin, clientV2 } =
      getWalletsAndClient(chain, accounts);

      mintV2Token(1, chain, accounts);

      // shouldn't be listed
      clientV2.getListingInToken(1).result.expectNone();
      clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);

      // list for 100 stx
      let block = chain.mineBlock([clientV2.listInToken(1, 100, commission1, tokenBitcoin, wallet1.address )]);
      block.receipts[0].result.expectOk().expectBool(true);

      assertEquals(clientV2.getListingInToken(1).result.expectSome().expectTuple(), { price: types.uint(100), commission: commission1, token: tokenBitcoin });
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
      clientWrappedBitcoin.getBalance(wallet2.address, wallet2).result.expectOk().expectUint(999890);
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      block.receipts[1].events.expectFungibleTokenTransferEvent(
        100,
        wallet2.address,
        wallet1.address,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        5,
        wallet2.address,
        commissionAddress1,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );
      block.receipts[1].events.expectFungibleTokenTransferEvent(
        5,
        wallet2.address,
        commissionAddress2,
        `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
      );

      block.receipts[1].events.expectNonFungibleTokenTransferEvent(
        types.uint(1),
        wallet1.address,
        wallet2.address,
        `${deployer.address}.indige`,
        "indige"
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
      {
        price: types.uint(100000000),
        commission: commission1,
        token: tokenStacks
      }
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
      "ipfs://QmX7pQBn7FgxFQ6LgizaBKmsVVd5hKLhcDoqGb4JEWxKEv/indige-{id}.json";
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
      `${deployer.address}.indige`,
      "indige"
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
    block.receipts[0].result.expectOk().expectBool(true);

    // check admin can't transfer still
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
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
      `${deployer.address}.indige`,
      "indige"
    );

    // admin should be able to transfer on behalf of wallet 2
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet2.address,
        wallet3.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet2.address,
      wallet3.address,
      `${deployer.address}.indige`,
      "indige"
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
      `${deployer.address}.indige`,
      "indige"
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
      `${deployer.address}.indige`,
      "indige"
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
  name: "Market Test - ensure can approve all",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, clientV2 } = getWalletsAndClient(chain, accounts);

    mintV2Token(1, chain, accounts);
    mintV2Token(2, chain, accounts);
      // check wallet1 can give admin approval to its NFT 0
    let block = chain.mineBlock([
      clientV2.setApprovedAll(deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer nft 0 on behalf of wallet 1
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
      `${deployer.address}.indige`,
      "indige"
    );

    // admin should be able to transfer nft 1 on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        2,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(2),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige`,
      "indige"
    );
  },
});

Clarinet.test({
  name: "Market Test - ensure can approve all but block specified nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV2Token(1, chain, accounts);
    mintV2Token(2, chain, accounts);


    // check wallet1 can give admin approval to its NFT 0
    let block = chain.mineBlock([
      clientV2.setApprovedAll(deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer nft 0 on behalf of wallet 1
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
      `${deployer.address}.indige`,
      "indige"
    );

    // block from transfering nft id 1
    block = chain.mineBlock([
      clientV2.setApproved(1, deployer.address, false, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should not be able to transfer nft 1 on behalf of wallet 1 because blocked
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


      /**
      block = chain.mineBlock([
        clientSwap.createPair(
          `${deployer.address}.arkadiko-token`,
          `${deployer.address}.wrapped-stx-token`,
          `${deployer.address}.arkadiko-swap-token-wstx-diko`,
          "wstx-diko",
          1000000,
          100000,
          `${deployer.address}`
        ),
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      block = chain.mineBlock([
        clientSwap.swapXForY(
          `${deployer.address}.wrapped-stx-token`,
          `${deployer.address}.arkadiko-token`,
          1000000,
          100000,
          wallet2.address
        ),
      ]);
      block.receipts[0].result.expectOk().expectBool(true);
      **/