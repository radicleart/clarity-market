import {
  Clarinet,
  Chain,
  types,
  Account
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { IndigeClient, ErrCode } from "../../../../src/risidio-indige-client.ts";
import { WrappedBitcoin } from "../../../../src/wrapped-bitcoin-client.ts";
import { WrappedDiko } from "../../../../src/wrapped-diko-client.ts";

const mintAddress1 = "SP2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1KVFJ21";
const mintAddress2 = "SP132K8CVJ9B2GEDHTQS5MH3N7BR5QDMN1PXVS8MY";

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
  clientWrappedDiko: WrappedDiko;
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

Clarinet.test({
  name: "Mint Test - wallet2 cannot self approve to transfer wallet1 asset",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, tokenStacks, commission1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 100000000, mintAddress1, mintAddress2, 4, deployer.address),
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientV2.mintWith(tokenStacks, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk().expectUint(1);
    assertEquals(block.receipts[2].events.length, 5);
    // console.log(block.receipts[2].events)
    block = chain.mineBlock([
      clientV2.setApproved(1, wallet2.address, true, wallet2.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    clientV2.getListingInToken(1).result.expectNone();
    // list for 100 stx
    block = chain.mineBlock([
      clientV2.listInToken(1, 100000000, commission1, tokenStacks, wallet2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(402);
    clientV2.getListingInToken(1).result.expectNone();
    block = chain.mineBlock([
      clientV2.transfer(1, wallet1.address, wallet2.address, wallet2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
  }
});

Clarinet.test({
  name: "Mint Test - wallet1 can approve wallet2 to transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, tokenStacks, commission1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 100000000, mintAddress1, mintAddress2, 4, deployer.address),
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientV2.mintWith(tokenStacks, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk().expectUint(1);
    assertEquals(block.receipts[2].events.length, 5);
    // console.log(block.receipts[2].events)
    block = chain.mineBlock([
      clientV2.setApproved(1, wallet2.address, true, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    clientV2.getListingInToken(1).result.expectNone();
    // wallet2 cant list but can now transfer
    block = chain.mineBlock([
      clientV2.listInToken(1, 100000000, commission1, tokenStacks, wallet2.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(402);
    block = chain.mineBlock([
      clientV2.transfer(1, wallet1.address, wallet2.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    // wallet1 is no longer the owner
    clientV2.getOwner(1).result.expectOk().expectSome().expectPrincipal(wallet2.address);
  }
});

Clarinet.test({
  name: "Mint Test - wallet1 can approve wallet2 to transfer all assets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, tokenStacks, commission1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 100000000, mintAddress1, mintAddress2, 4, deployer.address),
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk();
    block = chain.mineBlock([
      clientV2.mintWith(tokenStacks, wallet1.address),
      clientV2.mintWith(tokenStacks, wallet1.address),
      clientV2.mintWith(tokenStacks, wallet1.address),
      clientV2.mintWith(tokenStacks, wallet1.address),
      clientV2.mintWith(tokenStacks, wallet1.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectUint(2);
    block.receipts[2].result.expectOk().expectUint(3);
    block.receipts[3].result.expectOk().expectUint(4);
    block.receipts[4].result.expectOk().expectUint(5);
    // console.log(block.receipts[2].events)
    // check if approved for 1 can't transfer 2
    block = chain.mineBlock([
      clientV2.setApproved(1, wallet2.address, true, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([
      clientV2.transfer(2, wallet1.address, wallet2.address, wallet2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
    // wallet1 is no longer the owner
    block = chain.mineBlock([
      clientV2.setApproved(1, wallet2.address, false, wallet1.address),
      clientV2.setApprovedAll(wallet2.address, false, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    // check no longer approved to transfer 1
    block = chain.mineBlock([
      clientV2.transfer(1, wallet1.address, wallet2.address, wallet2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
    // approve all doesnt impact approve single - see line 181 wallet2 is NOT approved for asset 1
    block = chain.mineBlock([
      clientV2.setApprovedAll(wallet2.address, true, wallet1.address),
      clientV2.transfer(1, wallet1.address, wallet2.address, wallet2.address),
      clientV2.transfer(2, wallet1.address, wallet2.address, wallet2.address),
      clientV2.transfer(3, wallet1.address, wallet2.address, wallet2.address),
      clientV2.transfer(4, wallet1.address, wallet2.address, wallet2.address),
      clientV2.transfer(5, wallet1.address, wallet2.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(401);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectBool(true);
    clientV2.getOwner(1).result.expectOk().expectSome().expectPrincipal(wallet1.address);
    clientV2.getOwner(2).result.expectOk().expectSome().expectPrincipal(wallet2.address);
    clientV2.getOwner(3).result.expectOk().expectSome().expectPrincipal(wallet2.address);
    clientV2.getOwner(4).result.expectOk().expectSome().expectPrincipal(wallet2.address);
    clientV2.getOwner(5).result.expectOk().expectSome().expectPrincipal(wallet2.address);
  }
});

