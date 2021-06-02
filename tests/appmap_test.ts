import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.6.0/index.ts";
import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";

const formatBuffString = (buffer: string) => {
  return new TextEncoder().encode(buffer);
};

Clarinet.test({
  name: "Project map tests",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    const asset_map = chain.getAssetsMaps();

    let block = chain.mineBlock([
      Tx.contractCall("appmap", "get-administrator", [], deployer.address),
      Tx.contractCall("appmap", "get-app-counter", [], deployer.address),
    ]);

    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);

    assertStringIncludes(
      block.receipts[0].result,
      "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE",
      "should return the admin address"
    );

    assertStringIncludes(
      block.receipts[1].result,
      "(ok 0)",
      "should return initial value of 0 for app-counter (indicates zero apps)"
    );

    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          // unable to make this mijoco.id.blockstack
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-project`)),
          types.int(50),
        ],
        deployer.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);
    // assertStringIncludes(
    //   block.receipts[0].result,
    //   "(err u102)",
    //   "should fail insert new application if illegal storage"
    // );

    // block = chain.mineBlock([
    //   Tx.contractCall(
    //     "appmap",
    //     "register-app",
    //     [
    //       // unable to make this mijoco.id.blockstack
    //       types.principal(
    //         "mijoco.id.blockstackmijoco.id.blockstackmijoco.id.blockstackmijoco.id.blockstackmijoco.id.blockstackijoco.id.blockstackmijoco.id.blockstack"
    //       ),
    //       types.buff(formatBuffString(`${wallet_1.address}.my-project`)),
    //       types.int(50),
    //     ],
    //     deployer.address
    //   ),
    // ]);
    // assertEquals(block.receipts.length, 1);
    // assertEquals(block.height, 4);
    // assertStringIncludes(
    //   block.receipts[0].result,
    //   "(err u102)",
    //   "should fail insert new application if owner more than 80 chars"
    // );
  },
});
