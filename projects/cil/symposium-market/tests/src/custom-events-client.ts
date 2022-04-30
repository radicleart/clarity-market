import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

export class CustomEventsClient {

  constructor() {}

  expectSemiFungibleTokenBurnEvent(
    event: { type: string, nft_burn_event: { 'asset_identifier': string, 'value': string, } },
    value: { 'owner': string, 'token-id': string },
    assetIdentifier: string
  ): boolean {
    assertEquals(event.type, 'nft_burn_event')
    assertEquals(event.nft_burn_event.asset_identifier, assetIdentifier)
    // console.log(event)
    assertEquals(event.nft_burn_event.value.indexOf(value.owner) > -1, true)
    assertEquals(event.nft_burn_event.value.indexOf(value['token-id']) > -1, true)
    return true
  }
  
  expectSemiFungibleTokenMintEvent(
    event: { type: string, nft_mint_event: { asset_identifier: string, recipient: string, value: string, } },
    value: { owner: string, 'token-id': string },
    address: string,
    assetIdentifier: string
  ): boolean {
    assertEquals(event.type, 'nft_mint_event')
    assertEquals(event.nft_mint_event.recipient, address)
    assertEquals(event.nft_mint_event.asset_identifier, assetIdentifier)
    // console.log(event)
    assertEquals(event.nft_mint_event.value.indexOf(value.owner) > -1, true)
    assertEquals(event.nft_mint_event.value.indexOf(value['token-id']) > -1, true)
    return true
  }
  
  expectEventCount(
    events: Array<{ type: string }>, eventName: string, expectedCount: number
  ): boolean {
    const count1 = events.filter((o) => o.type === eventName)
    assertEquals(count1.length, expectedCount)
    return true
  }
  
}
