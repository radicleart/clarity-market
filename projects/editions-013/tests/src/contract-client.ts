import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";

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
  ERR_WRONG_TOKEN = 112,

  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
  ERR_NOT_FOUND = 404,
}

export class ContractClient {
  contractName: string = "editions-013";
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

  adminMint(tokenId: number, amount: number, recipient: string, sender: string): Tx {
    return Tx.contractCall(this.contractName, "admin-mint", [types.uint(tokenId), types.uint(amount), types.principal(recipient)], sender);
  }

  adminMintMany(
    entries: Array<{ tokenId: number; amount: number; recipient: string }>,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "admin-mint-many",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              tokenId: types.uint(entry.tokenId),
              amount: types.uint(entry.amount),
              recipient: types.principal(entry.recipient)
            })
          )
        ),
      ],
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

}
