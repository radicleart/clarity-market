import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

export enum ErrCode {
  ERR_SENDER_NOT_ENOUGH_BALANCE = 1,
  ERR_TOKEN_ID_TAKEN = 100,
  ERR_METADATA_FROZEN = 101,
  ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE = 102,
  ERR_PRICE_WAS_ZERO = 104,
  ERR_NFT_NOT_LISTED_FOR_SALE = 105,
  ERR_NFT_LISTED = 107,
  ERR_COLLECTION_LIMIT_REACHED = 108,
  ERR_MINT_PASS_LIMIT_REACHED = 109,
  ERR_WRONG_COMMISSION = 111,
  ERR_WRONG_TOKEN = 112,
  ERR_UNKNOWN_TENDER = 113,
  ERR_BATCH_SIZE_EXCEEDED = 114,
  ERR_NOT_ADMIN_MINT_PASS = 115,
  ERR_INSUFFICIENT_BALANCE = 116,
  ERR_LIMIT_PER_FT_EXCEEDED = 117,
  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
  ERR_NOT_FOUND = 404,
}

export class ContractClient {
  contractName: string = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

  // read only calls
  getBalance(tokenId: number, who: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-balance", [
      types.uint(tokenId),
      types.principal(who)
    ]);
  }
  getOverallBalance(who: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-overall-balance", [
      types.principal(who)
    ]);
  }
  getTotalSupply(tokenId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-supply", [
      types.uint(tokenId),
    ]);
  }
  getOverallSupply(): ReadOnlyFn {
    return this.callReadOnlyFn("get-overall-supply", []);
  }
  getDecimals(tokenId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-decimals", [
      types.uint(tokenId),
    ]);
  }
  getTokenUri(tokenId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-uri", [
      types.uint(tokenId),
    ]);
  }
  transfer(tokenId: number, amount: number, owner: string, recipient: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer",
      [types.uint(tokenId), types.uint(amount), types.principal(owner), types.principal(recipient)],
      sender
    );
  }
  transferMemo(tokenId: number, amount: number, owner: string, recipient: string, memo: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-memo",
      [types.uint(tokenId), types.uint(amount), types.principal(owner), types.principal(recipient), types.buff(memo)],
      sender
    );
  }
  transferMany(entries: Array<{ 'token-id': number; amount: number; owner: string, recipient: string }>, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-many",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              'token-id': types.uint(entry['token-id']),
              amount: types.uint(entry.amount),
              sender: types.principal(entry.owner),
              recipient: types.principal(entry.recipient)
            })
          )
        ),
      ],
      sender
    );
  }
  transferManyMemo(entries: Array<{ 'token-id': number; amount: number; owner: string, recipient: string, memo: string }>, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-many-memo",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              'token-id': types.uint(entry['token-id']),
              amount: types.uint(entry.amount),
              sender: types.principal(entry.owner),
              recipient: types.principal(entry.recipient),
              memo: types.buff(entry.memo)
            })
          )
        ),
      ],
      sender
    );
  }

  adminMint(tokenId: number, amount: number, recipient: string, sender: string): Tx {
    return Tx.contractCall(this.contractName, "admin-mint", [types.uint(tokenId), types.uint(amount), types.principal(recipient)], sender);
  }
  adminMintMany(
    entries: Array<{ 'token-id': number; amount: number; recipient: string }>,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "admin-mint-many",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              'token-id': types.uint(entry['token-id']),
              amount: types.uint(entry.amount),
              recipient: types.principal(entry.recipient)
            })
          )
        )
      ],
      sender
    );
  }

  burn(id: number, sender: string): Tx {
    return Tx.contractCall(this.contractName, "burn", [types.uint(id)], sender);
  }

  setApproved(id: number, operator: string, approved: boolean, sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approved",
      [types.uint(id), types.principal(operator), types.bool(approved)],
      sender
    );
  }

// cotract owner calls
  setAdministrator(newAdministrator: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-administrator",
      [types.principal(newAdministrator)],
      sender
    );
  }
  setTokenUri(newTokenUri: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-token-uri",
      [types.ascii(newTokenUri)],
      sender
    );
  }
  setAdminMintPass(account: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-admin-mint-pass",
      [types.principal(account)],
      sender
    );
  }
  freezeMetadata(sender: string): Tx {
    return Tx.contractCall(this.contractName, "freeze-metadata", [], sender);
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
}
