import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";

export enum ErrCode {
  ERR_INSUFFICIENT_TOKENS = 1,
  ERR_SENDER_IS_RECIPIENT = 2,
  ERR_METADATA_FROZEN = 101,
  ERR_COULDNT_GET_V1_DATA = 102,
  ERR_COULDNT_GET_NFT_OWNER = 103,
  ERR_PRICE_WAS_ZERO = 104,
  ERR_NFT_NOT_LISTED_FOR_SALE = 105,
  ERR_PAYMENT_ADDRESS = 106,
  ERR_NFT_LISTED = 107,
  ERR_COLLECTION_LIMIT_REACHED = 108,
  ERR_MINT_PASS_LIMIT_REACHED = 109,
  ERR_ADD_MINT_PASS = 110,
  ERR_WRONG_COMMISSION = 111,

  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
  ERR_NOT_FOUND = 404,
}

export class IndigeClient {
  contractName: string = "indige";
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

  // SIP-09
  getLastTokenId(): ReadOnlyFn {
    return this.callReadOnlyFn("get-last-token-id");
  }

  // SIP-09
  getTokenUri(id: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-uri", [types.uint(id)]);
  }

  // SIP-09
  getOwner(id: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-owner", [types.uint(id)]);
  }

  // SIP-09
  transfer(id: number, owner: string, recipient: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer",
      [types.uint(id), types.principal(owner), types.principal(recipient)],
      sender
    );
  }

  // operable
  isApproved(id: number, address: string): ReadOnlyFn {
    return this.callReadOnlyFn("is-approved", [
      types.uint(id),
      types.principal(address),
    ]);
  }

  // operable
  setApproved(
    id: number,
    operator: string,
    approved: boolean,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approved",
      [types.uint(id), types.principal(operator), types.bool(approved)],
      sender
    );
  }

  setApprovedAll(operator: string, approved: boolean, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approved-all",
      [types.principal(operator), types.bool(approved)],
      sender
    );
  }

  mintWith(token: string, sender: string): Tx {
    return Tx.contractCall(this.contractName, "mint-with", [types.principal(token)], sender);
  }

  mintWithMany(entries: number[], token: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint-with-many",
      [types.list(entries.map((entry) => types.uint(entry))), types.principal(token)],
      sender
    );
  }

  adminMintAirdrop(recipient: string, id: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "admin-mint-airdrop",
      [types.principal(recipient), types.uint(id)],
      sender
    );
  }

  setMintPass(account: string, limit: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-mint-pass",
      [types.principal(account), types.uint(limit)],
      sender
    );
  }

  batchSetMintPass(
    entries: Array<{ account: string; limit: number }>,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "batch-set-mint-pass",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              account: types.principal(entry.account),
              limit: types.uint(entry.limit),
            })
          )
        ),
      ],
      sender
    );
  }

  listInToken(id: number, price: number, comm: string, token: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "list-in-token",
      [types.uint(id), types.uint(price), types.principal(comm), types.principal(token)],
      sender
    );
  }

  unlistInToken(id: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "unlist-in-token",
      [types.uint(id)],
      sender
    );
  }

  buyInToken(id: number, comm: string, token: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "buy-in-token",
      [types.uint(id), types.principal(comm), types.principal(token)],
      sender
    );
  }

  burn(id: number, sender: string): Tx {
    return Tx.contractCall(this.contractName, "burn", [types.uint(id)], sender);
  }

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

  freezeMetadata(sender: string): Tx {
    return Tx.contractCall(this.contractName, "freeze-metadata", [], sender);
  }

  getListingInToken(id: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-listing-in-token", [types.uint(id)]);
  }

  getMintPassBalance(account: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-mint-pass-balance", [
      types.principal(account),
    ]);
  }

  setMintCommission(tender: string, price: number, address: string, commissionAddress: string, commissionRate: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-mint-commission",
      [types.principal(tender), types.uint(price), types.principal(address), types.principal(commissionAddress), types.uint(commissionRate)],
      sender
    );
  }

}
