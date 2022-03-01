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
  name: "Mint Test - Ensure commission can be set",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, tokenStacks, commission1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 0, mintAddress1, mintAddress2, 40, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 1000000, mintAddress1, mintAddress2, 40, wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);

    // third time lucky
    block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 1000000, mintAddress1, mintAddress2, 40, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can mint in Stacks with zero price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, tokenStacks, commission1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 0, mintAddress1, mintAddress2, 40, deployer.address),
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientV2.mintWith(tokenStacks, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk();
    assertEquals(block.receipts[2].events.length, 1);
    block.receipts[2].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.indige`,
      "indige"
    );
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can mint in Stacks with non zero price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, tokenStacks, commission1, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      clientV2.setMintCommission(tokenStacks, 100000000, mintAddress1, mintAddress2, 4, deployer.address),
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientV2.mintWith(tokenStacks, wallet1.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk().expectUint(1);
    assertEquals(block.receipts[2].events.length, 5);
    // console.log(block.receipts[2].events)
    block.receipts[2].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.indige`,
      "indige"
    );
    block.receipts[2].events.expectSTXTransferEvent(
      99960000,
      wallet1.address,
      mintAddress1
    );
    block.receipts[2].events.expectSTXTransferEvent(
      40000,
      wallet1.address,
      mintAddress2
    );
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can't mint in non existent token",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {deployer, tokenBitcoin, wallet1, clientWrappedBitcoin, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);
    let block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientWrappedBitcoin.mintWrappedBitcoin(1000, wallet1.address, wallet1.address),
      clientV2.mintWith(tokenBitcoin, wallet1.address)
    ]);
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(1000);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(113);
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can mint in wrapped bitcoin token with zero price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {deployer, tokenBitcoin, wallet1, clientWrappedBitcoin, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);
    let block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientWrappedBitcoin.mintWrappedBitcoin(1000, wallet1.address, wallet1.address),
      clientV2.setMintCommission(tokenBitcoin, 0, mintAddress1, mintAddress2, 40, deployer.address),
      clientV2.mintWith(tokenBitcoin, wallet1.address)
    ]);
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(1000);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    assertEquals(block.receipts[3].events.length, 1);
    block.receipts[3].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.indige`,
      "indige"
    );
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can mint in wrapped bitcoin token with non zero price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {deployer, tokenBitcoin, wallet1, clientWrappedBitcoin, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);
    let block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientWrappedBitcoin.mintWrappedBitcoin(1000, wallet1.address, wallet1.address),
      clientV2.setMintCommission(tokenBitcoin, 100, mintAddress1, mintAddress2, 4000, deployer.address),
      clientV2.mintWith(tokenBitcoin, wallet1.address)
    ]);
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(900);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    assertEquals(block.receipts[3].events.length, 5);
    block.receipts[3].events.expectFungibleTokenTransferEvent(
      60,
      wallet1.address,
      mintAddress1,
      `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
    );

    block.receipts[3].events.expectFungibleTokenTransferEvent(
      40,
      wallet1.address,
      mintAddress2,
      `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
    );

    block.receipts[3].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.indige`,
      "indige"
    );
  }
});

Clarinet.test({
  name: "Mint Test - Ensure can mint in two wrapped tokens in same contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {deployer, tokenDiko, tokenBitcoin, wallet1, wallet2, clientWrappedDiko, clientWrappedBitcoin, clientV2 } = getWalletsAndClient(
      chain,
      accounts
    );
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(0);
    let block = chain.mineBlock([
      clientWrappedBitcoin.mintWrappedBitcoin(1000, wallet1.address, wallet1.address),
      clientWrappedDiko.mintWrappedDiko(1000, wallet2.address, wallet2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    
    block = chain.mineBlock([
      clientV2.setMintPass(wallet1.address, 5, deployer.address),
      clientV2.setMintPass(wallet2.address, 5, deployer.address),
      clientV2.setMintCommission(tokenDiko, 100, mintAddress1, mintAddress2, 5000, deployer.address),
      clientV2.setMintCommission(tokenBitcoin, 100, mintAddress1, mintAddress2, 4000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);

    block = chain.mineBlock([
      clientV2.mintWith(tokenBitcoin, wallet1.address),
      clientV2.mintWith(tokenDiko, wallet2.address)
    ]);
    clientWrappedBitcoin.getBalance(wallet1.address, wallet1).result.expectOk().expectUint(900);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectUint(2);
    assertEquals(block.receipts[0].events.length, 5);
    assertEquals(block.receipts[1].events.length, 5);
    block.receipts[0].events.expectFungibleTokenTransferEvent(
      60,
      wallet1.address,
      mintAddress1,
      `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
    );

    block.receipts[0].events.expectFungibleTokenTransferEvent(
      40,
      wallet1.address,
      mintAddress2,
      `${deployer.address}.Wrapped-Bitcoin::wrapped-bitcoin`
    );

    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet1.address,
      `${deployer.address}.indige`,
      "indige"
    );

    block.receipts[1].events.expectFungibleTokenTransferEvent(
      50,
      wallet2.address,
      mintAddress1,
      `${deployer.address}.arkadiko-token::diko`
    );

    block.receipts[1].events.expectFungibleTokenTransferEvent(
      50,
      wallet2.address,
      mintAddress2,
      `${deployer.address}.arkadiko-token::diko`
    );

    block.receipts[1].events.expectNonFungibleTokenMintEvent(
      types.uint(2),
      wallet2.address,
      `${deployer.address}.indige`,
      "indige"
    );
  }
});

