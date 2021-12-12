import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { formatBuffString, hexStringToArrayBuffer } from "../src/utils.ts";
import { CrashPunksV1Client } from "../src/crashpunks-v1-client.ts";
import { CrashPunksV2Client } from "../src/crashpunks-v2-client.ts";

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
  clientV2: CrashPunksV2Client;
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
  const clientV1 = new CrashPunksV1Client(chain, deployer);
  const clientV2 = new CrashPunksV2Client(chain, deployer);
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

const mintV1Token = (chain: Chain, accounts: Map<string, Account>) => {
  const {
    administrator,
    deployer,
    wallet1,
    wallet2,
    wallet3,
    newAdministrator,
    clientV1,
  } = getWalletsAndClient(chain, accounts);

  const sig =
    "4e53f47a3583c00bc49b54bdaff0ca544c55d3a1872c87abe606e20264518744b9a0710ec247b208672850bf1c2f99b1712290cd414ba7737460394564b56cdd01";
  const msg =
    "53f5924a377df35f12ad40630ca720496c4f9061c31469fef5789e17b09dfcd4";
  const hsh =
    "4123b04d3e2bf6133bb5b36d7508f3d0099eced4a62174904f3f66a0fc2092d6";
  const url =
    "https://gaia.blockstack.org/hub/1MNnYMskXjRmQU6m6sFMBe6a7xVdMvH9dp/to_the_machine_eternal/bob_jaroc/72ba02ef43182ddcb5ccb385b36001e4b41051d50e84d21435d494a732715181.json";

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
    clientV1.setCollectionRoyalties(
      newMintAddresses,
      newMintShares,
      newAddresses,
      newShares,
      newSecondaries,
      administrator.address
    ),
    clientV1.collectionMintToken(
      hexStringToArrayBuffer(sig),
      hexStringToArrayBuffer(msg),
      hexStringToArrayBuffer(hsh),
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
  name: "Ensure can upgrade v1 -> v2",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      administrator,
      deployer,
      wallet1,
      wallet2,
      newAdministrator,
      clientV2,
    } = getWalletsAndClient(chain, accounts);

    mintV1Token(chain, accounts);

    let block = chain.mineBlock([clientV2.upgradeV1ToV2(0, wallet1.address)]);
    console.log(block);
  },
});
