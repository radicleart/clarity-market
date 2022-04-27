import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";

export enum ErrCode {
  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
  ERR_NOT_FOUND = 404,
}

export class WrappedBitcoin {
  contractName: string = "Wrapped-Bitcoin";
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
  
  mintWrappedBitcoin(amount: number, address: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint-tokens",
      [types.uint(amount), types.principal(address)],
      sender
    );
  }
  getBalance(owner: string, sender: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-balance", [types.principal(owner)], sender);
  }
  getTotalSupply(sender: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-supply", [], sender);
  }
}
