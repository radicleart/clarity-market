import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.10.0/index.ts";

export enum ErrCode {
  ERR_NFT_DATA_NOT_FOUND = 101,
  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
}

export class CrashpunksV2Client {
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

  updateMetadataUrl(
    nftIndex: number,
    newMetadataUrl: string,
    sender: string
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "update-metadata-url",
      [types.ascii(newMetadataUrl)],
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
}
