import {
  Clarinet,
  Chain,
  types,
  Account
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { ContractClient, ErrCode } from "./src/contract-client.ts";
import { CustomEventsClient } from "./src/custom-events-client.ts";

const nonFungibleName = 'artwork-token'
const fungibleName = 'edition-token'
const contractName = 'editions-013'

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  administrator: Account;
  deployer: Account;
  tokenStacks: string;
  phil: Account;
  daisy: Account;
  bobby: Account;
  hunter: Account;
  newAdministrator: Account;
  client: ContractClient;
  events: CustomEventsClient;
} => {
  const administrator = accounts.get("deployer")!;
  const deployer = accounts.get("deployer")!;
  const tokenStacks = accounts.get("deployer")!.address + '.unwrapped-stx-token';
  const phil = accounts.get("wallet_1")!;
  const daisy = accounts.get("wallet_2")!;
  const bobby = accounts.get("wallet_3")!;
  const hunter = accounts.get("wallet_4")!;
  const newAdministrator = accounts.get("wallet_6")!;
  const client = new ContractClient(chain, deployer, contractName);
  const events = new CustomEventsClient();
  return {
    administrator,
    deployer,
    tokenStacks,
    phil,
    daisy,
    bobby,
    hunter,
    newAdministrator,
    client,
    events
  };
};

// -- check simple constraints for the 4 variatios of transfer ---------------------
Clarinet.test({
  name: "Transfer Test - Ensure can't transfer if no balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.transfer(1, 1, phil.address, daisy.address, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(116); // id 1 not owned
  }
});

Clarinet.test({
  name: "Transfer Test - Ensure contract owner can't transfer if not owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);
    block = chain.mineBlock([
      client.transfer(1, 1, phil.address, daisy.address, deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
    block = chain.mineBlock([
      client.transfer(1, 1001, phil.address, daisy.address, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(116);
  }
});

Clarinet.test({
  name: "Transfer Test - Ensure can't transfer with memo if no balance or not owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);
    block = chain.mineBlock([
      client.transferMemo(1, 1, phil.address, daisy.address, "hallo", deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
    block = chain.mineBlock([
      client.transferMemo(1, 1001, phil.address, daisy.address, "hallo", phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(116);
  }
});

Clarinet.test({
  name: "Transfer Test - Ensure contract owner can't transfer with memo if not owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.transferMemo(1, 1, phil.address, daisy.address, "hallo", deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
  }
});

Clarinet.test({
  name: "Transfer Test - Ensure can't transfer many if no balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 10, amount: 25, owner: phil.address, recipient: daisy.address },
      { 'token-id': 20, amount: 25, owner: phil.address, recipient: daisy.address }
    ]
    let block = chain.mineBlock([
      client.transferMany(entries, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(116);
  }
});

Clarinet.test({
  name: "Transfer Test - Ensure can't transfer many with memo if insufficient funds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient( chain, accounts);
    const entriesMint = [
      { 'token-id': 10, amount: 25, recipient: phil.address },
      { 'token-id': 20, amount: 20, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entriesMint, deployer.address),
    ]);
    const entries = [
      { 'token-id': 10, amount: 25, owner: phil.address, recipient: daisy.address, memo: "message 1" },
      { "token-id": 20, amount: 25, owner: phil.address, recipient: daisy.address, memo: "message 2" }
    ]
    block = chain.mineBlock([
      client.transferManyMemo(entries, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(116);
  }
});
// -- end check constraints for the 4 variatios of transfer --------------------------------------------



// -- check transfers ---------------------
Clarinet.test({
  name: "Transfer Test - Ensure can mint to Phil and Phil can transfer half to daisy",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    client.getBalance(1, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(0);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(1000);
    client.getOverallSupply().result.expectOk().expectUint(1000);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    // console.log(block.receipts[1].events)
    // check the events make sense
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 1)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 1)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 1)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)

    block = chain.mineBlock([
      client.transfer(1, 500, phil.address, daisy.address, phil.address),
    ]);

    client.getBalance(1, phil.address).result.expectOk().expectUint(500);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(500);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(500);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(500);
    client.getOverallSupply().result.expectOk().expectUint(1000);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    // check the events make sense
    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 1)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 2)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 1)
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 1)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)

  }
});

Clarinet.test({
  name: "Transfer Test - Ensure can mint several tokens to Phil and Phil can transfer 3 at a time to daisy",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address },
      { 'token-id': 500, amount: 1000, recipient: phil.address },
      { 'token-id': 1000, amount: 1000, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    client.getBalance(1, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(500, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(0);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(3000);
    client.getOverallSupply().result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    client.getTotalSupply(500).result.expectOk().expectUint(1000);
    client.getTotalSupply(1000).result.expectOk().expectUint(1000);
    // check the events make sense
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 3)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 3)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 3)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)

    const transferEntries = [
      { 'token-id': 1, amount: 10, owner: phil.address, recipient: daisy.address, memo: 'message 1' },
      { 'token-id': 500, amount: 10, owner: phil.address, recipient: daisy.address, memo: 'message 2' },
      { 'token-id': 1000, amount: 1000, owner: phil.address, recipient: daisy.address, memo: 'message 3' }
    ]
    block = chain.mineBlock([
      client.transferManyMemo(transferEntries, phil.address),
    ]);

    client.getBalance(1, phil.address).result.expectOk().expectUint(990);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(10);
    client.getBalance(500, phil.address).result.expectOk().expectUint(990);
    client.getBalance(500, daisy.address).result.expectOk().expectUint(10);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(0);
    client.getBalance(1000, daisy.address).result.expectOk().expectUint(1000);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(1980);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(1020);
    client.getOverallSupply().result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    client.getTotalSupply(500).result.expectOk().expectUint(1000);
    client.getTotalSupply(1000).result.expectOk().expectUint(1000);
    // check the events make sense
    // console.log(block.receipts[1].events)
    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 3)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 6)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 6) // the memo and the sft event are printed
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 3)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
  }
});

Clarinet.test({
  name: "Transfer Test - Ensure can't transfer more than you own in a transfer many",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address },
      { 'token-id': 500, amount: 1000, recipient: phil.address },
      { 'token-id': 1000, amount: 1000, recipient: phil.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    client.getBalance(1, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(500, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(0);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(3000);
    client.getOverallSupply().result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    client.getTotalSupply(500).result.expectOk().expectUint(1000);
    client.getTotalSupply(1000).result.expectOk().expectUint(1000);
    // console.log(block.receipts[1].events)
    // check the events make sense
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 3)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 3)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 3)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)

    const transferEntries = [
      { 'token-id': 1, amount: 10, owner: phil.address, recipient: daisy.address, memo: 'message 1' },
      { 'token-id': 500, amount: 10, owner: phil.address, recipient: daisy.address, memo: 'message 2' },
      { 'token-id': 1000, amount: 1001, owner: phil.address, recipient: daisy.address, memo: 'message 3' }
    ]
    block = chain.mineBlock([
      client.transferManyMemo(transferEntries, phil.address),
    ]);

    client.getBalance(1, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(0);
    client.getBalance(500, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(500, daisy.address).result.expectOk().expectUint(0);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1000, daisy.address).result.expectOk().expectUint(0);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(0);
    client.getOverallSupply().result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(1000);
    client.getTotalSupply(500).result.expectOk().expectUint(1000);
    client.getTotalSupply(1000).result.expectOk().expectUint(1000);
    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 0) // the memo and the sft event are printed
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)
  }
});

Clarinet.test({
  name: "Transfer Test - transfer many to many in single tx",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, hunter, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address },
      { 'token-id': 1, amount: 1000, recipient: daisy.address },
      { 'token-id': 1, amount: 1000, recipient: hunter.address },
      { 'token-id': 500, amount: 1000, recipient: phil.address },
      { 'token-id': 500, amount: 1000, recipient: daisy.address },
      { 'token-id': 500, amount: 1000, recipient: hunter.address },
      { 'token-id': 1000, amount: 1000, recipient: phil.address },
      { 'token-id': 1000, amount: 1000, recipient: daisy.address },
      { 'token-id': 1000, amount: 1000, recipient: hunter.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    client.getBalance(1, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(1000);
    client.getBalance(1, hunter.address).result.expectOk().expectUint(1000);
    client.getBalance(500, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(500, daisy.address).result.expectOk().expectUint(1000);
    client.getBalance(500, hunter.address).result.expectOk().expectUint(1000);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(1000);
    client.getBalance(1000, daisy.address).result.expectOk().expectUint(1000);
    client.getBalance(1000, hunter.address).result.expectOk().expectUint(1000);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(hunter.address).result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(3000);
    client.getTotalSupply(500).result.expectOk().expectUint(3000);
    client.getTotalSupply(1000).result.expectOk().expectUint(3000);
    client.getOverallSupply().result.expectOk().expectUint(9000);
    // console.log(block.receipts[1].events)
    // check the events make sense
    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 9)
    events.expectEventCount(block.receipts[1].events, 'ft_transfer_event', 0)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 9)
    events.expectEventCount(block.receipts[1].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 9)
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)

    const transferEntries1 = [
      { 'token-id': 1, amount: 500, owner: phil.address, recipient: daisy.address },
      { 'token-id': 1, amount: 500, owner: phil.address, recipient: hunter.address }
    ]
    const transferEntries2 = [
      { 'token-id': 500, amount: 500, owner: daisy.address, recipient: phil.address },
      { 'token-id': 500, amount: 500, owner: daisy.address, recipient: hunter.address }
    ]
    const transferEntries3 = [
      { 'token-id': 1000, amount: 500, owner: hunter.address, recipient: phil.address },
      { 'token-id': 1000, amount: 500, owner: hunter.address, recipient: daisy.address }
    ]
    block = chain.mineBlock([
      client.transferMany(transferEntries1, phil.address),
      client.transferMany(transferEntries2, daisy.address),
      client.transferMany(transferEntries3, hunter.address)
    ]);

    client.getBalance(1, phil.address).result.expectOk().expectUint(0);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(1500);
    client.getBalance(1, hunter.address).result.expectOk().expectUint(1500);
    client.getBalance(500, phil.address).result.expectOk().expectUint(1500);
    client.getBalance(500, daisy.address).result.expectOk().expectUint(0);
    client.getBalance(500, hunter.address).result.expectOk().expectUint(1500);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(1500);
    client.getBalance(1000, daisy.address).result.expectOk().expectUint(1500);
    client.getBalance(1000, hunter.address).result.expectOk().expectUint(0);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(hunter.address).result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(3000);
    client.getTotalSupply(500).result.expectOk().expectUint(3000);
    client.getTotalSupply(1000).result.expectOk().expectUint(3000);
    client.getOverallSupply().result.expectOk().expectUint(9000);
    events.expectEventCount(block.receipts[0].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[0].events, 'ft_transfer_event', 2)
    events.expectEventCount(block.receipts[0].events, 'nft_mint_event', 4)
    events.expectEventCount(block.receipts[0].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[0].events, 'contract_event', 2) // the memo and the sft event are printed
    events.expectEventCount(block.receipts[0].events, 'nft_burn_event', 4)
    events.expectEventCount(block.receipts[0].events, 'ft_burn_event', 0)

    events.expectEventCount(block.receipts[1].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[1].events, 'ft_transfer_event', 2)
    events.expectEventCount(block.receipts[1].events, 'nft_mint_event', 4)
    events.expectEventCount(block.receipts[1].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[1].events, 'contract_event', 2) // the memo and the sft event are printed
    events.expectEventCount(block.receipts[1].events, 'nft_burn_event', 4)
    events.expectEventCount(block.receipts[1].events, 'ft_burn_event', 0)

    events.expectEventCount(block.receipts[2].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[2].events, 'ft_transfer_event', 2)
    events.expectEventCount(block.receipts[2].events, 'nft_mint_event', 4)
    events.expectEventCount(block.receipts[2].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[2].events, 'contract_event', 2) // the memo and the sft event are printed
    events.expectEventCount(block.receipts[2].events, 'nft_burn_event', 4)
    events.expectEventCount(block.receipts[2].events, 'ft_burn_event', 0)
  }
});

Clarinet.test({
  name: "Transfer Test - can't transfer many to many in single tx with approvals",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, hunter, client, events } = getWalletsAndClient(
      chain,
      accounts
    );
    const entries = [
      { 'token-id': 1, amount: 1000, recipient: phil.address },
      { 'token-id': 1, amount: 1000, recipient: daisy.address },
      { 'token-id': 1, amount: 1000, recipient: hunter.address },
      { 'token-id': 500, amount: 1000, recipient: phil.address },
      { 'token-id': 500, amount: 1000, recipient: daisy.address },
      { 'token-id': 500, amount: 1000, recipient: hunter.address },
      { 'token-id': 1000, amount: 1000, recipient: phil.address },
      { 'token-id': 1000, amount: 1000, recipient: daisy.address },
      { 'token-id': 1000, amount: 1000, recipient: hunter.address }
    ]
    let block = chain.mineBlock([
      client.setAdminMintPass(deployer.address, deployer.address),
      client.adminMintMany(entries, deployer.address),
    ]);

    const transferEntries = [
      { 'token-id': 1, amount: 500, owner: phil.address, recipient: daisy.address },
      { 'token-id': 1, amount: 500, owner: phil.address, recipient: hunter.address },
      { 'token-id': 500, amount: 500, owner: daisy.address, recipient: phil.address },
      { 'token-id': 500, amount: 500, owner: daisy.address, recipient: hunter.address },
      { 'token-id': 1000, amount: 500, owner: hunter.address, recipient: phil.address },
      { 'token-id': 1000, amount: 500, owner: hunter.address, recipient: daisy.address }
    ]
    block = chain.mineBlock([
      client.setApproved(1, phil.address, true, daisy.address),
      client.setApproved(500, phil.address, true, daisy.address),
      client.setApproved(1000, phil.address, true, daisy.address),
      client.setApproved(1, phil.address, true, hunter.address),
      client.setApproved(500, phil.address, true, hunter.address),
      client.setApproved(1000, phil.address, true, hunter.address),
      client.transferMany(transferEntries, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectBool(true);
    block.receipts[6].result.expectErr().expectUint(401);
/**
    client.getBalance(1, phil.address).result.expectOk().expectUint(0);
    client.getBalance(1, daisy.address).result.expectOk().expectUint(1500);
    client.getBalance(1, hunter.address).result.expectOk().expectUint(1500);
    client.getBalance(500, phil.address).result.expectOk().expectUint(1500);
    client.getBalance(500, daisy.address).result.expectOk().expectUint(0);
    client.getBalance(500, hunter.address).result.expectOk().expectUint(1500);
    client.getBalance(1000, phil.address).result.expectOk().expectUint(1500);
    client.getBalance(1000, daisy.address).result.expectOk().expectUint(1500);
    client.getBalance(1000, hunter.address).result.expectOk().expectUint(0);
    client.getOverallBalance(phil.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(daisy.address).result.expectOk().expectUint(3000);
    client.getOverallBalance(hunter.address).result.expectOk().expectUint(3000);
    client.getTotalSupply(1).result.expectOk().expectUint(3000);
    client.getTotalSupply(500).result.expectOk().expectUint(3000);
    client.getTotalSupply(1000).result.expectOk().expectUint(3000);
    client.getOverallSupply().result.expectOk().expectUint(9000);
    events.expectEventCount(block.receipts[6].events, 'ft_mint_event', 0)
    events.expectEventCount(block.receipts[6].events, 'ft_transfer_event', 6)
    events.expectEventCount(block.receipts[6].events, 'nft_mint_event', 12)
    events.expectEventCount(block.receipts[6].events, 'nft_transfer_event', 0)
    events.expectEventCount(block.receipts[6].events, 'contract_event', 6) // the memo and the sft event are printed
    events.expectEventCount(block.receipts[6].events, 'nft_burn_event', 12)
    events.expectEventCount(block.receipts[6].events, 'ft_burn_event', 0)
    **/
  }
});

// -- end check transfers ---------------------
