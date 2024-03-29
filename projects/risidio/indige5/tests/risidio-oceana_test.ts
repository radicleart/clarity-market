import {
  Clarinet,
  Chain,
  Account,
  types,
  Tx,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { Indige5Client, ErrCode } from "../../../../src/risidio-indige5-client.ts";

const walletAddress1 = "ST3BTM84FYABJGJ83519GG5NSV0A6A13D4N25KH1K";

const commissionAddress1 = "ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5";
const commissionAddress2 = "ST1WJY09D3DEE45B1PY8TAV838VCH9HNEJXB2ZBPQ";

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  wallet1: Account;
  wallet2: Account;
  wallet3: Account;
  wallet4: Account;
  wallet5: Account;
  newAdministrator: Account;
  clientV2: Indige5Client;
} => {
  const administrator = {
    address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    balance: 1000000,
    name: "administrator",
    mnemonic: "asdf",
    derivation: "asdf",
  };
  const deployer = accounts.get("deployer")!;
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const wallet3 = accounts.get("wallet_3")!;
  const wallet4 = accounts.get("wallet_4")!;
  const wallet5 = accounts.get("wallet_5")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const clientV2 = new Indige5Client(chain, deployer);
  return {
    administrator,
    deployer,
    wallet1,
    wallet2,
    wallet3,
    wallet4,
    wallet5,
    newAdministrator,
    clientV2
  };
};

const mintV2Token = (chain: Chain, accounts: Map<string, Account>) => {
  const { administrator, wallet1, clientV2, deployer } = getWalletsAndClient(chain, accounts);

  let block = chain.mineBlock([
    clientV2.setMintPass(wallet1.address, 5, deployer.address),
  ]);
  block.receipts[0].result.expectOk().expectBool(true);
  block = chain.mineBlock([clientV2.mintToken(wallet1.address)]);
  block.receipts[0].result.expectOk().expectBool(true);
  block.receipts[0].events.expectSTXTransferEvent(
    1000000,
    wallet1.address,
    walletAddress1
  );

};

Clarinet.test({
  name: "Indige5 Test - Ensure can list and unlist by owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet1, administrator, deployer, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(chain, accounts);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // check that it can't be listed by not the owner
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        10000000,
        `${deployer.address}.commission-indige5`,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // list for 100 stx
    block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-indige5`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check is listed
    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-indige5`,
      }
    );

    // check that it can't be unlisted by not the owner
    block = chain.mineBlock([clientV2.unlistInUStx(0, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // unlist
    block = chain.mineBlock([clientV2.unlistInUStx(0, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    clientV2.getListingInUStx(0).result.expectNone();
  },
});

Clarinet.test({
  name: "Indige5 Test - Ensure can NFT be listed and bought",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(chain, accounts);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-indige5`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-indige5`,
      }
    );

    block = chain.mineBlock([
      clientV2.buyInUStx(
        0,
        `${deployer.address}.commission-indige5`,
        wallet2.address
      ),
    ]);
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
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige5`,
      "indige5"
    );
  },
});

Clarinet.test({
  name: "Indige5 Test - Ensure that NFT can't be bought with different commission trait",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(chain, accounts);


    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-indige5`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-indige5`,
      }
    );

    block = chain.mineBlock([
      clientV2.buyInUStx(
        0,
        `${deployer.address}.commission-nop`,
        wallet2.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_WRONG_COMMISSION);
  },
});

Clarinet.test({
  name: "Indige5 Test - Ensure NFT can't be bought when unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    mintV2Token(chain, accounts);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-indige5`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-indige5`,
      }
    );

    // unlist
    block = chain.mineBlock([clientV2.unlistInUStx(0, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    clientV2.getListingInUStx(0).result.expectNone();

    // wallet 2 trying to buy should fail
    block = chain.mineBlock([
      clientV2.buyInUStx(
        0,
        `${deployer.address}.commission-indige5`,
        wallet2.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
  },
});

Clarinet.test({
  name: "Indige5 Test - Ensure NFT can't be transferred when listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(chain, accounts);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-indige5`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-indige5`,
      }
    );

    // wallet 1 trying to transfer should fail
    block = chain.mineBlock([
      clientV2.transfer(0, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NFT_LISTED);
  },
});

Clarinet.test({
  name: "Indige5 Test - ensure can mint v2",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      wallet3,
      wallet4,
      wallet5,
      clientV2,
    } = getWalletsAndClient(chain, accounts);

    // should fail since no mint pass
    let block = chain.mineBlock([clientV2.mintToken(wallet1.address)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_MINT_PASS_LIMIT_REACHED);

    // wallet 1 try to add mint pass, should fail since only admin can
    block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 5, wallet1.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // admin add mint pass for wallet 1
    block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 1, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    clientV2.getMintPassBalance(wallet1.address).result.expectUint(1);

    // wallet 1 can now mint
    block = chain.mineBlock([clientV2.mintToken(wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      1000000,
      wallet1.address,
      walletAddress1
    );

    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(0),
      wallet1.address,
      `${deployer.address}.indige5`,
      "indige5"
    );

    // check that wallet 1 mint pass decreased to 0
    clientV2.getMintPassBalance(wallet1.address).result.expectUint(0);

    // check that wallet 1 owns 5721
    clientV2
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet1.address);

    // check that wallet 1 can't mint again
    block = chain.mineBlock([clientV2.mintToken(wallet1.address)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_MINT_PASS_LIMIT_REACHED);

    // replenish 20 mint pass for wallet 1
    // test batch set mint pass at the same time
    block = chain.mineBlock([
      // clientV2.setMintPass(wallet1.address, 20, deployer.address),
      clientV2.batchSetMintPass(
        [
          { account: wallet1.address, limit: 10 },
          { account: wallet2.address, limit: 1 },
        ],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // mint 20
    block = chain.mineBlock([
      clientV2.batchMintToken(
        [1, 2, 3],
        wallet1.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    for (let i = 1; i < 4; i++) {
      clientV2
        .getOwner(i)
        .result.expectOk()
        .expectSome()
        .expectPrincipal(wallet1.address);
    }

    // expect nft id 5722+21 to not exist
    clientV2
      .getOwner(5722 + 21)
      .result.expectOk()
      .expectNone();

    // make sure wallet2 can use its mint pass as well
    block = chain.mineBlock([clientV2.mintToken(wallet2.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Indige5 Test - Ensure can freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    const firstUri =
      "ipfs://QmRZA25mjkVBK6mXQVZeubAi9LmupYBWvS2oJCVPmbuw29/indige5-{id}.json";
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
  name: "Indige5 Test - ensure can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    mintV2Token(chain, accounts);

    // admin cannot burn
    let block = chain.mineBlock([clientV2.burn(0, deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // wallet 1 can burn
    block = chain.mineBlock([clientV2.burn(0, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(0),
      wallet1.address,
      `${deployer.address}.indige5`,
      "indige5"
    );
  },
});

Clarinet.test({
  name: "Indige5 Test - Ensure can transfer administrator",
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
  name: "Indige5 Test - ensure can give approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(chain, accounts);
  
    // wallet 1 owns nft 0, admin can't transfer
    let block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // check wallet2 can give admin approval to wallet 1's NFT, but admin still won't be able to transfer it
    block = chain.mineBlock([
      clientV2.setApproved(0, deployer.address, true, wallet2.address),
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
      clientV2.transfer(0, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige5`,
      "indige5"
    );

    // admin should be able to transfer on behalf of wallet 2
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet2.address,
        wallet3.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet2.address,
      wallet3.address,
      `${deployer.address}.indige5`,
      "indige5"
    );
  },
});

Clarinet.test({
  name: "Indige5 Test - ensure can give and remove approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(chain, accounts);

    // check wallet1 can give admin approval to its NFT
    let block = chain.mineBlock([
      clientV2.setApproved(0, deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige5`,
      "indige5"
    );

    // transfer nft back to wallet1
    block = chain.mineBlock([
      clientV2.transfer(0, wallet2.address, wallet1.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet2.address,
      wallet1.address,
      `${deployer.address}.indige5`,
      "indige5"
    );

    // remove approval
    chain.mineBlock([
      clientV2.setApproved(0, deployer.address, false, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should no longer be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "Indige5 Test - ensure can approve all",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    mintV2Token(chain, accounts);
    mintV2Token(chain, accounts);
      // check wallet1 can give admin approval to its NFT 0
    let block = chain.mineBlock([
      clientV2.setApprovedAll(deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer nft 0 on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige5`,
      "indige5"
    );

    // admin should be able to transfer nft 1 on behalf of wallet 1
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
      `${deployer.address}.indige5`,
      "indige5"
    );
  },
});

Clarinet.test({
  name: "Indige5 Test - ensure can approve all but block specified nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV2Token(chain, accounts);
    mintV2Token(chain, accounts);


    // check wallet1 can give admin approval to its NFT 0
    let block = chain.mineBlock([
      clientV2.setApprovedAll(deployer.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer nft 0 on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.indige5`,
      "indige5"
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
