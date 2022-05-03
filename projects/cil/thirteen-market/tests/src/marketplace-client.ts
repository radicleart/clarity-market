import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

export enum MarketErrCode {
  ERR_UNKNOWN_LISTING = 2000,
  ERR_PRICE_WAS_ZERO = 2001,
  ERR_NFT_ASSET_MISMATCH = 2003,
  ERR_ASSET_NOT_ALLOWED = 2005,
  ERR_EXPIRY_IN_PAST = 2006,
  ERR_PAYMENT_CONTRACT_NOT_ALLOWED = 2007,
  ERR_MAKER_TAKER_EQUAL = 2008,
  ERR_UNINTENDED_TAKER = 2009,
  ERR_LISTING_EXPIRED = 2010,
  ERR_PAYMENT_ASSET_MISMATCH = 2012,
  ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE = 2013,
  ERR_WRONG_COMMISSION = 2014,
  ERR_WRONG_TOKEN = 2015,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403
}
interface Listing {
	tokenId: number,
	unitPrice: number,
	amount: number,
	expiry: number,
	taker?: string
}
const makeListing = (listing: Listing) =>
	types.tuple({
		'taker': listing.taker ? types.some(types.principal(listing.taker)) : types.none(),
		'token-id': types.uint(listing.tokenId),
		'amount': types.uint(listing.amount),
		'expiry': types.uint(listing.expiry),
		'unit-price': types.uint(listing.unitPrice)
	});


export class MarketplaceClient {
  contractName: string = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

  // read only calls
  getListing(listingId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-listing", [types.uint(listingId)]);
  }

  isAllowed(nftContract: string): ReadOnlyFn {
    return this.callReadOnlyFn("is-allowed", [types.principal(nftContract)]);
  }

  
  listInTokenTuple(nftContract: string, listing: Listing, commission: string, token: string, sender: string): Tx {
    
    return Tx.contractCall(
      this.contractName,
      "list-in-token",
      [types.principal(nftContract), makeListing(listing), types.principal(commission), types.principal(token)],
      sender
    );
  }

  unlistInToken(listingId: number, nftContract: string, sender: string): Tx {
    return Tx.contractCall(
        this.contractName, "unlist-in-token", [types.uint(listingId), types.principal(nftContract)], sender 
      );
  }

  buyInToken(listingId: number, nftContract: string, comm: string, token: string, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "buy-in-token",
      [types.uint(listingId), types.principal(nftContract), types.principal(comm), types.principal(token)],
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
  setAllowed(nftContract: string, allowed: boolean, sender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-allowed",
      [types.principal(nftContract), types.bool(allowed)],
      sender
    );
  }
// (define-public (set-allowed (asset-contract principal) (allowed bool))

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
