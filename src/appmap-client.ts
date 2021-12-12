import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";

export enum ErrCode {
  ERR_NOT_FOUND = 100,
  ERR_ILLEGAL_STORAGE = 102,
  ERR_NOT_ALLOWED = 101,
}

const formatBuffString = (buffer: string) => {
  return new TextEncoder().encode(buffer);
};

export class AppmapClient {
  contractName: string = "appmap";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account) {
    this.chain = chain;
    this.deployer = deployer;
  }

  private callReadOnlyFn(
    method: string,
    args: Array<any> = [],
    sender: Account = this.deployer
  ): ReadOnlyFn {
    const result = this.chain.callReadOnlyFn(
      this.contractName,
      method,
      args,
      sender?.address
    );

    return result;
  }

  transferAdministrator(newAdministrator: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-administrator",
      [types.principal(newAdministrator)],
      sender
    );
  }

  registerApp(
    owner: string,
    appContractId: string,
    storageModel: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "register-app",
      [
        types.principal(owner),
        types.buff(formatBuffString(appContractId)),
        types.int(storageModel),
      ],
      sender
    );
  }

  updateApp(
    index: number,
    owner: string,
    appContractId: string,
    storageModel: number,
    status: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "update-app",
      [
        types.int(index),
        types.principal(owner),
        types.buff(formatBuffString(appContractId)),
        types.int(storageModel),
        types.int(status),
      ],
      sender
    );
  }

  setAppStatus(index: number, status: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-app-status",
      [types.int(index), types.int(status)],
      sender
    );
  }

  getApp(index: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-app", [types.int(index)]);
  }

  getAppIndex(appContractId: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-app-index", [
      types.buff(formatBuffString(appContractId)),
    ]);
  }

  getAppCounter(): ReadOnlyFn {
    return this.callReadOnlyFn("get-app-counter");
  }

  getAdministrator(): ReadOnlyFn {
    return this.callReadOnlyFn("get-administrator");
  }

  getContractData(): ReadOnlyFn {
    return this.callReadOnlyFn("get-contract-data");
  }
}
