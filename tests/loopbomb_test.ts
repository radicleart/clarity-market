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
    block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    block = chain.mineBlock([
      client.collectionMintTokenTwenty(
        hexStringToArrayBuffer(sig),
        hexStringToArrayBuffer(msg),
        [
          "ac263aa5f97ae494cc4bbb23384fc6a90e747c21b349783857e78d38707e72dd",
          "34fcbdaa10adf2dd6d5d9d856d1f49257888ec0dc62886a861e2f8b7fe42d336",
          "accae83beead7e5aea3b024b6db9001138f1bd0a93ce5448867581f2850dbb17",
          "0d279c8396c290cfb4e2bbbc15a82dc60a012fd23af277121d189faaf27a23f4",
          "d68c94d7740019210cfbb491eceb56f9fe41ea62ef800dd7317c03b0903756ea",
          "d4cbdcada735d2e75a70596fe43cbf615d4020893c9df0d319d35ccb01addc6c",
          "b636317711ff785851bdef48e916915dc0d19a1ee0ab1ff5b823a1d915f065d6",
          "0e40ebee36388873b3451dcf9ba96b07bb509ee3e6fb8e8494cd828f1a961284",
          "4d0a01d3cdaf3907c870a16fbfe445394c0651fb004e94c2a4d563cc85e7af19",
          "095186ee32341814927e4b608a7c0baa4d8eca9197af09e0877dc8890917c03d",
          "6cd523258e66530c86ca9fb53988f31486f86284ff5fb1e50d6d5a62deab3dda",
          "fe9f8f7db05e1a467dd526f6dce4e6bc30ebcd95880358c18d8a710cfac01dae",
          "09f50c30f2f50bcb1ad715a16cc02b80688fec8c76c4525a9a62523ac12878c3",
          "9b2a434780ba4a74f645b60d468293663500f132a8717bdadb0c48750dfbb0d4",
          "f8d62a2bff7b0a03a0cb5604427e883d92925479452d953e024e73ce2b2c8077",
          "4304564f1af6792cacd3563f087a348eb368245d57f3df3b872868a2e4cd0947",
          "aca309133328e27db4c501d467d50d8ee9626f74e208c95c2e2260dabea7e202",
          "984133508fc2385f40a68da4a2b4b5b28c138483fc500caa43b32665114c019b",
          "38135b5a33f71e17dfbd57db7efd7fd480f6e653f92c56301e043a6f19eb2599",
          "c8a29c29e7aece9517e7ed2fb040db0cc8af56b3eeab6a2a7af4b9cb04ecffa9",
        ].map((hash) => hexStringToArrayBuffer(hash)),
        Array.from({ length: 20 }).map((_) => hexStringToArrayBuffer(url)),
        1,
        0,
        100000000,
        0,
        wallet1.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number
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
    client.getApproval(0).result.expectOk().expectSome().expectPrincipal(wallet3.address);

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

Clarinet.test({
  name: "Loopbomb - test transfer status 2 and 3",
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

    // fail to change transfer status because not administrator
    block = chain.mineBlock([
      client.setBrokerInfo(
        2,
        deployer.address,
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // change transfer status because administrator
    block = chain.mineBlock([
      client.setBrokerInfo(
        2,
        newAdministrator.address,
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // wallet 1 owns nft, but shouldn't be able to transfer because only new administrator can
    block = chain.mineBlock([
      client.transfer(0, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // wallet 1 owns nft, new administrator should be able to transfer
    block = chain.mineBlock([
      client.transfer(
        0,
        wallet1.address,
        wallet2.address,
        newAdministrator.address
      ),
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

    // wallet 2 sets approval for wallet 3
    block = chain.mineBlock([
      client.setApprovalFor(0, wallet3.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check that wallet 3 was given approval
    client.getApproval(0).result.expectOk().expectSome().expectPrincipal(wallet3.address);

    // wallet 3 should not be able to transfer even though wallet 2 owns the nft because transfer-status 2
    block = chain.mineBlock([
      client.transfer(0, wallet2.address, wallet4.address, wallet3.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // change transfer status because administrator
    block = chain.mineBlock([
      client.setBrokerInfo(
        3,
        newAdministrator.address,
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        "ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW",
        administrator.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // wallet 3 should be able to transfer even though wallet 2 owns the nft because transfer-status 3
    block = chain.mineBlock([
      client.transfer(0, wallet2.address, wallet4.address, wallet3.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // wallet 4 owns nft, should be able to transfer (default option)
    block = chain.mineBlock([
      client.transfer(0, wallet4.address, wallet1.address, wallet4.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});
