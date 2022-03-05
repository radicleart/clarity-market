# Review

## Phase 1

OK, I looked at it during coffee break and noticed few tings
1) wrapped-stx is defined as fungible token - so in order to use it you'll have to mint it and transfer STX at the same time. I'm not sure if this is the best way to tackle minting with STX

2) You have set-mint-commission and for sure it would bee good to have also remove-mint-commission. Just like you can add new tender that users can use to mint your nft, you should also have the possibility to remove any tender if it become worthless.
There is also this contract: https://github.com/radicleart/clarity-market/blob/main/projects/risidio/indige/contracts/commission-sip10-sm-indige100.clar

It looks like it is a commission contract, but it accepts token trait ref and transfer STX - should it be this way?

> lnow — 03/03/2022
In commission contracts you have something like this:
(try! (contract-call? ft-trait transfer (/ (* price u5) u100) tx-sender 'ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5 none))

If price will be equal 19 or less this function will fail and as a result whole buy function will fail.
You can eliminate by verifying if amount you want to transfer is greater than 0
I hope you don't have plans to deploy contracts with these 2 functions:
(define-public (set-approved (id uint) (operator principal) (approved bool))
    (ok (map-set approvals {owner: contract-caller, operator: operator, id: id} approved))
)

(define-public (set-approved-all (operator principal) (approved bool))
    (ok (map-set approvals-all {owner: contract-caller, operator: operator} approved))
)

> mijoco —  — 03/03/2022

hmmmm - they came from https://github.com/stacksgov/sips/issues/52 ?

> lnow — 03/03/2022

These approvals are permanent unless someone intentionally revoke them.
It means that I can set you as operator of my token. Then sell it to someone else. Then buy it again and you still have the power to act as my operator.
In my opinion this is wrong

> mijoco —  — 03/03/2022

i think also they don't work the way they were originally intended.
ie to allow the marketplace to be non-custodial..
i'm happy to remove them.

> lnow — 03/03/2022

https://github.com/radicleart/clarity-market/blob/a0251af1db3801c23a8986af6cebe19a21f8eb5a/projects/risidio/indige/contracts/indige.clar#L197-L202
Here you will execute same set of operations up to 200x.

(define-public (batch-set-mint-pass (entries (list 200 {account: principal, limit: uint})))
    (fold check-err
        (map set-mint-pass-helper entries)
        (ok true)
    )
)

(define-private (set-mint-pass-helper (entry {account: principal, limit: uint}))
    (set-mint-pass (get account entry) (get limit entry))
)

(define-public (set-mint-pass (account principal) (limit uint))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (map-set mint-pass account limit))
    )
)
200x (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR) while in reality you only need to verify it once
Something like this (not tested) should be more efficient:
(define-public (batch-set-mint-pass (entries (list 200 {account: principal, limit: uint})))
   (begin
    (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (map set-mint-pass-helper entries)
        (ok true)
    )
   )
)
(define-private (set-mint-pass-helper (entry {account: principal, limit: uint}))
    (map-set mint-pass (get account entry) (get limit entry))
)

> mijoco —  — 03/03/2022

yes was thinking similar - will update.

> mijoco —  — 03/03/2022

will delete this.

> lnow — 03/03/2022

Why you use tx-sender to pay for minted NFT, and contract-caller as NFT recipient?
https://github.com/radicleart/clarity-market/blob/a0251af1db3801c23a8986af6cebe19a21f8eb5a/projects/risidio/indige/contracts/indige.clar#L139-L142

> mijoco —  — 03/03/2022

intention is to use this https://github.com/radicleart/clarity-market/blob/a0251af1db3801c23a8986af6cebe19a21f8eb5a/contracts/external/stx-token.clar
to accept a trait which transfers stx - using wrapped stx should work the same as say diko no? in that someone gets the token from somewhere else?

> mijoco —  — 03/03/2022

latter should be tx-sender? ie if this is called by an intermediary contract its the still the end user paying and receiving the nft.

> lnow — 03/03/2022

I don't understand...
From what I know this: https://github.com/radicleart/clarity-market/blob/main/projects/risidio/indige/contracts/commission-indige.clar should cover everything. Regardless of which tender you use (STX or FT). But it might be the case I'm missing some business edge case

> lnow — 03/03/2022

I can't tell if it should or shouldn't - I don't know reasoning behind your choice.
Right now if someone calls this function via intermediary contract he/she won't get the NFT
And it feels weird

> mijoco —  — 03/03/2022

yes it does - but raw stx is not an FT ? so the stx-transfer needs to be wrapped in a SIP10 contract - wasn't that Friedgers point?

> lnow — 03/03/2022
The whole concept is build around wrapping FT in SIP10 contract 😉
so that you don't have to build separate function/contracts for STX and each SIP-010 tokens

> mijoco —  — 03/03/2022
yes - agreed - the unit tests cover both cases!

> mijoco —  — 03/03/2022
i will make it consistenetly tx-sender in the mint method - unless you can see a use case where an intermediary contract both pays for and owns an nft on the user behalf?

> lnow — 03/03/2022
DAO contract could use it

> mijoco —  — 03/03/2022
yes !
that might be interesting for next project.
in this case its contract-caller and the tx-sender is maybe a vote on whether the nft should be collected.

> lnow — 03/03/2022
exactly

> mijoco —  — 03/03/2022
have to pick up kids but will go through your comments more carefuly later / tomorrow - hopefully a final sanity check thereafter?
one question - is there a way to split the markeplace into a separate contract - I noticed Jamil has gone the other way and is just using the marketplace within the minting contract?

> lnow — 03/03/2022
I have some rough idea in my mind, but it must be refined
Wrapping STX in SIP-010 went through the same process 😉 Rough idea -> stupid PoC -> refinement -> another PoC -> tests -> proper PoC with test suite

> mijoco —  — 03/03/2022
what if we unset approval on transfer if transfer called by operator and not nft owner?
 e.g.

(define-public (transfer (id uint) (owner principal) (recipient principal))
    (begin
        (asserts! (unwrap! (is-approved id contract-caller) ERR_NOT_AUTHORIZED) ERR_NOT_AUTHORIZED)
        (asserts! (is-none (map-get? market id)) ERR_NFT_LISTED)
        (if (not (is-eq owner (unwrap! (nft-get-owner? indige id) ERR_COULDNT_GET_NFT_OWNER)))
            (map-set approvals {owner: contract-caller, operator: owner, id: id} false)
            true
        )
        (nft-transfer? indige id owner recipient)
    )
)

> lnow — 03/03/2022
Yes, my point of view on this matter is that approvals are ok as long as they expire at some point. Either after transfer or after some time
Without "expiration" they pose same threats as allow/approve in ERC20 in ethereum

> mijoco —  — Yesterday at 09:14
This logic around set-approved and set-approved-all is slippery. If say I proceed by a) remove the all logic and b) reset the approval to false on transfer if called by an operator then if the owner transfers the operator will remain approved. If i just set it to false regardless of the caller being the owner or operator then we end up with perverse statements like the owner acting as their own operator is not allowed to transfer and if i map-delete then the approvals-all kicks in and something else counter-intuitive happens. 

Hmmmm..  I like the idea of approvals - think its needed for the non custodial marketplace to work. I will remove approvals-all and do a map-delete on transfer for tuple (id contract-caller owner) so a hard reset of any approval after one sale cycle - hopefully this is a safe first step?

I'll update tests and ping when have the new version.

## Phase 2

Moved the project here: `./projects/thisisnumberone/version2` as this will be the first
project to launch with this contract. Required mainly tweaks to the configuration e.g. mainly
max collection size is five for this set. In addition made the following changes based on
comments from LNow.

1 removed approvals-all map and associated code. In transfer function added

```        (try! (map-delete approvals {owner: contract-caller, operator: owner, id: id}))
```

to ensure the lifespan of the approval is limited to 1 sale cycle.

2 changed tx-sender to contract-caller in the mint function to allow for dao to call mint and transfer.

3 In the commission contract (called by the minting contract) the tx-sender pays but in the minting contract the contract-caller pays (both buy now price and minting fee). How should this work - in the case of a DAO contract?

### Questions

1 un/list-in-token - should these functions allow the operator to list / unlist within the new
reduced scope.

# Commission Address

## Testnet
### Minting

1. artisAddress:      ST132K8CVJ9B2GEDHTQS5MH3N7BR5QDMN1P1RZG3Y
2. commissionAddress: ST2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1TC4PAG
3. commissionRate:    0
### Secondaries

## Mainnet

### Mint Commission

1. ST2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1TC4PAG
2. ST132K8CVJ9B2GEDHTQS5MH3N7BR5QDMN1P1RZG3Y
### Secondaries Commission



### The V! COmmission

```(ok (some (tuple (addresses (list 
SPVS357X140DGZFB2M2RP4WH26SA418ZNN78KFBS u1000000000 
SPZRAE52H2NC2MDBEV8W99RFVPK8Q9BW8H88XV9N u6300000000 
SP162D87CY84QVVCMJKNKGHC7GGXFGA0TAR9D0XJW u463000000 
SP1CS4FVXC59S65C3X1J3XRNZGWTG212JT7CG73AG u463000000 
SP4DYYK99BZS7S95KYYEJAJE5VJ21F57M4NS0Q5F u1774000000
SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ 
SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ 
SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ 
SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ
)) (shares (list u1000000000 u6300000000 u463000000 u463000000 u1774000000 u0 u0 u0 u0 u0)))))
```