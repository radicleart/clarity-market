import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.10.0/index.ts";
import {
  assertEquals,
  assertStringIncludes,
  assertArrayIncludes,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";

import { AppmapClient, ErrCode } from "../src/appmap-client.ts";

const formatBuffString = (buffer: string) => {
  return new TextEncoder().encode(buffer);
};

const getWalletsAndClient = (chain: Chain, accounts: Map<string, Account>) => {
  const deployer = accounts.get("deployer")!;
  const wallet_1 = accounts.get("wallet_1")!;
  const wallet_2 = accounts.get("wallet_2")!;
  const newAdministrator = accounts.get("wallet_3")!;
  const client = new AppmapClient(chain, deployer);
  return { deployer, wallet_1, wallet_2, newAdministrator, client };
};

Clarinet.test({
  name: "Appmap - test transfer-administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should return admin address
    let currentAdministrator = client.getAdministrator();
    currentAdministrator.result
      .expectOk()
      .expectPrincipal("ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE");

    // should not be able to transfer administrator if sender not current administrator
    let block = chain.mineBlock([
      client.transferAdministrator(newAdministrator.address, wallet_1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to change contract administrator
    block = chain.mineBlock([
      client.transferAdministrator(newAdministrator.address, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should return new admin address
    currentAdministrator = client.getAdministrator();
    currentAdministrator.result
      .expectOk()
      .expectPrincipal("ST21HMSJATHZ888PD0S0SSTWP4J61TCRJYEVQ0STB");
  },
});

Clarinet.test({
  name: "Appmap - test register-app",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should return value of 0 for app counter
    let currentAppCounter = client.getAppCounter();
    currentAppCounter.result.expectOk().expectInt(0);

    // should fail insert new application if illegal storage
    let block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-project`,
        50,
        deployer.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_ILLEGAL_STORAGE);

    // should not be able to get a contract that doesn't exist
    let getAppRes = client.getApp(6);
    getAppRes.result.expectErr().expectUint(ErrCode.ERR_NOT_FOUND);

    // should allow insert 2 new applications
    block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-gaia-project`,
        1,
        wallet_1.address
      ),
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-filecoin-project`,
        2,
        wallet_1.address
      ),
    ]);

    const expectedEvent_1 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };

    const expectedEvent_2 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "2",
      },
      type: "contract_event",
    };

    assertEquals(block.receipts[0].events[0], expectedEvent_1);
    block.receipts[0].result.expectOk().expectInt(1);
    assertEquals(block.receipts[1].events[0], expectedEvent_2);
    block.receipts[1].result.expectOk().expectInt(2);

    // should indicate 2 apps
    currentAppCounter = client.getAppCounter();
    currentAppCounter.result.expectOk().expectInt(2);

    // should be able to get apps from map
    let app_1 = client.getApp(0);
    let app_2 = client.getApp(1);
    app_1.result.expectOk().expectTuple();
    app_2.result.expectOk().expectTuple();
    assertStringIncludes(
      app_1.result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 1})",
      "should be able to get app 1 from map"
    );
    assertStringIncludes(
      app_2.result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d66696c65636f696e2d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 2})",
      "should be able to get app 2 from map"
    );

    // allow insert another 2 applications
    block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-upfs-project`,
        5,
        deployer.address
      ),
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-storj-project`,
        6,
        deployer.address
      ),
    ]);
    const expectedEvent_3 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "3",
      },
      type: "contract_event",
    };

    const expectedEvent_4 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "4",
      },
      type: "contract_event",
    };

    assertEquals(block.receipts[0].events[0], expectedEvent_3);
    block.receipts[0].result.expectOk().expectInt(3);
    assertEquals(block.receipts[1].events[0], expectedEvent_4);
    block.receipts[1].result.expectOk().expectInt(4);

    // should indicate 4 apps
    currentAppCounter = client.getAppCounter();
    currentAppCounter.result.expectOk().expectInt(4);

    // can't have two apps with same contract id
    block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-upfs-project`,
        5,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to get contract data
    let contractData = client.getContractData();
    contractData.result.expectOk().expectTuple();
    assertStringIncludes(
      contractData.result,
      "(ok {administrator: ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE, appCounter: 4})",
      "should be able to get contract data"
    );
  },
});

Clarinet.test({
  name: "Appmap - test update-app",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);
    let block = chain.mineBlock([]);
    assertEquals(block.receipts.length, 0);

    // should allow insert 1 new application
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
    ]);
    assertEquals(block.receipts.length, 1);
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
      ],
      "should allow insert 1 new applications"
    );

    // should not be able to update app if index doesn't exist
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
    assertStringIncludes(
      block.receipts[0].result,
      "(err u101)",
      "should not be able to update app if index doesn't exist"
    );

    // should not be able to update app if not owner
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "update-app",
        [
          types.int(0),
          types.principal(wallet_1.address),
          types.buff(
            formatBuffString(`${wallet_1.address}.my-updated-project`)
          ),
          types.int(1),
          types.int(1),
        ],
        wallet_2.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(err u101)",
      "should not be able to update app if not owner"
    );

    // should not be able to update app if not administrator
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "update-app",
        [
          types.int(0),
          types.principal(wallet_1.address),
          types.buff(
            formatBuffString(`${wallet_1.address}.my-updated-project`)
          ),
          types.int(1),
          types.int(1),
        ],
        newAdministrator.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(err u101)",
      "should not be able to update app if not administrator"
    );

    // should be able to update app if owner
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "update-app",
        [
          types.int(0),
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-owner-project`)),
          types.int(1),
          types.int(0),
        ],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to update app if owner"
    );

    // should be able to get updated app
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(0)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d6f776e65722d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 1})",
      "should be able to get app 1 from map after owner updated"
    );

    // should be able to update app if administrator
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "update-app",
        [
          types.int(0),
          types.principal(wallet_1.address),
          types.buff(
            formatBuffString(`${wallet_1.address}.my-administrator-project`)
          ),
          types.int(1),
          types.int(0),
        ],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to update app if administrator"
    );

    // should be able to get updated app after administrator updated
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(0)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d61646d696e6973747261746f722d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 1})",
      "should be able to get app 1 from map after administrator updated"
    );

    // should not be able to change app contract id to existing app contract id
    // add a new app and try to change to the first app id
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "register-app",
        [
          types.principal(wallet_1.address),
          types.buff(formatBuffString(`${wallet_1.address}.my-second-project`)),
          types.int(1),
        ],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
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
                value: "2",
              },
              type: "contract_event",
            },
          ],
          result: "(ok 2)",
        },
      ],
      "should allow insert 1 new applications"
    );

    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "update-app",
        [
          types.int(1),
          types.principal(wallet_1.address),
          types.buff(
            formatBuffString(`${wallet_1.address}.my-administrator-project`)
          ),
          types.int(1),
          types.int(0),
        ],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(err u101)",
      "should not be able to change app contract id to an already existing app contract id"
    );

    // should be able to get app index of updated app
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "get-app-index",
        [
          types.buff(
            formatBuffString(`${wallet_1.address}.my-administrator-project`)
          ),
        ],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok 0)",
      "should be able to get updated app index"
    );
  },
});

Clarinet.test({
  name: "Appmap - test set-app-status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should allow insert 1 new application
    let block = chain.mineBlock([
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
    ]);
    assertEquals(block.receipts.length, 1);
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
      ],
      "should allow insert 1 new applications"
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
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 1, storage-model: 1})",
      "should be able to check app 1 status set to live after owner changes"
    );

    // should be able to change app status if administrator
    block = chain.mineBlock([
      Tx.contractCall(
        "appmap",
        "set-app-status",
        [types.int(0), types.int(0)],
        deployer.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok true)",
      "should be able to set apps to live if contract owner"
    );

    // should be able to check status of app set to not live
    block = chain.mineBlock([
      Tx.contractCall("appmap", "get-app", [types.int(0)], deployer.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertStringIncludes(
      block.receipts[0].result,
      "(ok {app-contract-id: 0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374, owner: ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK, status: 0, storage-model: 1})",
      "should be able to check app 1 status set to not live after administrator changes"
    );
  },
});
