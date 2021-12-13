import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";

export enum ErrCode {
  ERR_NFT_DATA_NOT_FOUND = 101,
  ERR_COULDNT_GET_V1_DATA = 102,
  ERR_COULDNT_GET_NFT_OWNER = 103,
  ERR_ASSET_NOT_REGISTERED = 104,
  ERR_NFT_NOT_LISTED_FOR_SALE = 105,
  ERR_PAYMENT_ADDRESS = 106,
  ERR_NFT_LISTED = 107,

  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
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

  upgradeV1ToV2(nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "upgrade-v1-to-v2",
      [types.uint(nftIndex)],
      sender
    );
  }

  mintToken(assetHash: ArrayBuffer, metadataUrl: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint-token",
      [types.buff(assetHash), types.buff(metadataUrl)],
      sender
    );
  }

  batchMintToken(
    entries: Array<{ assetHash: ArrayBuffer; metadataUrl: string }>,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "batch-mint-token",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              assetHash: entry.assetHash,
              metadataUrl: entry.metadataUrl,
            })
          )
        ),
      ],
      sender
    );
  }

  batchSetMintPass(
    entries: Array<{ account: string; limit: string }>,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "batch-set-mint-pass",
      [
        types.list(
          entries.map((entry) =>
            types.tuple({
              account: entry.account,
              limit: entry.limit,
            })
          )
        ),
      ],
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

  updateMetadataUrl(
    nftIndex: number,
    newMetadataUrl: string,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "update-metadata-url",
      [types.uint(nftIndex), types.ascii(newMetadataUrl)],
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

  transferAdministrator(newAdministrator: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-administrator",
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
  ) {
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

  getTokenDataByIndex(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-data-by-index", [
      types.uint(nftIndex),
    ]);
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
