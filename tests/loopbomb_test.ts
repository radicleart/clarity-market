import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { LoopbombClient, ErrCode } from "../src/loopbomb-client.ts";
import { formatBuffString, hexStringToArrayBuffer } from "../src/utils.ts";
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";

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
  client: LoopbombClient;
} => {
  const administrator = {
    address: "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
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
  const client = new LoopbombClient(chain, deployer);
  return {
    administrator,
    deployer,
    wallet1,
    wallet2,
    wallet3,
    wallet4,
    wallet5,
    newAdministrator,
    client,
  };
};

Clarinet.test({
  name: "Loopbomb - test variables of contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should return admin address
    const currentAdministrator = client.getAdministrator();
    currentAdministrator.result.expectPrincipal(administrator.address);

    // should return initial mint price
    const mintPrice = client.getMintPrice();
    mintPrice.result.expectUint(1000000);

    // should return base token uri
    const baseTokenUri = client.getBaseTokenUri();
    baseTokenUri.result.expectAscii("https://loopbomb.io/nfts/");

    // should return initial mint counter
    const mintCounter = client.getMintCounter();
    mintCounter.result.expectOk().expectUint(0);

    // should return token name
    const tokenName = client.getTokenName();
    tokenName.result.expectOk().expectAscii("loopbomb");

    // should return token symbol
    const tokenSymbol = client.getTokenSymbol();
    tokenSymbol.result.expectOk().expectAscii("LOOP");
  },
});

Clarinet.test({
  name: "Loopbomb - test transfer-administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to transfer administrator if sender not current administrator
    let block = chain.mineBlock([
      client.transferAdministrator(newAdministrator.address, wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to change contract administrator
    block = chain.mineBlock([
      client.transferAdministrator(
        newAdministrator.address,
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new admin address
    const currentAdministrator = client.getAdministrator();
    currentAdministrator.result.expectPrincipal(newAdministrator.address);
  },
});

Clarinet.test({
  name: "Loopbomb - test update-base-token-uri",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to update base token uri if sender not current administrator
    let block = chain.mineBlock([
      client.updateBaseTokenURI("https://google.com/", wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to change base token uri
    block = chain.mineBlock([
      client.updateBaseTokenURI("https://google.com/", administrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new base token uri
    const currentAdministrator = client.getBaseTokenUri();
    currentAdministrator.result.expectAscii("https://google.com/");
  },
});

Clarinet.test({
  name: "Loopbomb - test update-mint-price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to update mint price if sender not current administrator
    let block = chain.mineBlock([client.updateMintPrice(100, wallet1.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to update mint price
    block = chain.mineBlock([
      client.updateMintPrice(100, administrator.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new mint price
    const currentAdministrator = client.getMintPrice();
    currentAdministrator.result.expectUint(100);
  },
});

Clarinet.test({
  name: "Loopbomb - test get-balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to get balance if not current administrator
    let balance = client.getBalance(wallet1);
    balance.result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should not be able to get balance if not current administrator
    balance = client.getBalance(administrator);
    balance.result.expectOk().expectUint(0);
  },
});

Clarinet.test({
  name: "Loopbomb - transfer-balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    // should not be able to transfer balance if sender not current administrator
    let block = chain.mineBlock([
      client.transferBalance(wallet1.address, deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should not be able to transfer zero balance
    block = chain.mineBlock([
      client.transferBalance(wallet1.address, administrator.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_FAILED_TO_STX_TRANSFER);
  },
});

// NB for string <-> hex service - e.g. to convert meta data url to hex see https://string-functions.com/string-hex.aspx
Clarinet.test({
  name: "Loopbomb - test collection-mint-token",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      wallet3,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    const sig =
      "4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
    const msg =
      "53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4";
    const hsh =
      "4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6";
    const url =
      "68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e";

    const newMintAddresses = [
      wallet2.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
    ];
    const newMintShares = [9000000000, 1000000000, 0, 0];
    const newAddresses = [
      wallet2.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
    ];
    const newShares = [9000000000, 1000000000, 0, 0];
    const newSecondaries = [9000000000, 1000000000, 0, 0];
    let block = chain.mineBlock([
      client.setCollectionRoyalties(
        newMintAddresses,
        newMintShares,
        newAddresses,
        newShares,
        newSecondaries,
        administrator.address
      ),
      client.collectionMintToken(
        hexStringToArrayBuffer(sig),
        hexStringToArrayBuffer(msg),
        hexStringToArrayBuffer(hsh),
        hexStringToArrayBuffer(url),
        1,
        0,
        100000000,
        0,
        wallet1.address
      ),
    ]);

    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number

    const collectionBeneficiaries = client.getCollectionBeneficiaries();
    const actualTuple: any = collectionBeneficiaries.result
      .expectOk()
      .expectTuple();
    actualTuple["collection-addresses"] =
      actualTuple["collection-addresses"].expectList();
    actualTuple["collection-mint-addresses"] =
      actualTuple["collection-mint-addresses"].expectList();
    actualTuple["collection-mint-shares"] = actualTuple[
      "collection-mint-shares"
    ]
      .expectList()
      .map((i: String) => Number(i.substr(1)));
    actualTuple["collection-secondaries"] = actualTuple[
      "collection-secondaries"
    ]
      .expectList()
      .map((i: String) => Number(i.substr(1)));
    actualTuple["collection-shares"] = actualTuple["collection-shares"]
      .expectList()
      .map((i: String) => Number(i.substr(1)));
    const expectedTuple = {
      "collection-addresses": newAddresses,
      "collection-mint-addresses": newMintAddresses,
      "collection-mint-shares": newMintShares,
      "collection-secondaries": newSecondaries,
      "collection-shares": newShares,
    };
    assertEquals(actualTuple, expectedTuple);

    block.receipts[1].result.expectOk().expectUint(0);
    const stxTransfer1 = {
      type: "stx_transfer_event",
      stx_transfer_event: {
        sender: wallet1.address,
        recipient: wallet2.address,
        amount: "90000000",
      },
    };
    // todo: update index of events after removing print statements
    assertEquals(stxTransfer1, block.receipts[1].events[2]);

    const stxTransfer2 = {
      type: "stx_transfer_event",
      stx_transfer_event: {
        sender: wallet1.address,
        recipient: wallet3.address,
        amount: "10000000",
      },
    };
    // todo: update index of events after removing print statements
    assertEquals(stxTransfer2, block.receipts[1].events[4]);

    const mintNft = {
      type: "nft_mint_event",
      nft_mint_event: {
        asset_identifier: `${deployer.address}.loopbomb::loopbomb`,
        recipient: wallet1.address,
        value: "u0",
      },
    };
    // todo: update index of events after removing print statements
    assertEquals(mintNft, block.receipts[1].events[9]);

    // test bad signature
    const badSig =
      "5e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
    block = chain.mineBlock([
      client.collectionMintToken(
        hexStringToArrayBuffer(badSig),
        hexStringToArrayBuffer(msg),
        hexStringToArrayBuffer(hsh),
        hexStringToArrayBuffer(url),
        1,
        0,
        100000000,
        0,
        wallet1.address
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(9);
  },
});

Clarinet.test({
  name: "Loopbomb - test collection-mint-token-twenty",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      wallet3,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    const sig =
      "4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
    const msg =
      "53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4";
    const hsh =
      "4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6";
    const url =
      "68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e";

    const newMintAddresses = [
      wallet2.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
    ];
    const newMintShares = [9000000000, 1000000000, 0, 0];
    const newAddresses = [
      wallet2.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
    ];
    const newShares = [9000000000, 1000000000, 0, 0];
    const newSecondaries = [9000000000, 1000000000, 0, 0];
    let block = chain.mineBlock([
      client.setCollectionRoyalties(
        newMintAddresses,
        newMintShares,
        newAddresses,
        newShares,
        newSecondaries,
        administrator.address
      ),
      client.collectionMintTokenTwenty(
        hexStringToArrayBuffer(sig),
        hexStringToArrayBuffer(msg),
        Array.from({ length: 20 }).map((_) => hexStringToArrayBuffer(hsh)),
        Array.from({ length: 20 }).map((_) => hexStringToArrayBuffer(url)),
        1,
        0,
        100000000,
        0,
        wallet1.address
      ),
    ]);

    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number
    block.receipts[1].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number
  },
});

Clarinet.test({
  name: "Loopbomb - test transfer status 1",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      wallet3,
      wallet4,
      newAdministrator,
      client,
    } = getWalletsAndClient(chain, accounts);

    const sig =
      "4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
    const msg =
      "53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4";
    const hsh =
      "4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6";
    const url =
      "68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e";

    const newMintAddresses = [
      wallet2.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
    ];
    const newMintShares = [9000000000, 1000000000, 0, 0];
    const newAddresses = [
      wallet2.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
      wallet3.address,
    ];
    const newShares = [9000000000, 1000000000, 0, 0];
    const newSecondaries = [9000000000, 1000000000, 0, 0];
    let block = chain.mineBlock([
      client.setCollectionRoyalties(
        newMintAddresses,
        newMintShares,
        newAddresses,
        newShares,
        newSecondaries,
        administrator.address
      ),
      client.collectionMintToken(
        hexStringToArrayBuffer(sig),
        hexStringToArrayBuffer(msg),
        hexStringToArrayBuffer(hsh),
        hexStringToArrayBuffer(url),
        1,
        0,
        100000000,
        0,
        wallet1.address
      ),
    ]);

    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number
    block.receipts[1].result.expectOk().expectUint(0); // assert that the result of the tx was ok and the input number

    // wallet 1 owns nft, deployer shouldn't be able to transfer
    block = chain.mineBlock([
      client.transfer(0, deployer.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_OWNED_ERR);

    // wallet 1 owns nft, wallet 1 should be able to transfer
    block = chain.mineBlock([
      client.transfer(0, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    let expectedNftTransferEvent = {
      type: "nft_transfer_event",
      nft_transfer_event: {
        asset_identifier: `${deployer.address}.loopbomb::loopbomb`,
        sender: wallet1.address,
        recipient: wallet2.address,
        value: types.uint(0),
      },
    };
    assertEquals(expectedNftTransferEvent, block.receipts[0].events[0]);

    // check that wallet 2 has the nft now
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet2.address);

    // wallet 2 owns nft, wallet 3 shouldn't be able to transfer
    block = chain.mineBlock([
      client.transfer(0, wallet3.address, wallet4.address, wallet2.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_OWNED_ERR);

    // wallet 1 shouldn't be able to set approval anymore
    block = chain.mineBlock([
      client.setApprovalFor(0, wallet3.address, wallet1.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NFT_NOT_OWNED_ERR);

    // wallet 2 sets approval for wallet 3
    block = chain.mineBlock([
      client.setApprovalFor(0, wallet3.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check that wallet 3 was given approval
    client.getApproval(0).result.expectOk().expectPrincipal(wallet3.address);

    // wallet 3 should be able to transfer even though wallet 2 owns the nft
    block = chain.mineBlock([
      client.transfer(0, wallet2.address, wallet4.address, wallet3.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    expectedNftTransferEvent = {
      type: "nft_transfer_event",
      nft_transfer_event: {
        asset_identifier: `${deployer.address}.loopbomb::loopbomb`,
        sender: wallet2.address,
        recipient: wallet4.address,
        value: types.uint(0),
      },
    };
    assertEquals(expectedNftTransferEvent, block.receipts[0].events[0]);
  },
});
