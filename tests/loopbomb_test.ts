import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.18.0/index.ts";
import { LoopbombClient, ErrCode } from "../src/loopbomb-client.ts";
import { formatBuffString, hexStringToArrayBuffer } from "../src/utils.ts";
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";

declare global {
  interface Array<T> {
    expectSTXTransferEvent(
      amount: Number,
      sender: String,
      recipient: String
    ): Object;
    expectFungibleTokenTransferEvent(
      amount: Number,
      sender: String,
      recipient: String,
      assetId: String
    ): Object;
    expectFungibleTokenMintEvent(
      amount: Number,
      recipient: String,
      assetId: String
    ): Object;
    expectFungibleTokenBurnEvent(
      amount: Number,
      sender: String,
      assetId: String
    ): Object;
    expectPrintEvent(contract_identifier: string, value: string): Object;
    // Absence of test vectors at the moment - token field could present some challenges.
    expectNonFungibleTokenTransferEvent(
      token: String,
      sender: String,
      recipient: String,
      assetId: String
    ): Object;
    expectNonFungibleTokenMintEvent(
      token: String,
      recipient: String,
      assetId: String
    ): Object;
    // expectNonFungibleTokenBurnEvent(
    //   token: String,
    //   sender: String,
    //   assetId: String
    // ): Object;
    // expectEvent(sel: (e: Object) => Object): Object;
  }
}

// Array.prototype.expectPrintEvent = function (
//   contract_identifier: string,
//   value: string
// ) {
//   for (let event of this) {
//     try {
//       let e: any = {};
//       e["contract_identifier"] =
//         event.contract_event.contract_identifier.expectPrincipal(
//           contract_identifier
//         );

//       if (event.contract_event.topic.endsWith("print")) {
//         e["topic"] = event.contract_event.topic;
//       } else {
//         continue;
//       }

//       if (event.contract_event.value.endsWith(value)) {
//         e["value"] = event.contract_event.value;
//       } else {
//         continue;
//       }
//       return e;
//     } catch (error) {
//       continue;
//     }
//   }
//   throw new Error(`Unable to retrieve expected PrintEvent`);
// };

Array.prototype.expectNonFungibleTokenTransferEvent = function (
  token: String,
  sender: String,
  recipient: String,
  assetId: String
) {
  for (let event of this) {
    try {
      let e: any = {};
      e["value"] = event.nft_transfer_event.value.expectUint(token);
      e["sender"] = event.nft_transfer_event.sender.expectPrincipal(sender);
      e["recipient"] =
        event.nft_transfer_event.recipient.expectPrincipal(recipient);
      if (event.nft_transfer_event.asset_identifier.endsWith(assetId)) {
        e["asset_identifier"] = event.nft_transfer_event.asset_identifier;
      } else {
        continue;
      }
      return e;
    } catch (error) {
      continue;
    }
  }
  throw new Error(`Unable to retrieve expected NonFungibleTokenTransferEvent`);
};

Array.prototype.expectNonFungibleTokenMintEvent = function (
  token: String,
  recipient: String,
  assetId: String
) {
  for (let event of this) {
    try {
      let e: any = {};
      e["value"] = event.nft_mint_event.value.expectUint(token);
      e["recipient"] =
        event.nft_mint_event.recipient.expectPrincipal(recipient);
      if (event.nft_mint_event.asset_identifier.endsWith(assetId)) {
        e["asset_identifier"] = event.nft_mint_event.asset_identifier;
      } else {
        continue;
      }
      return e;
    } catch (error) {
      continue;
    }
  }
  throw new Error(`Unable to retrieve expected NonFungibleTokenMintEvent`);
};

// Array.prototype.expectNonFungibleTokenBurnEvent = function (
//   token: String,
//   sender: String,
//   assetId: String
// ) {
//   for (let event of this) {
//     try {
//       let e: any = {};
//       e["token"] = event.nft_burn_event.amount.expectInt(token);
//       e["sender"] = event.nft_burn_event.sender.expectPrincipal(sender);
//       if (event.nft_burn_event.asset_identifier.endsWith(assetId)) {
//         e["assetId"] = event.nft_burn_event.asset_identifier;
//       } else {
//         continue;
//       }
//       return e;
//     } catch (error) {
//       continue;
//     }
//   }
//   throw new Error(`Unable to retrieve expected NonFungibleTokenBurnEvent`);
// };

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
        200000000,
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

    block.receipts[1].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "verify-sig", pubkey: 0x02815c03f6d7181332afb1b0114f5a1c97286b6092957910ae3fab4006598aee1b, signer: 0x02815c03f6d7181332afb1b0114f5a1c97286b6092957910ae3fab4006598aee1b}`
    );
    block.receipts[1].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "collection-mint-token", meta-data-url: 0x68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e, sender: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5}`
    );
    block.receipts[1].events.expectSTXTransferEvent(
      90000000,
      wallet1.address,
      wallet2.address
    );
    block.receipts[1].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG, payer: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, saleAmount: u100000000, share: u9000000000, split: u90000000, txSender: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5}`
    );
    block.receipts[1].events.expectSTXTransferEvent(
      10000000,
      wallet1.address,
      wallet3.address
    );
    block.receipts[1].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC, payer: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, saleAmount: u100000000, share: u1000000000, split: u10000000, txSender: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5}`
    );
    block.receipts[1].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "paymint-split", mintPrice: u100000000, nftIndex: u0, payer: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, txSender: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5}`
    );
    block.receipts[1].events.expectNonFungibleTokenMintEvent(
      "0",
      wallet1.address,
      "loopbomb"
    );
    block.receipts[1].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{amount: u100000000, evt: "mint-token", nftIndex: u0, owner: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5}`
    );

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
  name: "Loopbomb - test transfer",
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
      .expectTuple();

    // wallet 1 owns nft, wallet 1 should be able to transfer
    block = chain.mineBlock([
      client.transfer(0, wallet1.address, wallet2.address, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      "0",
      wallet1.address,
      wallet2.address,
      "loopbomb"
    );

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
      .expectTuple();

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
    client
      .getApproval(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet3.address);

    // wallet 3 should be able to transfer even though wallet 2 owns the nft
    block = chain.mineBlock([
      client.transfer(0, wallet2.address, wallet4.address, wallet3.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      "0",
      wallet2.address,
      wallet4.address,
      "loopbomb"
    );

    // check wallet 4 owns nft
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet4.address);

    // check that approval has been reset
    client.getApproval(0).result.expectErr().expectUint(ErrCode.ERR_NOT_FOUND);

    // check that wallet 3 cannot transfer anymore
    block = chain.mineBlock([
      client.transfer(0, wallet4.address, wallet1.address, wallet3.address),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectTuple();
  },
});

Clarinet.test({
  name: "Loopbomb - test buy now",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      wallet3,
      wallet4,
      wallet5,
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
        1000000000,
        0,
        wallet1.address
      ),
    ]);

    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number
    block.receipts[1].result.expectOk().expectUint(0); // assert that the result of the tx was ok and the input number

    // shouldn't be able to buy now since buy now price set to 0
    block = chain.mineBlock([
      client.buyNow(
        0,
        wallet1.address,
        newAdministrator.address,
        newAdministrator.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_NOT_APPROVED_TO_SELL);

    // update sale data
    block = chain.mineBlock([
      client.setSaleData(0, 1, 0, 0, 2000000000, 10000, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{amount: u2000000000, biddingEndTime: u10000, evt: "set-sale-data", increment: u0, nftIndex: u0, reserve: u0, saleType: u1}`
    );

    // buy now
    block = chain.mineBlock([
      client.buyNow(
        0,
        wallet1.address,
        newAdministrator.address,
        newAdministrator.address
      ),
    ]);
    // todo: test events inside
    assertEquals(block.receipts[0].events.length, 11);
    block.receipts[0].events.expectSTXTransferEvent(
      1000000000,
      newAdministrator.address,
      wallet1.address
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, payer: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0, saleAmount: u2000000000, share: u5000000000, split: u1000000000, txSender: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectSTXTransferEvent(
      800000000,
      newAdministrator.address,
      wallet3.address
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC, payer: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0, saleAmount: u2000000000, share: u4000000000, split: u800000000, txSender: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectSTXTransferEvent(
      400000000,
      newAdministrator.address,
      wallet4.address
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND, payer: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0, saleAmount: u2000000000, share: u2000000000, split: u400000000, txSender: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectSTXTransferEvent(
      200000000,
      newAdministrator.address,
      wallet5.address
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB, payer: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0, saleAmount: u2000000000, share: u1000000000, split: u200000000, txSender: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "pay-royalty-primary", payee: ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB, payer: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0, saleAmount: u2000000000, share: u1000000000, split: u200000000, txSender: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{evt: "payment-split", nftIndex: u0, payer: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0, saleAmount: u2000000000, saleCycle: u1, txSender: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectPrintEvent(
      `${deployer.address}.loopbomb`,
      `{amount: u2000000000, evt: "buy-now", nftIndex: u0, owner: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, recipient: ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0}`
    );
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      "0",
      wallet1.address,
      newAdministrator.address,
      "loopbomb"
    );
  },
});

// Clarinet.test({
//   name: "Loopbomb - test bidding",
//   async fn(chain: Chain, accounts: Map<string, Account>) {
//     const {
//       administrator,
//       deployer,
//       wallet1,
//       wallet2,
//       wallet3,
//       wallet4,
//       wallet5,
//       newAdministrator,
//       client,
//     } = getWalletsAndClient(chain, accounts);

//     const sig =
//       "4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
//     const msg =
//       "53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4";
//     const hsh =
//       "4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6";
//     const url =
//       "68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e";

//     const newMintAddresses = [
//       wallet2.address,
//       wallet3.address,
//       wallet4.address,
//       wallet5.address,
//     ];
//     const newMintShares = [5000000000, 4000000000, 2000000000, 1000000000];
//     const newAddresses = [
//       wallet2.address,
//       wallet3.address,
//       wallet4.address,
//       wallet5.address,
//       wallet2.address,
//       wallet3.address,
//       wallet4.address,
//       wallet5.address,
//       wallet2.address,
//       wallet3.address,
//     ];
//     const newShares = [
//       5000000000, 4000000000, 2000000000, 1000000000, 0, 0, 0, 0, 0, 0,
//     ];
//     const newSecondaries = [
//       5000000000, 4000000000, 2000000000, 1000000000, 0, 0, 0, 0, 0, 0,
//     ];
//     let block = chain.mineBlock([
//       client.setCollectionRoyalties(
//         newMintAddresses,
//         newMintShares,
//         newAddresses,
//         newShares,
//         newSecondaries,
//         administrator.address
//       ),
//       client.collectionMintToken(
//         hexStringToArrayBuffer(sig),
//         hexStringToArrayBuffer(msg),
//         hexStringToArrayBuffer(hsh),
//         hexStringToArrayBuffer(url),
//         1,
//         0,
//         1000000000,
//         2000000000,
//         wallet1.address
//       ),
//     ]);

//     assertEquals(block.receipts.length, 2);
//     assertEquals(block.height, 2);
//     block.receipts[0].result.expectOk().expectBool(true); // assert that the result of the tx was ok and the input number
//     block.receipts[1].result.expectOk().expectUint(0); // assert that the result of the tx was ok and the input number
//   },
// });
