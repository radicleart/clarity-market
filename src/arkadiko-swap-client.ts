import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";

export enum ErrCode {
  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
  ERR_NOT_FOUND = 404,
}

export class ArkadikoSwap {
  contractName: string = "arkadiko-swap-v2-1";
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
  
  createPair(tokenX: string, tokenY: string, swapToken: string, pairName: string, x: number, y: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "create-pair",
      [types.principal(tokenX), types.principal(tokenY), types.principal(swapToken), types.ascii(pairName), types.uint(x), types.uint(y)],
      sender
    );
  }

  swapXForY(tokenX: string, tokenY: string, dx: number, minDy: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "swap-x-for-y",
      [types.principal(tokenX), types.principal(tokenY), types.uint(dx), types.uint(minDy)],
      sender
    );
  }
}
