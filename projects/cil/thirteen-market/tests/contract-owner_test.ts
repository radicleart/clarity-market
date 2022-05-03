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
const contractName = 'thirteen-mint'

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
    newAdministrator,
    client,
    events
  };
};

Clarinet.test({
  name: "Contract Owner Test - Ensure only contract owner can set new administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setAdministrator(phil.address, daisy.address),
      client.setAdministrator(phil.address, deployer.address),
      client.setAdministrator(phil.address, deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
  }
});

Clarinet.test({
  name: "Contract Owner Test - Ensure only contract owner can change admin mint pass",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setAdminMintPass(phil.address, daisy.address),
      client.setAdminMintPass(phil.address, deployer.address),
      client.setAdminMintPass(phil.address, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
  }
});

Clarinet.test({
  name: "Contract Owner Test - Ensure only contract owner can change token uri",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setTokenUri('https://address1/{id}', daisy.address),
      client.setTokenUri('https://address2/{id}', deployer.address),
      client.setTokenUri('https://address3/{id}', phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
    client.getTokenUri(111).result.expectOk().expectSome() .expectAscii('https://address2/{id}');
  }
});

Clarinet.test({
  name: "Contract Owner Test - Ensure only contract owner can freeze token uri",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, phil, daisy, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block = chain.mineBlock([
      client.setTokenUri('https://address2/{id}', deployer.address),
      client.freezeMetadata(daisy.address),
      client.freezeMetadata(deployer.address),
      client.setTokenUri('https://address3/{id}', deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ErrCode.ERR_NOT_ADMINISTRATOR);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(ErrCode.ERR_METADATA_FROZEN);
    client.getTokenUri(222).result.expectOk().expectSome() .expectAscii('https://address2/{id}');
  }
});