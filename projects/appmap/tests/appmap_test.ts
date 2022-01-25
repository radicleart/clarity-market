import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { AppmapClient, ErrCode } from "../../../src/appmap-client.ts";

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
    currentAdministrator.result.expectOk().expectPrincipal(deployer.address);

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
      .expectPrincipal(newAdministrator.address);
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
        contract_identifier: `${deployer.address}.appmap`,
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };

    const expectedEvent_2 = {
      contract_event: {
        contract_identifier: `${deployer.address}.appmap`,
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
    const app_1 = client.getApp(0);
    const app_2 = client.getApp(1);
    const app_1_tuple = app_1.result.expectOk().expectTuple();
    const app_2_tuple = app_2.result.expectOk().expectTuple();

    const app_1_expected_tuple = {
      "app-contract-id":
        "0x535431534a3344544535444e375835345944483544363452334243423641324147325a5138595044352e6d792d676169612d70726f6a656374",
      owner: wallet_1.address,
      status: "0",
      "storage-model": "1",
    };
    assertEquals(app_1_tuple, app_1_expected_tuple);

    const app_2_expected_tuple = {
      "app-contract-id":
        "0x535431534a3344544535444e375835345944483544363452334243423641324147325a5138595044352e6d792d66696c65636f696e2d70726f6a656374",
      owner: wallet_1.address,
      status: "0",
      "storage-model": "2",
    };
    assertEquals(app_2_tuple, app_2_expected_tuple);

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
        contract_identifier: `${deployer.address}.appmap`,
        topic: "print",
        value: "3",
      },
      type: "contract_event",
    };

    const expectedEvent_4 = {
      contract_event: {
        contract_identifier: `${deployer.address}.appmap`,
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
    const contractDataTuple = contractData.result.expectOk().expectTuple();
    const expectedContractDataTuple = {
      administrator: deployer.address,
      appCounter: "4",
    };
    assertEquals(contractDataTuple, expectedContractDataTuple);
  },
});

Clarinet.test({
  name: "Appmap - test update-app",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should allow insert 1 new application
    let block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-gaia-project`,
        1,
        wallet_1.address
      ),
    ]);
    const expectedEvent_1 = {
      contract_event: {
        contract_identifier: `${deployer.address}.appmap`,
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };
    assertEquals(block.receipts[0].events[0], expectedEvent_1);
    block.receipts[0].result.expectOk().expectInt(1);

    // should not be able to update app if index doesn't exist
    block = chain.mineBlock([
      client.updateApp(
        1,
        wallet_1.address,
        `${wallet_1.address}.my-updated-project`,
        1,
        1,
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should not be able to update app if not owner or administrator
    block = chain.mineBlock([
      client.updateApp(
        0,
        wallet_1.address,
        `${wallet_1.address}.my-updated-project`,
        1,
        1,
        wallet_2.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to update app if owner
    block = chain.mineBlock([
      client.updateApp(
        0,
        wallet_1.address,
        `${wallet_1.address}.my-owner-project`,
        1,
        0,
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to get updated app
    let app_1 = client.getApp(0);
    let app_1_tuple: any = app_1.result.expectOk().expectTuple();

    let app_1_expected_tuple = {
      "app-contract-id":
        "0x535431534a3344544535444e375835345944483544363452334243423641324147325a5138595044352e6d792d6f776e65722d70726f6a656374",
      owner: wallet_1.address,
      status: "0",
      "storage-model": "1",
    };
    assertEquals(app_1_tuple, app_1_expected_tuple);

    // should be able to update app if administrator
    block = chain.mineBlock([
      client.updateApp(
        0,
        wallet_1.address,
        `${wallet_1.address}.my-administrator-project`,
        1,
        0,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to get updated app after administrator updated
    app_1 = client.getApp(0);
    app_1_tuple = app_1.result.expectOk().expectTuple();

    app_1_expected_tuple = {
      "app-contract-id":
        "0x535431534a3344544535444e375835345944483544363452334243423641324147325a5138595044352e6d792d61646d696e6973747261746f722d70726f6a656374",
      owner: wallet_1.address,
      status: "0",
      "storage-model": "1",
    };
    assertEquals(app_1_tuple, app_1_expected_tuple);

    // should not be able to change app contract id to existing app contract id
    // add a new app and try to change to the first app id

    block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-second-project`,
        1,
        wallet_1.address
      ),
    ]);
    const expectedEvent_2 = {
      contract_event: {
        contract_identifier: `${deployer.address}.appmap`,
        topic: "print",
        value: "2",
      },
      type: "contract_event",
    };
    assertEquals(block.receipts[0].events[0], expectedEvent_2);
    block.receipts[0].result.expectOk().expectInt(2);

    block = chain.mineBlock([
      client.updateApp(
        1,
        wallet_1.address,
        `${wallet_1.address}.my-administrator-project`,
        1,
        0,
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to get app index of updated app
    const appIndex_1 = client.getAppIndex(
      `${wallet_1.address}.my-administrator-project`
    );
    appIndex_1.result.expectOk().expectInt(0);
  },
});

Clarinet.test({
  name: "Appmap - test set-app-status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, newAdministrator, client } =
      getWalletsAndClient(chain, accounts);

    // should allow insert 1 new application
    let block = chain.mineBlock([
      client.registerApp(
        wallet_1.address,
        `${wallet_1.address}.my-gaia-project`,
        1,
        wallet_1.address
      ),
    ]);
    let expectedEvent_1 = {
      contract_event: {
        contract_identifier: `${deployer.address}.appmap`,
        topic: "print",
        value: "1",
      },
      type: "contract_event",
    };

    assertEquals(block.receipts[0].events[0], expectedEvent_1);
    block.receipts[0].result.expectOk().expectInt(1);

    // should not be able to set apps to live if not administrator or not contract owner
    block = chain.mineBlock([client.setAppStatus(0, 1, wallet_2.address)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_ALLOWED);

    // should be able to set apps to live if contract owner
    block = chain.mineBlock([client.setAppStatus(0, 1, wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to check status of app set to live
    let appStatus_1 = client.getApp(0);
    let appStatus_1_tuple = appStatus_1.result.expectOk().expectTuple();
    let appStatus_1_expected_tuple = {
      "app-contract-id":
        "0x535431534a3344544535444e375835345944483544363452334243423641324147325a5138595044352e6d792d676169612d70726f6a656374",
      owner: wallet_1.address,
      status: "1",
      "storage-model": "1",
    };
    assertEquals(appStatus_1_tuple, appStatus_1_expected_tuple);

    // should be able to change app status if administrator
    block = chain.mineBlock([client.setAppStatus(0, 0, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // should be able to check status of app set to not live
    appStatus_1 = client.getApp(0);
    appStatus_1_tuple = appStatus_1.result.expectOk().expectTuple();
    appStatus_1_expected_tuple = {
      "app-contract-id":
        "0x535431534a3344544535444e375835345944483544363452334243423641324147325a5138595044352e6d792d676169612d70726f6a656374",
      owner: wallet_1.address,
      status: "0",
      "storage-model": "1",
    };
    assertEquals(appStatus_1_tuple, appStatus_1_expected_tuple);
  },
});
