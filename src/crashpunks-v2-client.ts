import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";

export enum ErrCode {
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

  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_V1_OWNER = 403,
  ERR_NOT_ADMINISTRATOR = 404,
}

export class CrashPunksV2Client {
  contractName: string = "crashpunks-v2";
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
  getTokenUri(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-uri", [types.uint(nftIndex)]);
  }

  // SIP-09
  getOwner(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-owner", [types.uint(nftIndex)]);
  }

  // SIP-09
  transfer(
    nftIndex: number,
    owner: string,
    recipient: string,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer",
      [
        types.uint(nftIndex),
        types.principal(owner),
        types.principal(recipient),
      ],
      sender
    );
  }

  // operable
  isApproved(nftIndex: number, address: string): ReadOnlyFn {
    return this.callReadOnlyFn("is-approved", [
      types.uint(nftIndex),
      types.principal(address),
    ]);
  }

  // operable
  setApproved(
    nftIndex: number,
    operator: string,
    approved: boolean,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approved",
      [types.uint(nftIndex), types.principal(operator), types.bool(approved)],
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

  upgradeV1ToV2(nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "upgrade-v1-to-v2",
      [types.uint(nftIndex)],
      sender
    );
  }

  batchUpgradeV1ToV2(entries: number[], sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "batch-upgrade-v1-to-v2",
      [types.list(entries.map((nftIndex) => types.uint(nftIndex)))],
      sender
    );
  }

  mintToken(sender: string): Tx {
    return Tx.contractCall(this.contractName, "mint-token", [], sender);
  }

  batchMintToken(entries: number[], sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "batch-mint-token",
      [types.list(entries.map((entry) => types.uint(entry)))],
      sender
    );
  }

  adminMintAirdrop(recipient: string, nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "admin-mint-airdrop",
      [types.principal(recipient), types.uint(nftIndex)],
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

  listItem(nftIndex: number, amount: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "list-item",
      [types.uint(nftIndex), types.uint(amount)],
      sender
    );
  }

  unlistItem(nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "unlist-item",
      [types.uint(nftIndex)],
      sender
    );
  }

  buyNow(nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "buy-now",
      [types.uint(nftIndex)],
      sender
    );
  }

  burn(nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "burn",
      [types.uint(nftIndex)],
      sender
    );
  }

  setAdministrator(newAdministrator: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-administrator",
      [types.principal(newAdministrator)],
      sender
    );
  }

  setCollectionRoyalties(
    newMintAddresses: string[],
    newMintShares: number[],
    newRoyaltyAddresses: string[],
    newRoyaltyShares: number[],
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-collection-royalties",
      [
        types.list(
          newMintAddresses.map((newMintAddress) =>
            types.principal(newMintAddress)
          )
        ),
        types.list(
          newMintShares.map((newMintShare) => types.uint(newMintShare))
        ),
        types.list(
          newRoyaltyAddresses.map((newAddress) => types.principal(newAddress))
        ),
        types.list(newRoyaltyShares.map((newShare) => types.uint(newShare))),
      ],
      sender
    );
  }

  setBaseUri(newBaseUri: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-base-uri",
      [types.ascii(newBaseUri)],
      sender
    );
  }

  freezeMetadata(sender: string): Tx {
    return Tx.contractCall(this.contractName, "freeze-metadata", [], sender);
  }

  getTokenMarketByIndex(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-market-by-index", [
      types.uint(nftIndex),
    ]);
  }

  getMintPassBalance(account: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-mint-pass-balance", [
      types.principal(account),
    ]);
  }
}
