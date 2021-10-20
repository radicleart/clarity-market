import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { LoopbombClient, ErrCode } from "../src/loopbomb-client.ts";
import { formatBuffString, hexStringToArrayBuffer } from "../src/utils.ts";
import { assertEquals, assert } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

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

      const sig = '4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01'
      const msg = '53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4'
      const hsh = '4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6'
      const url = '68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e'

      let block = chain.mineBlock([
        Tx.contractCall('loopbomb', 'set-collection-royalties', 
        [
          types.list([
            types.principal(wallet2.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address)
          ]),
          types.list([
            types.uint(9000000000),
            types.uint(1000000000),
            types.uint(0),
            types.uint(0)
          ]),
          types.list([
            types.principal(wallet2.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address)
          ]),
          types.list([
            types.uint(9000000000),
            types.uint(1000000000),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0)
          ]),
          types.list([
            types.uint(9000000000),
            types.uint(1000000000),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0)
          ])
        ], 
        administrator.address),

        Tx.contractCall('loopbomb', 'get-collection-beneficiaries', [], administrator.address),

        Tx.contractCall('loopbomb', 'collection-mint-token', 
            [
              types.buff(hexStringToArrayBuffer(sig)),
              types.buff(hexStringToArrayBuffer(msg)),
              types.buff(hexStringToArrayBuffer(hsh)),
              types.buff(hexStringToArrayBuffer(url)),
              types.uint(1),
              types.uint(0),
              types.uint(100000000),
              types.uint(0)
            ], 
            wallet1.address),
      ]);

      console.log('block', block);

      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 2);
      assertEquals(block.receipts[0].result, "(ok true)"); // assert that the result of the tx was ok and the input number
      assert(block.receipts[1].result.indexOf("(ok ") > -1); // assert that the result of the tx was ok and the input number
      assertEquals(block.receipts[2].result, "(ok u0)"); // assert that the result of the tx was ok and the input number

      console.log('------------------------------------');
      console.log(block.receipts[0].result);
      console.log(block.receipts[1].result);
      console.log(block.receipts[2].result);
      console.log('------------------------------------');
      
      console.log(block.receipts[2].events);
  },
});

// NB for string <-> hex service - e.g. to convert meta data url to hex see https://string-functions.com/string-hex.aspx
Clarinet.test({
  name: "Loopbomb - test collection-mint-token bad signature",
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

      const sig = '5e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01'
      const msg = '53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4'
      const hsh = '4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6'
      const url = '68747470733a2f2f676169612e626c6f636b737461636b2e6f72672f6875622f31476953724c534d546d447343464d5a32616d4376755571744155356d336f3470372f393962653932346230326263646664626265326330653833333239356539303365663339613637303261666335353931633062323532363233333031303635632e6a736f6e'

      let block = chain.mineBlock([
        Tx.contractCall('loopbomb', 'set-collection-royalties', 
        [
          types.list([
            types.principal(wallet2.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address)
          ]),
          types.list([
            types.uint(9000000000),
            types.uint(1000000000),
            types.uint(0),
            types.uint(0)
          ]),
          types.list([
            types.principal(wallet2.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address),
            types.principal(wallet3.address)
          ]),
          types.list([
            types.uint(9000000000),
            types.uint(1000000000),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0)
          ]),
          types.list([
            types.uint(9000000000),
            types.uint(1000000000),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0),
            types.uint(0)
          ])
        ], 
        administrator.address),

        Tx.contractCall('loopbomb', 'get-collection-beneficiaries', [], administrator.address),

        Tx.contractCall('loopbomb', 'collection-mint-token', 
            [
              types.buff(hexStringToArrayBuffer(sig)),
              types.buff(hexStringToArrayBuffer(msg)),
              types.buff(hexStringToArrayBuffer(hsh)),
              types.buff(hexStringToArrayBuffer(url)),
              types.uint(1),
              types.uint(0),
              types.uint(100000000),
              types.uint(0)
            ], 
            wallet1.address),
      ]);

      console.log('block', block);

      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 2);
      assertEquals(block.receipts[0].result, "(ok true)"); // assert that the result of the tx was ok and the input number
      assert(block.receipts[1].result.indexOf("(ok ") > -1); // assert that the result of the tx was ok and the input number
      assertEquals(block.receipts[2].result, "(err u9)"); // assert that the result of the tx was ok and the input number

      console.log('------------------------------------');
      console.log(block.receipts[0].result);
      console.log(block.receipts[1].result);
      console.log(block.receipts[2].result);
      console.log('------------------------------------');
      
      console.log(block.receipts[2].events);
  }
});

    // "99be924b02bcdfdbbe2c0e833295e903ef39a6702afc5591c0b252623301065c",
    // "https://gaia.blockstack.org/hub/1GiSrLSMTmDsCFMZ2amCvuUqtAU5m3o4p7/99be924b02bcdfdbbe2c0e833295e903ef39a6702afc5591c0b252623301065c.json",
    // const sigBuffer = Buffer.from(data.sig, "hex");
    // const sigBuffer = bufferCV(Buffer.from(data.sig, 'hex'))
/**
Clarinet.test({
  name: "Loopbomb - test collection-mint-token",
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

    let block = await chain.mineBlock([
      client.collectionMintToken(
        formatBuffString(
          "85f75aa057dc7827f6254bb2668cb049f8517fe5443b9c1f04afd9414430313611a232c6e891b09a2d25b6bd469628abf8655ea8b018b1d2acaf64c66ae93b2201"
        ),
        formatBuffString(
          "e77844af35b77674ba98c88f297258db220890562f8dd04a04ccd47eee7180e6"
        ),
        formatBuffString(
          "a0b0d576fe5130f4bebe52745615a7252f65c095befaeda97d0a42a0138f67de"
        ), // can't use actual asset hash here??
        formatBuffString(
          "https://gaia.blockstack.org/hub/1GiSrLSMTmDsCFMZ2amCvuUqtAU5m3o4p7/99be924b02bcdfdbbe2c0e833295e903ef39a6702afc5591c0b252623301065c.json"
        ),
        1,
        1000000,
        1000000,
        1000000,
        wallet1.address
      ),
    ]);
    console.log(block.receipts);
  },
});
**/
    // console.log(block.receipts[0].events);
    // assertEquals(block.receipts.length, 1); // assert that the block received a single tx
