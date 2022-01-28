import {
  Clarinet,
  Chain,
  Account,
  types,
  Tx,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { hexStringToArrayBuffer } from "../../../src/utils.ts";
import { CrashPunksV1Client } from "../../../src/crashpunks-v1-client.ts";
import { GenesisClient, ErrCode } from "../../../src/thisisnumberone-genesis-client.ts";

const commissionAddress1 = "SP29N24XJPW2WRVF6S2JWBC3TJBGBA5EXPSE6NH14";
const commissionAddress2 = "SPGAKH27HF1T170QET72C727873H911BKNMPF8YB";
const commissionAddress3 = "SPZRAE52H2NC2MDBEV8W99RFVPK8Q9BW8H88XV9N";
const commissionAddress4 = "SP2FTZQX1V9FPPNH485Z49JE914YNQYGT4XVGNR4S";
const commissionAddress5 = "SP162D87CY84QVVCMJKNKGHC7GGXFGA0TAR9D0XJW";
const commissionAddress6 = "SP1P89TEC03E29V5MYJBSCC8KWR1A243ZG2R8DYB1";
const commissionAddress7 = "SP2S6MCR2K3TYAC02RSYQ74RE9RJ3Q0EV3FYFGKGB";

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
  clientV1: CrashPunksV1Client;
  clientV2: GenesisClient;
} => {
  const administrator = {
    address: "SP3N4AJFZZYC4BK99H53XP8KDGXFGQ2PRSQP2HGT6",
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
  const clientV1 = new CrashPunksV1Client(chain, deployer);
  const clientV2 = new GenesisClient(chain, deployer);
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

const mintV2Token = (chain: Chain, accounts: Map<string, Account>) => {
  const { wallet1, clientV2, deployer } = getWalletsAndClient(chain, accounts);

  let block = chain.mineBlock([
    clientV2.setMintPass(wallet1.address, 5, deployer.address),
  ]);
  block.receipts[0].result.expectOk().expectBool(true);
  block = chain.mineBlock([clientV2.mintToken(wallet1.address)]);
  block.receipts[0].result.expectOk().expectBool(true);
  block.receipts[0].events.expectSTXTransferEvent(
    1000000,
    wallet1.address,
    commissionAddress1
  );

};

Clarinet.test({
  name: "ThisisnumberoneGenesis - Ensure can list and unlist by owner",
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
        `${deployer.address}.commission-thisisgenesis`,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_OWNER);

    // list for 100 stx
    block = chain.mineBlock([
      clientV2.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-thisisgenesis`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check is listed
    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-thisisgenesis`,
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
  name: "ThisisnumberoneGenesis - Ensure can NFT be listed and bought",
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
        `${deployer.address}.commission-thisisgenesis`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-thisisgenesis`,
      }
    );

    block = chain.mineBlock([
      clientV2.buyInUStx(
        0,
        `${deployer.address}.commission-thisisgenesis`,
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
      6000000,
      wallet2.address,
      commissionAddress1
    );
    block.receipts[0].events.expectSTXTransferEvent(
      360000,
      wallet2.address,
      commissionAddress2
    );
    block.receipts[0].events.expectSTXTransferEvent(
      360000,
      wallet2.address,
      commissionAddress3
    );
    block.receipts[0].events.expectSTXTransferEvent(
      360000,
      wallet2.address,
      commissionAddress4
    );
    block.receipts[0].events.expectSTXTransferEvent(
      360000,
      wallet2.address,
      commissionAddress5
    );
    block.receipts[0].events.expectSTXTransferEvent(
      360000,
      wallet2.address,
      commissionAddress6
    );
    block.receipts[0].events.expectSTXTransferEvent(
      200000,
      wallet2.address,
      commissionAddress7
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet1.address,
      wallet2.address,
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "ThisisnumberoneGenesis - Ensure that NFT can't be bought with different commission trait",
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
        `${deployer.address}.commission-thisisgenesis`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-thisisgenesis`,
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
  name: "ThisisnumberoneGenesis - Ensure NFT can't be bought when unlisted",
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
        `${deployer.address}.commission-thisisgenesis`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-thisisgenesis`,
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
        `${deployer.address}.commission-thisisgenesis`,
        wallet2.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
  },
});

Clarinet.test({
  name: "ThisisnumberoneGenesis - Ensure NFT can't be transferred when listed",
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
        `${deployer.address}.commission-thisisgenesis`,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(
      clientV2.getListingInUStx(0).result.expectSome().expectTuple(),
      {
        price: types.uint(100000000),
        commission: `${deployer.address}.commission-thisisgenesis`,
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
  name: "ThisisnumberoneGenesis - ensure can mint v2",
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
      commissionAddress1
    );

    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(0),
      wallet1.address,
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
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
  name: "ThisisnumberoneGenesis - test admin airdrop",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );

    // non-admin cannot airdrop
    let block = chain.mineBlock([
      clientV2.adminMintAirdrop(wallet1.address, 4, wallet1.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);

    // admin can airdrop
    block = chain.mineBlock([
      clientV2.adminMintAirdrop(wallet1.address, 2, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check owner of nft 100 is wallet 1
    clientV2
      .getOwner(2)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet1.address);
  },
});

Clarinet.test({
  name: "ThisisnumberoneGenesis - Ensure can freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, clientV2 } = getWalletsAndClient(
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
  name: "ThisisnumberoneGenesis - ensure can burn",
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "ThisisnumberoneGenesis - Ensure can transfer administrator",
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
  name: "ThisisnumberoneGenesis - ensure can give approval",
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "ThisisnumberoneGenesis - ensure can give and remove approval",
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
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
  name: "ThisisnumberoneGenesis - ensure can approve all",
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
    );
  },
});

Clarinet.test({
  name: "ThisisnumberoneGenesis - ensure can approve all but block specified nft",
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
      `${deployer.address}.thisisnumberone-genesis`,
      "thisisnumberone"
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
