import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.10.0/index.ts";

import { formatBuffString } from "./util.ts";

export enum ErrCode {
  ERR_NOT_ALLOWED = 10,
  ERR_NOT_FOUND = 11,
  ERR_AMOUNT_NOT_SET = 12,
  ERR_SELLER_NOT_FOUND = 13,
  ERR_ASSET_NOT_REGISTERED = 14,
  ERR_TRANSFER_ERROR = 15,
  ERR_NOT_APPROVED_TO_SELL = 16,
  ERR_SAME_SPENDER_ERR = 17,
  ERR_FAILED_TO_MINT_ERR = 18,
  ERR_EDITION_COUNTER_ERROR = 19,
  ERR_EDITION_LIMIT_REACHED = 20,
  ERR_USER_AMOUNT_DIFFERENT = 21,
  ERR_FAILED_TO_STX_TRANSFER = 22,
  ERR_FAILED_TO_CLOSE_1 = 23,
  ERR_FAILED_REFUND = 24,
  ERR_FAILED_TO_CLOSE_3 = 24,
  ERR_CANT_PAY_MINT_PRICE = 25,
  ERR_EDITIONS_ERROR = 26,
  ERR_PAYMENT_ERROR = 28,
  ERR_PAYMENT_ADDRESS_ERROR = 33,
  ERR_PAYMENT_SHARE_ERROR = 34,
  ERR_BIDDING_ERROR = 35,
  ERR_PREVBID_BIDDING_ERROR = 36,
  ERR_NOT_ORIGINALE = 37,
  ERR_BIDDING_OPENING_ERROR = 38,
  ERR_BIDDING_AMOUNT_ERROR = 39,
  ERR_BIDDING_ENDTIME_ERROR = 40,
}

export class LoopbombClient {
  contractName: string = "loopbomb";
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

  setApprovalFor(nftIndex: number, approval: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approval-for",
      [types.uint(nftIndex), types.principal(approval)],
      sender
    );
  }

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

  transferAdministrator(newAdministrator: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-administrator",
      [types.principal(newAdministrator)],
      sender
    );
  }

  changeFee(newFee: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "change-fee",
      [types.uint(newFee)],
      sender
    );
  }

  updateBaseTokenURI(newBaseTokenUri: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "update-base-token-uri",
      [types.ascii(newBaseTokenUri)],
      sender
    );
  }

  updateMintPrice(newMintPrice: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "update-mint-price",
      [types.uint(newMintPrice)],
      sender
    );
  }

  transferBalance(recipient: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer-balance",
      [types.principal(recipient)],
      sender
    );
  }

  makeOffer(
    nftIndex: number,
    amount: number,
    appTimestamp: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "make-offer",
      [types.uint(nftIndex), types.uint(amount), types.uint(appTimestamp)],
      sender
    );
  }

  acceptOffer(
    nftIndex: number,
    offerIndex: number,
    owner: string,
    recipient: string,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "accept-offer",
      [
        types.uint(nftIndex),
        types.uint(offerIndex),
        types.principal(owner),
        types.principal(recipient),
      ],
      sender
    );
  }

  mintToken(
    assetHash: string,
    metaDataUrl: string,
    maxEditions: number,
    editionCost: number,
    addresses: string[],
    shares: number[],
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint-token",
      [
        types.buff(formatBuffString(assetHash)),
        types.buff(formatBuffString(metaDataUrl)),
        types.uint(maxEditions),
        types.uint(editionCost),
        types.list(addresses.map((address) => types.principal(address))),
        types.list(shares.map((share) => types.uint(share))),
      ],
      sender
    );
  }

  mintEdition(nftIndex: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint-edition",
      [types.uint(nftIndex)],
      sender
    );
  }

  setEditionCost(
    nftIndex: number,
    maxEditions: number,
    editionCost: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-edition-cost",
      [types.uint(nftIndex), types.uint(maxEditions), types.uint(editionCost)],
      sender
    );
  }

  setSaleData(
    nftIndex: number,
    saleType: number,
    incrementStx: number,
    reserveStx: number,
    amountStx: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-sale-data",
      [
        types.uint(nftIndex),
        types.uint(saleType),
        types.uint(incrementStx),
        types.uint(reserveStx),
        types.uint(amountStx),
      ],
      sender
    );
  }

  buyNow(
    nftIndex: number,
    owner: string,
    recipient: string,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "buy-now",
      [
        types.uint(nftIndex),
        types.principal(owner),
        types.principal(recipient),
      ],
      sender
    );
  }

  openingBid(
    nftIndex: number,
    bidAmount: number,
    appTimestamp: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "opening-bid",
      [types.uint(nftIndex), types.uint(bidAmount), types.uint(appTimestamp)],
      sender
    );
  }

  placeBid(
    nftIndex: number,
    nextBidAmount: number,
    appTimestamp: number,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "place-bid",
      [
        types.uint(nftIndex),
        types.uint(nextBidAmount),
        types.uint(appTimestamp),
      ],
      sender
    );
  }

  closeBidding(nftIndex: number, closeType: number, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "close-bidding",
      [types.uint(nftIndex), types.uint(closeType)],
      sender
    );
  }

  getLastTokenId(): ReadOnlyFn {
    return this.callReadOnlyFn("get-last-token-id");
  }

  getTokenUri(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-uri", [types.uint(nftIndex)]);
  }

  getOwner(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-owner", [types.uint(nftIndex)]);
  }

  getApproval(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-approval", [types.uint(nftIndex)]);
  }

  getAdministrator(): ReadOnlyFn {
    return this.callReadOnlyFn("get-administrator");
  }

  isAdministrator(sender: Account): ReadOnlyFn {
    return this.callReadOnlyFn("is-administrator", [], sender);
  }

  getBaseTokenUri(): ReadOnlyFn {
    return this.callReadOnlyFn("get-base-token-uri");
  }

  getMintCounter(): ReadOnlyFn {
    return this.callReadOnlyFn("get-mint-counter");
  }

  getMintPrice(): ReadOnlyFn {
    return this.callReadOnlyFn("get-mint-price");
  }

  getPlatformFee(): ReadOnlyFn {
    return this.callReadOnlyFn("get-platform-fee");
  }

  getTokenByIndex(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-by-index", [types.uint(nftIndex)]);
  }

  getBeneficiaries(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-beneficiaries", [types.uint(nftIndex)]);
  }

  getOfferAtIndex(nftIndex: number, offerIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-offer-at-index", [
      types.uint(nftIndex),
      types.uint(offerIndex),
    ]);
  }

  getBidAtIndex(nftIndex: number, bidIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-offer-at-index", [
      types.uint(nftIndex),
      types.uint(bidIndex),
    ]);
  }

  getEditionByHash(assetHash: string, edition: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-edition-by-hash", [
      types.buff(formatBuffString(assetHash)),
      types.uint(edition),
    ]);
  }

  getTokenByHash(assetHash: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-by-hash", [
      types.buff(formatBuffString(assetHash)),
    ]);
  }

  getContractData(): ReadOnlyFn {
    return this.callReadOnlyFn("get-contract-data");
  }

  getSaleData(nftIndex: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-sale-data", [types.uint(nftIndex)]);
  }

  getTokenName(): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-name");
  }

  getTokenSymbol(): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-symbol");
  }

  getBalance(sender: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-balance", [], sender);
  }
}
