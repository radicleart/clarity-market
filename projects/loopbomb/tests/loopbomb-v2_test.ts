import {
  Clarinet,
  Chain,
  Account,
  types,
  Tx,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { hexStringToArrayBuffer } from "../../../src/utils.ts";
import { LoopbombV1Client } from "../../../src/loopbomb-stx-v1-client.ts";
import { LoopbombV2Client, ErrCode } from "../../../src/loopbomb-v2-client.ts";

const commissionAddress1 = "SP29N24XJPW2WRVF6S2JWBC3TJBGBA5EXPSE6NH14";
const commissionAddress2 = "SP3BTM84FYABJGJ83519GG5NSV0A6A13D4NHJSS32";
const commissionAddress3 = "SP120HPHF8AZXS2SCXMXAX3XF4XT35C0HCHMAVMAJ";

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
  clientV1: LoopbombV1Client;
  clientV2: LoopbombV2Client;
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
  const clientV1 = new LoopbombV1Client(chain, deployer);
  const clientV2 = new LoopbombV2Client(chain, deployer);
  return {
    administrator,
    deployer,
    wallet1,
    wallet2,
    wallet3,
    wallet4,
    wallet5,
    newAdministrator,
    clientV1,
    clientV2,
  };
};

const sig =
  "4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
const msg = "53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4";
const hsh = "4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6";
const url =
  "https://gaia.blockstack.org/hub/1MNnYMskXjRmQU6m6sFMBe6a7xVdMvH9dp/to_the_machine_eternal/bob_jaroc/72ba02ef43182ddcb5ccb385b36001e4b41051d50e84d21435d494a732715181.json";

const setCollectionRoyalties = (
  chain: Chain,
  accounts: Map<string, Account>
) => {
  const {
    administrator,
    wallet2,
    wallet3,
    wallet4,
    wallet5,
    clientV1,
    clientV2,
  } = getWalletsAndClient(chain, accounts);

  const newMintAddresses = [
    wallet2.address,
    wallet3.address,
    wallet4.address,
    wallet5.address,
  ];

  const newMintShares = [5000000000, 4000000000, 2000000000, 1000000000];

  const newAddresses = [
    wallet2.address,
    wallet3.address,
    wallet4.address,
    wallet5.address,
    wallet2.address,
    wallet3.address,
    wallet4.address,
    wallet5.address,
    wallet2.address,
    wallet3.address,
  ];

  const newShares = [
    5000000000, 4000000000, 2000000000, 1000000000, 0, 0, 0, 0, 0, 0,
  ];

  const newSecondaries = [
    5000000000, 4000000000, 2000000000, 1000000000, 0, 0, 0, 0, 0, 0,
  ];

  // the testing for this is done in loopbomb_test
  let block = chain.mineBlock([
    clientV1.setCollectionRoyalties(
      newMintAddresses,
      newMintShares,
      newAddresses,
      newShares,
      newSecondaries,
      administrator.address
    ),
  ]);
  block.receipts[0].result.expectOk().expectBool(true);
};

// mints a v1 token
const mintV1Token = (chain: Chain, accounts: Map<string, Account>) => {
  const { wallet1, clientV1 } = getWalletsAndClient(chain, accounts);

  setCollectionRoyalties(chain, accounts);

  // the testing for this is done in loopbomb_test
  chain.mineBlock([
    clientV1.collectionMintToken(
      hexStringToArrayBuffer(sig),
      hexStringToArrayBuffer(msg),
      hexStringToArrayBuffer(
        Array.from({ length: 64 })
          .map((_) => Math.floor(Math.random() * 10))
          .join("")
      ),
      url,
      1,
      0,
      100000000,
      200000000,
      wallet1.address
    ),
  ]);
};

Clarinet.test({
  name: "LoopbombV2 - Ensure can upgrade v1 -> v2",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 token
    mintV1Token(chain, accounts);

    // fail if not wallet1 tries to upgrade
    let block = chain.mineBlock([
      clientV2.upgradeV1ToV2(0, administrator.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);

    block = chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    block.receipts[0].result.expectOk().expectBool(true);

    // 1. Burns the original v1 NFT
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(0),
      wallet1.address,
      `${deployer.address}.loopbomb-stx-v1`,
      "loopbomb"
    );

    // 2. Mints the v2 NFT with the same nftIndex
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(0),
      wallet1.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );

    // ensure can batch upgrade
    // mint 10 more v1
    for (let i = 0; i < 10; i++) {
      mintV1Token(chain, accounts);
    }

    // upgrade another 10
    block = chain.mineBlock([
      clientV2.batchUpgradeV1ToV2(
        Array.from({ length: 10 }).map((_, index) => index + 1),
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // make sure wallet1 owns v2 nftid 10
    clientV2
      .getOwner(10)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet1.address);
    // make sure none own v2 nft id 11
    clientV2.getOwner(11).result.expectOk().expectNone();
  },
});

Clarinet.test({
  name: "LoopbombV2 - Ensure can list and unlist by owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet1, administrator, deployer, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // check that it can't be listed by not the owner
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        10000000,
        `${deployer.address}.commission-loopbomb`,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // list for 100 stx
    block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-loopbomb`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check is listed
    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-loopbomb`,
      }
    );

    // check that it can't be unlisted by not the owner
    block = chain.mineBlock([clientV2.unlistInUStx(0, administrator.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // unlist
    block = chain.mineBlock([clientV2.unlistInUStx(0, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    clientV2.getListingInUStx(0).result.expectNone();
  },
});

Clarinet.test({
  name: "LoopbombV2 - Ensure can NFT be listed and bought",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-loopbomb`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-loopbomb`,
      }
    );

    block = chain.mineBlock([
      clientV2.buyInUStx(
        0,
        `${deployer.address}.commission-loopbomb`,
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
      3000000,
      wallet2.address,
      commissionAddress1
    );
    block.receipts[0].events.expectSTXTransferEvent(
      3000000,
      wallet2.address,
      commissionAddress2
    );
    block.receipts[0].events.expectSTXTransferEvent(
      2000000,
      wallet2.address,
      commissionAddress3
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );
  },
});

Clarinet.test({
  name: "LoopbombV2 - Ensure that NFT can't be bought with different commission trait",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-loopbomb`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-loopbomb`,
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
  name: "LoopbombV2 - Ensure NFT can't be bought when unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-loopbomb`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-loopbomb`,
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
        `${deployer.address}.commission-loopbomb`,
        wallet2.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
  },
});

Clarinet.test({
  name: "LoopbombV2 - Ensure NFT can't be transferred when listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // shouldn't be listed
    clientV2.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    let block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-loopbomb`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-loopbomb`,
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
  name: "LoopbombV2 - ensure cannot mint v2",
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
      .expectUint(ErrCode.ERR_COLLECTION_LIMIT_REACHED);
  },
});

Clarinet.test({
  name: "LoopbombV2 - test admin airdrop",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // non-admin cannot airdrop
    let block = chain.mineBlock([
      clientV2.adminMintAirdrop(wallet1.address, 100, wallet1.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // admin can airdrop
    block = chain.mineBlock([
      clientV2.adminMintAirdrop(wallet1.address, 100, administrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check owner of nft 100 is wallet 1
    clientV2
      .getOwner(100)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet1.address);
  },
});

Clarinet.test({
  name: "LoopbombV2 - Ensure can freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    const firstUri =
      "ipfs://Qmad43sssgNbG9TpC6NfeiTi9X6f9vPYuzgW2S19BEi49m/{id}.json";
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
      clientV2.setTokenUri(nextUri, administrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    clientV2.getTokenUri(0).result.expectOk().expectSome().expectAscii(nextUri);

    // wallet 1 cant freeze since not contract owner
    block = chain.mineBlock([clientV2.freezeMetadata(wallet1.address)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // administrator can
    block = chain.mineBlock([clientV2.freezeMetadata(administrator.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer can't change back
    block = chain.mineBlock([
      clientV2.setTokenUri(firstUri, administrator.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_METADATA_FROZEN);

    clientV2.getTokenUri(0).result.expectOk().expectSome().expectAscii(nextUri);
  },
});

Clarinet.test({
  name: "LoopbombV2 - ensure can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // admin cannot burn
    let block = chain.mineBlock([clientV2.burn(0, administrator.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // wallet 1 can burn
    block = chain.mineBlock([clientV2.burn(0, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(0),
      wallet1.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );
  },
});

Clarinet.test({
  name: "LoopbombV2 - Ensure can transfer administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, wallet1, wallet2, newAdministrator, clientV2 } =
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
        administrator.address
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
      clientV2.setMintPass(wallet2.address, 5, administrator.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
  },
});

Clarinet.test({
  name: "LoopbombV2 - ensure can give approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, wallet3, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // wallet 1 owns nft 0, admin can't transfer
    let block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // check wallet2 can give admin approval to wallet 1's NFT, but admin still won't be able to transfer it
    block = chain.mineBlock([
      clientV2.setApproved(0, administrator.address, true, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check admin can't transfer still
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        administrator.address
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
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );

    // admin should be able to transfer on behalf of wallet 2
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet2.address,
        wallet3.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet2.address,
      wallet3.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );
  },
});

Clarinet.test({
  name: "LoopbombV2 - ensure can give and remove approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);

    // check wallet1 can give admin approval to its NFT
    let block = chain.mineBlock([
      clientV2.setApproved(0, administrator.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
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
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );

    // remove approval
    chain.mineBlock([
      clientV2.setApproved(0, administrator.address, false, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should no longer be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "LoopbombV2 - ensure can approve all",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(1, wallet1.address)]);

    // check wallet1 can give admin approval to its NFT 0
    let block = chain.mineBlock([
      clientV2.setApprovedAll(administrator.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer nft 0 on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );

    // admin should be able to transfer nft 1 on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );
  },
});

Clarinet.test({
  name: "LoopbombV2 - ensure can approve all but block specified nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { administrator, deployer, wallet1, wallet2, clientV2 } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);
    mintV1Token(chain, accounts);
    chain.mineBlock([clientV2.upgradeV1ToV2(1, wallet1.address)]);

    // check wallet1 can give admin approval to its NFT 0
    let block = chain.mineBlock([
      clientV2.setApprovedAll(administrator.address, true, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should be able to transfer nft 0 on behalf of wallet 1
    block = chain.mineBlock([
      clientV2.transfer(
        0,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.loopbomb-v2`,
      "loopbomb"
    );

    // block from transfering nft id 1
    block = chain.mineBlock([
      clientV2.setApproved(1, administrator.address, false, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // admin should not be able to transfer nft 1 on behalf of wallet 1 because blocked
    block = chain.mineBlock([
      clientV2.transfer(
        1,
        wallet1.address,
        wallet2.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
  },
});
