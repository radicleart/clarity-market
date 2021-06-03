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
  assertArrayIncludes,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";

const formatBuffString = (buffer: string) => {
  return new TextEncoder().encode(buffer);
};

Clarinet.test({
  name: "Project map tests",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // set up
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    const newAdministrator = accounts.get("wallet_3")!;
    const asset_map = chain.getAssetsMaps();

    // should return admin address and 0 app-counter
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

    // should fail insert new application if illegal storage
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-project`)),
          types.int(50),
        ],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);
    assertStringIncludes(
      block.receipts[0].result,
      "(err u102)",
      "should fail insert new application if illegal storage"
    );

    // should allow insert 2 new applications
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-gaia-project`)),
          types.int(1),
        ],
        wallet_1.address
      ),
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          types.principal(wallet_1.address),
          types.buff(
            formatBuffString(`${wallet_1.address}.my-filecoin-project`)
          ),
          types.int(2),
        ],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 4);
    assertArrayIncludes(
      block.receipts,
      [
        {
          events: [
            {
              contract_event: {
                contract_identifier:
                  "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
                topic: "print",
                value: "1",
              },
              type: "contract_event",
            },
          ],
          result: "(ok 1)",
        },
        {
          events: [
            {
              contract_event: {
                contract_identifier:
                  "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
                topic: "print",
                value: "2",
              },
              type: "contract_event",
            },
          ],
          result: "(ok 2)",
        },
      ],
      "should allow insert 2 new applications"
    );

    // should indicate 2 apps
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app-counter", [], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 5);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok 2)",
      "should indicate 2 apps"
    );

    // allow insert another 2 applications
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-upfs-project`)),
          types.int(5),
        ],
        deployer.address
      ),
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-storj-project`)),
          types.int(6),
        ],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 6);
    assertArrayIncludes(
      block.receipts,
      [
        {
          events: [
            {
              contract_event: {
                contract_identifier:
                  "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
                topic: "print",
                value: "3",
              },
              type: "contract_event",
            },
          ],
          result: "(ok 3)",
        },
        {
          events: [
            {
              contract_event: {
                contract_identifier:
                  "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
                topic: "print",
                value: "4",
              },
              type: "contract_event",
            },
          ],
          result: "(ok 4)",
        },
      ],
      "should allow 2 new applications"
    );

    // should indicate 4 apps
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app-counter", [], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 7);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok 4)",
      "should indicate 4 apps"
    );

    // should be able to get apps from map
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(0)], deployer.address),
      Tx.contractCall("appmap", "get-app", [types.int(1)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 8);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 1})",
      "should be able to get app 1 from map"
    );
    assertStringIncludes(
      block.receipts[1].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d66696c65636f696e2d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 2})",
      "should be able to get app 2 from map"
    );

    // should not be able to set apps to live if not administrator or not contract owner
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "set-app-status",
        [types.int(0), types.int(1)],
        wallet_2.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 9);
    assertStringIncludes(
      block.receipts[0].result,
      "(err u101)",
      "should not be able to set apps to live if not administrator or not contract owner"
    );

    // should be able to set apps to live if contract owner
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "set-app-status",
        [types.int(0), types.int(1)],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 10);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to set apps to live if contract owner"
    );

    // should be able to check status of app set to live
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(0)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 11);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 1, storage-model: 1})",
      "should be able to check app 1 status set to live"
    );

    // should be able to set apps to live if administrator
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "set-app-status",
        [types.int(1), types.int(1)],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 12);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to set apps to live if administrator"
    );

    // should be able to check status of app set to live
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(1)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 13);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d66696c65636f696e2d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 1, storage-model: 2})",
      "should be able to check app 2 status set to live"
    );

    // should be able to change contract administrator
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "transfer-administrator",
        [types.principal(newAdministrator.address)],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 14);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to contract administrator"
    );

    // should be able to set apps to live if administrator
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "set-app-status",
        [types.int(2), types.int(1)],
        newAdministrator.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 15);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to set apps to live if new administrator"
    );

    // should not be able to get a contract that doesn't exist
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(6)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 16);
    assertStringIncludes(
      block.receipts[0].result,
      "(err u100)",
      "should not be able to get a contract that doesn't exist"
    );

    // should be able to update app
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "update-app",
        [
          types.int(1),
          types.principal(wallet_1.address),
          types.buff(
            formatBuffString(`${wallet_1.address}.my-updated-project`)
          ),
          types.int(1),
          types.int(1),
        ],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 17);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to update app"
    );

    // should be able to get contract data
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-contract-data", [], wallet_1.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 18);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {administrator: ST21HMSJATHZ888PD0S0SSTWP4J61TCRJYEVQ0STB, appCounter: 4})",
      "should be able to get contract data"
    );

    // should be able to get app index
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "get-app-index",
        [
          types.buff(
            formatBuffString(`${wallet_1.address}.my-updated-project`)
          ),
        ],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 19);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok 1)",
      "should be able to get updated app index"
    );
  },
});
