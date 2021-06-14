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

const getWalletsAndClient = (
  chain: Chain,
  accounts: Map<string, Account>
): {
  deployer: Account;
  wallet1: Account;
  wallet2: Account;
  newAdministrator: Account;
  client: AppmapClient;
} => {
  const deployer = accounts.get("deployer")!;
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;
  const newAdministrator = accounts.get("wallet_3")!;
  const client = new AppmapClient(chain, deployer);
  return { deployer, wallet1, wallet2, newAdministrator, client };
};

Clarinet.test({
  name: "Appmap - test transfer-administrator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should return admin address
    let currentAdministrator = client.getAdministrator();
    currentAdministrator.result
      .expectOk()
      .expectPrincipal("ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE");

    // should not be able to transfer administrator if sender not current administrator
    let block = chain.mineBlock([
      client.transferAdministrator(newAdministrator.address, wallet1.address),
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
    const { deployer, wallet1, wallet2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should return value of 0 for app counter
    let currentAppCounter = client.getAppCounter();
    currentAppCounter.result.expectOk().expectInt(0);

    // should fail insert new application if illegal storage
    let block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-project`,
        50,
        deployer.address
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_ILLEGAL_STORAGE);

    // should not be able to get a contract that doesn't exist
    const getAppRes = client.getApp(6);
    getAppRes.result.expectErr().expectUint(ErrCode.ERR_NOT_FOUND);

    // should allow insert 2 new applications
    block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-gaia-project`,
        1,
        wallet1.address
      ),
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-filecoin-project`,
        2,
        wallet1.address
      ),
    ]);

    const expectedEvent1 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };

    const expectedEvent2 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "2",
      },
      type: "contract_event",
    };

    assertEquals(block.receipts[0].events[0], expectedEvent1);
    block.receipts[0].result.expectOk().expectInt(1);
    assertEquals(block.receipts[1].events[0], expectedEvent2);
    block.receipts[1].result.expectOk().expectInt(2);

    // should indicate 2 apps
    currentAppCounter = client.getAppCounter();
    currentAppCounter.result.expectOk().expectInt(2);

    // should be able to get apps from map
    const app1 = client.getApp(0);
    const app2 = client.getApp(1);
    const appTuple1 = app1.result.expectOk().expectTuple();
    const appTuple2 = app2.result.expectOk().expectTuple();

    const appExpectedTuple1 = {
      "app-contract-id":
        "0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374",
      owner: "ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK",
      status: "0",
      "storage-model": "1",
    };
    assertEquals(appTuple1, appExpectedTuple1);

    const appExpectedTuple2 = {
      "app-contract-id":
        "0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d66696c65636f696e2d70726f6a656374",
      owner: "ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK",
      status: "0",
      "storage-model": "2",
    };
    assertEquals(appTuple2, appExpectedTuple2);

    // allow insert another 2 applications
    block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-upfs-project`,
        5,
        deployer.address
      ),
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-storj-project`,
        6,
        deployer.address
      ),
    ]);
    const expectedEvent3 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "3",
      },
      type: "contract_event",
    };

    const expectedEvent4 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "4",
      },
      type: "contract_event",
    };

    assertEquals(block.receipts[0].events[0], expectedEvent3);
    block.receipts[0].result.expectOk().expectInt(3);
    assertEquals(block.receipts[1].events[0], expectedEvent4);
    block.receipts[1].result.expectOk().expectInt(4);

    // should indicate 4 apps
    currentAppCounter = client.getAppCounter();
    currentAppCounter.result.expectOk().expectInt(4);

    // can't have two apps with same contract id
    block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-upfs-project`,
        5,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to get contract data
    const contractData = client.getContractData();
    const contractDataTuple = contractData.result.expectOk().expectTuple();
    const expectedContractDataTuple = {
      administrator: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE",
      appCounter: "4",
    };
    assertEquals(contractDataTuple, expectedContractDataTuple);
  },
});

Clarinet.test({
  name: "Appmap - test update-app",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should allow insert 1 new application
    let block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-gaia-project`,
        1,
        wallet1.address
      ),
    ]);
    const expectedEvent1 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };
    assertEquals(block.receipts[0].events[0], expectedEvent1);
    block.receipts[0].result.expectOk().expectInt(1);

    // should not be able to update app if index doesn't exist
    block = chain.mineBlock([
      client.updateApp(
        1,
        wallet1.address,
        `${wallet1.address}.my-updated-project`,
        1,
        1,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should not be able to update app if not owner or administrator
    block = chain.mineBlock([
      client.updateApp(
        0,
        wallet1.address,
        `${wallet1.address}.my-updated-project`,
        1,
        1,
        wallet2.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to update app if owner
    block = chain.mineBlock([
      client.updateApp(
        0,
        wallet1.address,
        `${wallet1.address}.my-owner-project`,
        1,
        0,
        wallet1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to get updated app
    let app1 = client.getApp(0);
    let appTuple1 = app1.result.expectOk().expectTuple();

    let appExpectedTuple1 = {
      "app-contract-id":
        "0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d6f776e65722d70726f6a656374",
      owner: "ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK",
      status: "0",
      "storage-model": "1",
    };
    assertEquals(appTuple1, appExpectedTuple1);

    // should be able to update app if administrator
    block = chain.mineBlock([
      client.updateApp(
        0,
        wallet1.address,
        `${wallet1.address}.my-administrator-project`,
        1,
        0,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to get updated app after administrator updated
    app1 = client.getApp(0);
    appTuple1 = app1.result.expectOk().expectTuple();

    appExpectedTuple1 = {
      "app-contract-id":
        "0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d61646d696e6973747261746f722d70726f6a656374",
      owner: "ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK",
      status: "0",
      "storage-model": "1",
    };
    assertEquals(appTuple1, appExpectedTuple1);

    // should not be able to change app contract id to existing app contract id
    // add a new app and try to change to the first app id

    block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-second-project`,
        1,
        wallet1.address
      ),
    ]);
    const expectedEvent2 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "2",
      },
      type: "contract_event",
    };
    assertEquals(block.receipts[0].events[0], expectedEvent2);
    block.receipts[0].result.expectOk().expectInt(2);

    block = chain.mineBlock([
      client.updateApp(
        1,
        wallet1.address,
        `${wallet1.address}.my-administrator-project`,
        1,
        0,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to get app index of updated app
    const appIndex1 = client.getAppIndex(
      `${wallet1.address}.my-administrator-project`
    );
    appIndex1.result.expectOk().expectInt(0);
  },
});

Clarinet.test({
  name: "Appmap - test set-app-status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet1, wallet2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should allow insert 1 new application
    let block = chain.mineBlock([
      client.registerApp(
        wallet1.address,
        `${wallet1.address}.my-gaia-project`,
        1,
        wallet1.address
      ),
    ]);
    const expectedEvent1 = {
      contract_event: {
        contract_identifier: "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.appmap",
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };

    assertEquals(block.receipts[0].events[0], expectedEvent1);
    block.receipts[0].result.expectOk().expectInt(1);

    // should not be able to set apps to live if not administrator or not contract owner
    block = chain.mineBlock([client.setAppStatus(0, 1, wallet2.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to set apps to live if contract owner
    block = chain.mineBlock([client.setAppStatus(0, 1, wallet1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to check status of app set to live
    let appStatus1 = client.getApp(0);
    let appStatusTuple1 = appStatus1.result.expectOk().expectTuple();
    let appStatusExpectedTuple1 = {
      "app-contract-id":
        "0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374",
      owner: "ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK",
      status: "1",
      "storage-model": "1",
    };
    assertEquals(appStatusTuple1, appStatusExpectedTuple1);

    // should be able to change app status if administrator
    block = chain.mineBlock([client.setAppStatus(0, 0, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to check status of app set to not live
    appStatus1 = client.getApp(0);
    appStatusTuple1 = appStatus1.result.expectOk().expectTuple();
    appStatusExpectedTuple1 = {
      "app-contract-id":
        "0x5354314a34473652523634334243473847385352364d3244395a394b5854324e4a44524b334642544b2e6d792d676169612d70726f6a656374",
      owner: "ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK",
      status: "0",
      "storage-model": "1",
    };
    assertEquals(appStatusTuple1, appStatusExpectedTuple1);
  },
});
