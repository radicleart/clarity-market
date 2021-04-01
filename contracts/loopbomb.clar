;; Interface definitions
;; (impl-trait 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW.nft-interface.transferable-nft-trait)
(impl-trait 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW.nft-interface.tradable-nft-trait)

;; contract variables
(define-data-var administrator principal 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)
(define-data-var mint-price uint u10000)
(define-data-var base-token-uri (buff 100) 0x68747470733a2f2f6c6f6f70626f6d622e7269736964696f2e636f6d2f696e6465782f76312f61737365742f)
(define-data-var mint-counter uint u0)
(define-data-var platform-fee uint u5)

;; constants
(define-constant token-name "loopbomb")
(define-constant token-symbol "LOOP")

;; Non Fungible Token, modeled after ERC-721 via transferable-nft-trait
;; Note this is a basic implementation - no support yet for setting approvals for assets
;; NFT are identified by nft-index (uint) which is tied via a reverse lookup to a real world
;; asset hash - SHA 256 32 byte value. The Asset Hash is used to tie arbitrary real world
;; data to the NFT
(define-non-fungible-token my-nft uint)

;; data structures
<<<<<<< HEAD
(define-map beneficiaries {nft-index: uint} {addresses: (list 10 principal), shares: (list 10 uint)})
(define-map my-nft-data {nft-index: uint} {asset-hash: (buff 32), max-editions: uint, edition: uint, date: uint, series-original: uint})
(define-map my-nft-edition-pointer {nft-index: uint} {current-edition: uint})
(define-map sale-data {nft-index: uint} {sale-type: uint, increment-stx: uint, reserve-stx: uint, amount-stx: uint, bidding-end-time: uint})
(define-map transfer-map {nft-index: uint} {transfer-count: uint})
(define-map transfer-history-map {nft-index: uint, transfer-count: uint} {from: principal, to: principal, sale-type: uint, when: uint, amount: uint})
(define-map my-nft-lookup {asset-hash: (buff 32), edition: uint} {nft-index: uint})
=======
(define-map nft-lookup {asset-hash: (buff 32), edition: uint} {nft-index: uint})
(define-map nft-data {nft-index: uint} {asset-hash: (buff 32), max-editions: uint, edition: uint, date: uint, series-original: uint})
(define-map nft-sale-data {nft-index: uint} {sale-type: uint, increment-stx: uint, reserve-stx: uint, amount-stx: uint, bidding-end-time: uint, sale-cycle-index: uint})
(define-map nft-beneficiaries {nft-index: uint} { addresses: (list 10 principal), shares: (list 10 uint) })
;; Phase III ? -- (define-map my-catalogue {nft-index: uint} { auction-id: uint })
(define-map nft-bid-history {nft-index: uint, bid-index: uint} {sale-cycle: uint, bidder: principal, amount: uint, when-bid: uint})
(define-map nft-offer-history {nft-index: uint, offer-index: uint} {sale-cycle: uint, offerer: principal, made-date: uint, amount: uint})
(define-map nft-transfer-history {nft-index: uint, transfer-counter: uint} {sale-cycle: uint, from: principal, to: principal, sale-type: uint, when: uint, amount: uint})

;; counters keep track per NFT of the... 
;;       a) number of editions minted (1 based index)  
;;       b) number of offers made (0 based index)  
;;       c) number of bids made (0 based index)  
(define-map nft-offer-counter {nft-index: uint} {offer-counter: uint, sale-cycle: uint})
(define-map nft-edition-counter {nft-index: uint} {edition-counter: uint})
(define-map nft-high-bid-counter {nft-index: uint} {high-bid-counter: uint, bidder: principal, amount: uint, when-bid: uint, sale-cycle: uint})
(define-map nft-transfer-counter {nft-index: uint} {transfer-counter: uint})
>>>>>>> main

(define-constant not-allowed (err u10))
(define-constant not-found (err u11))
(define-constant amount-not-set (err u12))
(define-constant seller-not-found (err u13))
(define-constant asset-not-registered (err u14))
(define-constant transfer-error (err u15))
(define-constant not-approved-to-sell (err u16))
(define-constant same-spender-err (err u17))
(define-constant failed-to-mint-err (err u18))
(define-constant edition-counter-error (err u19))
(define-constant edition-limit-reached (err u20))
(define-constant user-amount-different (err u21))
(define-constant failed-to-stx-transfer (err u22))
(define-constant failed-to-close-1 (err u23))
(define-constant failed-to-close-2 (err u24))
(define-constant failed-to-close-3 (err u24))
(define-constant cant-pay-mint-price (err u25))
(define-constant editions-error (err u26))

;; public methods
;; --------------
;; the contract administrator can change the contract administrator
(define-public (transfer-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get administrator) tx-sender) not-allowed)
        (var-set administrator new-administrator)
        (ok true)
    )
)

;; the contract administrator can change the transfer fee charged by the contract on sale of tokens
(define-public (change-fee (new-fee uint))
    (begin
        (asserts! (is-eq (var-get administrator) tx-sender) not-allowed)
        (var-set platform-fee new-fee)
        (ok true)
    )
)

;; the contract administrator can change the base uri - where meta data for tokens in this contract
;; are located
(define-public (update-base-token-uri (new-base-token-uri (buff 100)))
    (begin
        (asserts! (is-eq (var-get administrator) tx-sender) not-allowed)
        (var-set base-token-uri new-base-token-uri)
        (ok true)
    )
)

;; the contract administrator can change the mint price
(define-public (update-mint-price (new-mint-price uint))
    (begin
        (asserts! (is-eq (var-get administrator) tx-sender) not-allowed)
        (var-set mint-price new-mint-price)
        (ok true)
    )
)

;; the contract administrator can change the mint price
(define-public (make-offer (nft-index uint) (amount uint))
    (let
        (
            (saleType (unwrap! (get sale-type (map-get? nft-sale-data {nft-index: nft-index})) not-allowed))
            (offerCounter (get offer-counter (map-get? nft-offer-counter {nft-index: nft-index})))
            (block-time (unwrap! (get-block-info? time u0) not-allowed))
            (saleCycleIndex (unwrap! (get sale-cycle-index (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
        )
        (asserts! (is-eq saleType u3) not-allowed)
        (if (is-none offerCounter)
            (begin 
                (map-insert nft-offer-history {nft-index: nft-index, offer-index: u0} {sale-cycle: saleCycleIndex, offerer: tx-sender, made-date: block-time, amount: amount})
                (map-insert nft-offer-counter {nft-index: nft-index} {sale-cycle: saleCycleIndex, offer-counter: u0})
                (ok u1)
            )
            (begin
                (map-insert nft-offer-history {nft-index: nft-index, offer-index: (+ (unwrap! offerCounter not-allowed) u1)} {sale-cycle: saleCycleIndex, offerer: tx-sender, made-date: block-time, amount: amount})
                (map-insert nft-offer-counter {nft-index: nft-index} {sale-cycle: saleCycleIndex, offer-counter: (+ (unwrap! offerCounter not-allowed) u1)})
                (ok u2)
            )
        )
    )
)

;; mint a new token
;; asset-hash: sha256 hash of asset file
;; max-editions: maximum number of editions allowed for this asset
;; royalties: a list of priciple/percentages to be be paid from sale price
;;
;; 1. transfer mint price to the administrator
;; 2. mint the token using built in mint function
;; 3. update the two maps - first contains the data indexed by the nft index, second
;; provides a reverse lookup based on the asset hash - this allows tokens to be located
;; from just a knowledge of the original asset.
;; Note series-original in the case of the original in series is just
;; mintCounter - for editions this provides a safety hook back to the original in cases
;; where the asset hash is unknown (ie cant be found from nft-lookup).
(define-public (mint-token (asset-hash (buff 32)) (max-editions uint) (addresses (list 10 principal)) (shares (list 10 uint)))
    (let
        (
            (mintCounter (var-get mint-counter))
            (ahash (get asset-hash (map-get? nft-data {nft-index: (var-get mint-counter)})))
            (block-time (unwrap! (get-block-info? time u0) amount-not-set))
        )
        (asserts! (> max-editions u0) editions-error)
        (asserts! (> (stx-get-balance tx-sender) (var-get mint-price)) cant-pay-mint-price)
        (asserts! (is-none ahash) asset-not-registered)

        ;; Note: series original is really for later editions to refer back to this one - this one IS the series original
        (map-insert nft-data {nft-index: mintCounter} {asset-hash: asset-hash, max-editions: max-editions, edition: u1, date: block-height, series-original: mintCounter})
        
        ;; Note editions are 1 based and <= max-editions - the one minted here is #1
        (map-insert nft-edition-counter {nft-index: mintCounter} {edition-counter: u1})
        
        ;; By default we accept offers - sale type can be changed via the UI.
        (map-insert nft-sale-data { nft-index: mintCounter } { sale-cycle-index: u1, sale-type: u3, increment-stx: u0, reserve-stx: u0, amount-stx: u0, bidding-end-time: (+ block-time u1814400)})
        
        (map-insert nft-lookup {asset-hash: asset-hash, edition: u1} {nft-index: mintCounter})

        ;; The payment is split between the nft-beneficiaries with share > 0 they are set per edition
        (map-insert nft-beneficiaries {nft-index: mintCounter} {addresses: addresses, shares: shares})

        ;; finally - mint the NFT and step the counter
        (if (is-eq tx-sender (var-get administrator))
            (print "tx-sender is contract - skipping mint price")
            (begin 
                (unwrap! (stx-transfer? (var-get mint-price) tx-sender (var-get administrator)) failed-to-stx-transfer)
                (print "tx-sender paid mint price")
            )
        )
        (unwrap! (nft-mint? my-nft mintCounter tx-sender) failed-to-mint-err)
        (var-set mint-counter (+ mintCounter u1))
        (ok mintCounter)
    )
)

(define-public (mint-edition (nft-index uint) (nextBidAmount uint))
    (let
        (
            ;; before we start... check the hash corresponds to a minted asset
            (ahash (unwrap! (get asset-hash (map-get? nft-data {nft-index: nft-index})) failed-to-mint-err))
            (mintCounter (var-get mint-counter))
            (saleType (unwrap! (get sale-type (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (amount (unwrap! (get amount-stx (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (currentAmount (get amount (map-get? nft-high-bid-counter {nft-index: nft-index})))
            (increment (unwrap! (get increment-stx (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (editionCounter (unwrap! (get edition-counter (map-get? nft-edition-counter {nft-index: nft-index})) failed-to-mint-err))
            (maxEditions (unwrap! (get max-editions (map-get? nft-data {nft-index: nft-index})) failed-to-mint-err))
        )
        (asserts! (or (is-eq saleType u1) (is-eq saleType u2)) not-approved-to-sell)
        (asserts! (is-none (get nft-index (map-get? nft-lookup {asset-hash: ahash, edition: editionCounter}))) failed-to-mint-err)
        (asserts! (> editionCounter u0) edition-counter-error)
        (asserts! (< editionCounter maxEditions) edition-limit-reached)
        (asserts! (> (stx-get-balance tx-sender) amount) failed-to-mint-err)
        
        ;; saleType=1 -> buy now - nextBidAmount must equal buy now amount-stx
        ;; saleType=2 -> bidding - nextBidAmount must equal amount-stx plus the increment
        ;; throws - user is not expecting to pay this amount.
        (if (is-eq saleType u1)
            (asserts! (is-eq nextBidAmount amount) user-amount-different)
            (if (is-some currentAmount)
                (asserts! (is-eq nextBidAmount (+ (unwrap! currentAmount failed-to-mint-err) increment)) user-amount-different)
                (asserts! (is-eq nextBidAmount (+ amount increment)) user-amount-different)
            )
        )

        ;; check the buyer/bidder has enough funds..
        (asserts! (> (stx-get-balance tx-sender) nextBidAmount) failed-to-mint-err)

        ;; set the edition-counter counter to next edition
        (map-set nft-edition-counter {nft-index: nft-index} {edition-counter: (+ editionCounter u1)})

        ;; set max editions to zero and edition to current edition counter to indicate this is an edition
        (map-insert nft-data {nft-index: mintCounter} {asset-hash: ahash, max-editions: u0, edition: editionCounter, date: block-height, series-original: nft-index})

        ;; put the nft index into the list of editions in the look up map
        (map-insert nft-lookup {asset-hash: ahash, edition: (+ editionCounter u1)} {nft-index: mintCounter})

        ;; By default we accept offers - sale type can be changed via the UI.
        (map-insert nft-sale-data { nft-index: mintCounter } { sale-cycle-index: u1, sale-type: u3, increment-stx: u0, reserve-stx: u0, amount-stx: u0, bidding-end-time: (+ block-time u1814400)})

        ;; mint the NFT and update the counter for the next..
        (unwrap! (nft-mint? my-nft mintCounter tx-sender) failed-to-mint-err)
        (var-set mint-counter (+ mintCounter u1))

        ;; saleType = 1 (buy now) - split out the payments according to royalties - or roll everything back.
        (if (is-eq saleType u1)
            (is-ok (payment-split nft-index))
            (is-ok (place-bid nft-index nextBidAmount))
        )
        (ok mintCounter)
    )
)

;; set-sale-data updates the sale type and purchase info for a given NFT. Only the owner can call this method
;; and doing so make the asset transferable by the recipient - on condition of meeting the conditions of sale
;; This is equivalent to the setApprovalForAll method in ERC 721 contracts.
;; Assumption being made here is that all editions have the same sale data associated
(define-public (set-sale-data (nftIndex uint) (sale-type uint) (increment-stx uint) (reserve-stx uint) (amount-stx uint) (bidding-end-time uint))
    (let
        (
            ;; before we start... check the hash corresponds to a minted asset
            (saleCycleIndex (unwrap! (get sale-cycle-index (map-get? nft-sale-data {nft-index: nftIndex})) amount-not-set))
        )
        (if
            (is-ok (is-nft-owner nftIndex))
            ;; Note - don't override the sale cyle index here as this is a public method and can be called ad hoc. Sale cycle is update at end of sale!
            (if (map-set nft-sale-data {nft-index: nftIndex} {sale-cycle-index: saleCycleIndex, sale-type: sale-type, increment-stx: increment-stx, reserve-stx: reserve-stx, amount-stx: amount-stx, bidding-end-time: bidding-end-time})
                (ok nftIndex) not-allowed
            )
            not-allowed
        )
    )
)

;; Mint subsequent editions of the NFT
;; nft-index: the index of the original NFT in this series of editions.
;; The sale data must have been set on the asset before calling this.
;; The amount is split according to the royalties. 
;; The nextBidAmount is passed to avoid concurrency issues - amount on the buy/bid button must 
;; equal the amount expected by the contract.

;; close-bidding
;; nft-index: index of the NFT
;; closeType: type of closure, values are;
;;             1 = buy now closure - uses the last bid (thats held in escrow) to transfer the item to the bidder and to pay royalties
;;             2 = refund closure - the last bid gets refunded and sale is closed. The item ownership does not change.
;; Note bidding can also be closed automatically - if a bid is received after the bidding end time.
;; In the context of a 'live auction' items have no end time and are closed by the 'auctioneer'.
(define-public (close-bidding (nft-index uint) (closeType uint))
    (let
        (
            (saleType (unwrap! (get sale-type (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (currentBidder (get bidder (map-get? nft-high-bid-counter {nft-index: nft-index})))
            (currentBidIndex (get high-bid-counter (map-get? nft-high-bid-counter {nft-index: nft-index})))
            (currentAmount (get amount (map-get? nft-high-bid-counter {nft-index: nft-index})))
            (saleCycleIndex (unwrap! (get sale-cycle-index (map-get? nft-sale-data {nft-index: nft-index})) failed-to-close-1))
        )
        (asserts! (or (is-eq closeType u1) (is-eq closeType u2)) failed-to-close-1)

        ;; Check for a current bid - if none then just reset the sale data to not selling
        (if (is-none currentAmount)
            (map-set nft-sale-data { nft-index: nft-index } { sale-cycle-index: (+ saleCycleIndex u1), sale-type: u0, increment-stx: u0, reserve-stx: u0, amount-stx: u0, bidding-end-time: u0})
            (if (is-eq closeType u1)
                (begin
                    ;; buy now closure - pay and transfer ownership
                    (unwrap! (payment-split nft-index) failed-to-close-2)
                    (unwrap! (nft-transfer? my-nft nft-index (unwrap! currentBidder failed-to-close-3) tx-sender) failed-to-close-2)
                )
                (begin
                    ;; refund closure - refund the bid and reset sale data
                    (unwrap! (refund-bid nft-index (unwrap! currentBidder failed-to-close-1) (unwrap! currentAmount failed-to-stx-transfer)) failed-to-close-2)
                    (map-set nft-sale-data { nft-index: nft-index } { sale-cycle-index: (+ saleCycleIndex u1), sale-type: u0, increment-stx: u0, reserve-stx: u0, amount-stx: u0, bidding-end-time: u0})
                )
            )
        )
        (ok nft-index)
    )
)

;; transfer - differs from blockstack nft contract in that the tx-sender is the recipient
;; of the asset rather than the owner.
;; tx-sender / buyer transfers 'platform-fee'% of the buy now amount to the
;; contract miner-address remainder to the seller address. Reset the
;; map data in nft-sale-data and my-nft data to indicate not for sale and BNS
;; name of new owner.
(define-public (transfer-from (nft-index uint))
    (let
        (
            (saleType (unwrap! (get sale-type (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (saleCycleIndex (unwrap! (get sale-cycle-index (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (amount (unwrap! (get amount-stx (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (owner (unwrap! (nft-get-owner? my-nft nft-index) seller-not-found))
            (ahash (get asset-hash (map-get? nft-data {nft-index: nft-index})))
            (platformFee (var-get platform-fee))
        )
        (asserts! (is-some ahash) asset-not-registered)
        (asserts! (is-eq saleType u1) not-approved-to-sell)
        (asserts! (> amount u0) amount-not-set)

        (let ((count (inc-transfer-count nft-index)))
            (unwrap! (add-transfer nft-index (- count u1) owner tx-sender saleType u0 amount) failed-to-mint-err)
        )

        ;; (map-set nft-data { nft-index: nft-index } { asset-hash: (unwrap! ahash not-found),  edition: edition, date: block-height, series-original: nft-index })
        (map-set nft-sale-data { nft-index: nft-index } { sale-cycle-index: (+ saleCycleIndex u1), sale-type: u0, increment-stx: u0, reserve-stx: u0, amount-stx: u0, bidding-end-time: u0})

        (unwrap! (stx-transfer? (/ (* amount platformFee) u100) tx-sender (var-get administrator)) failed-to-stx-transfer)
        (unwrap! (stx-transfer? (/ (* amount (- u100 platformFee)) u100) tx-sender owner) failed-to-stx-transfer)
        (unwrap! (nft-transfer? my-nft nft-index owner tx-sender) failed-to-mint-err)
        (ok nft-index)
    )
)

;; Transfers tokens to a specified principal.
(define-public (transfer (seller principal) (nft-index uint))
    (if (is-ok (transfer-from nft-index))
        (ok u0) (err u1)
    )
)

;; not yet implemented
(define-public (balance-of (recipient principal))
  (if (is-eq tx-sender recipient)
      (ok u0)
      (err u1)
  )
)

;; read only methods
;; ---------------
(define-read-only (get-administrator)
    (var-get administrator))

(define-read-only (is-administrator)
    (ok (is-eq (var-get administrator) tx-sender)))

(define-read-only (get-base-token-uri)
    (var-get base-token-uri))

(define-read-only (get-mint-counter)
  (ok (var-get mint-counter))
)

(define-read-only (get-mint-price)
    (var-get mint-price))

(define-read-only (get-token-by-index (nftIndex uint))
    (ok (get-all-data nftIndex))
)

;; Get the edition from a knowledge of the #1 edition and the specific edition number
(define-read-only (get-edition-by-hash (asset-hash (buff 32)) (edition uint))
    (let
        (
            (nftIndex (unwrap! (get nft-index (map-get? nft-lookup {asset-hash: asset-hash, edition: edition})) amount-not-set))
        )
        (ok (get-all-data nftIndex))
    )
)


(define-read-only (get-token-by-hash (asset-hash (buff 32)))
    (let
        (
            (nftIndex (unwrap! (get nft-index (map-get? nft-lookup {asset-hash: asset-hash, edition: u1})) amount-not-set))
        )
        (ok (get-all-data nftIndex))
    )
)

(define-private (get-all-data (nftIndex uint))
    (let
        (
            (the-owner                  (unwrap-panic (nft-get-owner? my-nft nftIndex)))
            (the-bid-history            (map-get? nft-bid-history {nft-index: nftIndex, bid-index: u0}))
            (the-transfer-map           (map-get? nft-transfer-counter {nft-index: nftIndex}))
            (the-transfer-history-map   (map-get? nft-transfer-history {nft-index: nftIndex, transfer-counter: u0}))
            (the-offers                 (map-get? nft-offer-history {nft-index: nftIndex, offer-index: u0}))
            (the-token-info             (map-get? nft-data {nft-index: nftIndex}))
            (the-sale-data              (map-get? nft-sale-data {nft-index: nftIndex}))
            (the-transfer-counter       (default-to u0 (get transfer-counter (map-get? nft-transfer-counter {nft-index: nftIndex}))))
            (the-edition-counter        (default-to u0 (get edition-counter (map-get? nft-edition-counter {nft-index: nftIndex}))))
            (the-offer-counter          (default-to u0 (get offer-counter (map-get? nft-offer-counter {nft-index: nftIndex}))))
            (the-high-bid-counter       (default-to u0 (get high-bid-counter (map-get? nft-high-bid-counter {nft-index: nftIndex}))))
        )
        (ok (tuple  (offerCounter the-offer-counter) 
                    (bidCounter the-high-bid-counter) 
                    (editionCounter the-edition-counter) 
                    (nftIndex nftIndex) 
                    (tokenInfo the-token-info) 
                    (saleData the-sale-data)
                    (owner the-owner) 
                    (transferCounter the-transfer-counter)))
    )
)

(define-read-only (get-sale-data (nft-index uint))
    (match (map-get? nft-sale-data {nft-index: nft-index})
        mySaleData
        (ok mySaleData)
        not-found
    )
)

(define-read-only (get-transfer-count (nft-index uint))
  (let
      (
          (count (default-to u0 (get transfer-counter (map-get? nft-transfer-counter (tuple (nft-index nft-index))))))
      )
      (ok count)
  )
)

(define-read-only (get-token-name)
    (ok token-name)
)

(define-read-only (get-token-symbol)
    (ok token-symbol)
)

;; private methods
;; ---------------
;;
;; place-bid
;; nft-index: unique index for NFT
;; nextBidAmount: amount the user is bidding - i.e the amount display on th place bid button.
(define-private (place-bid (nft-index uint) (nextBidAmount uint))
    (let
        (
            (block-time (unwrap! (get-block-info? time u0) amount-not-set))
            (bidding-end-time (unwrap! (get bidding-end-time (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (saleType (unwrap! (get sale-type (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (saleCycle (unwrap! (get sale-cycle-index (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (amountStart (unwrap! (get amount-stx (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (increment (unwrap! (get increment-stx (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (currentBidder (get bidder (map-get? nft-high-bid-counter {nft-index: nft-index})))
            (currentBidIndex (get high-bid-counter (map-get? nft-high-bid-counter {nft-index: nft-index})))
            (currentAmount (get amount (map-get? nft-high-bid-counter {nft-index: nft-index})))
        )

        ;; Check the user bid amount is the opening price OR the current bid plus increment
        (if (is-none currentAmount)
            (asserts! (is-eq nextBidAmount amountStart) user-amount-different)
            (asserts! (is-eq nextBidAmount (+ (unwrap! currentAmount user-amount-different) increment)) user-amount-different)
        )
        
        ;; if (bidding-end-time > block-time) then this is either the last-bid or a too late bid on the NFT
        ;; a too late bid will have been rejected as the last bid resets the sale/bidding data on the item.
        ;; if its the last bid...
        ;;               1. Refund the currentBid to the bidder
        ;;               2. move currentBid to bid history
        ;;               3. Set the bid in nft-high-bid-counter - note 'set' so we overwrite the previous bid
        ;; if (!currentBid) then this is the first-bid on the NFT
        ;;               1. Transfer amount into the contract
        ;;               2. Save the bid in nft-bid-history
        ;;               3. Insert the bid in nft-high-bid-counter
        ;; otherwise (next-bid) we
        ;;               1. Refund the currentBid to the bidder
        ;;               2. Insert currentBid to bid history
        ;;               3. Set the bid in nft-high-bid-counter - note 'set' so we overwrite the previous bid

        (if (and (is-some currentBidIndex) (> block-time bidding-end-time))
            (begin 
                (unwrap! (refund-bid nft-index (unwrap! currentBidder failed-to-stx-transfer) (unwrap! currentAmount failed-to-stx-transfer)) failed-to-stx-transfer)
                (unwrap! (last-bid nft-index nextBidAmount (unwrap! currentBidIndex failed-to-stx-transfer) saleCycle) failed-to-stx-transfer)
            )
            (if (is-none currentBidIndex)
                (unwrap! (first-bid nft-index nextBidAmount saleCycle) failed-to-stx-transfer)
                (begin 
                    (unwrap! (refund-bid nft-index (unwrap! currentBidder failed-to-stx-transfer) (unwrap! currentAmount failed-to-stx-transfer)) failed-to-stx-transfer)
                    (unwrap! (next-bid nft-index nextBidAmount (unwrap! currentBidIndex failed-to-stx-transfer) saleCycle) failed-to-stx-transfer)
                )
            )
        )
        ;;
        ;; NOTE: Above code will only reconcile IF a bid comes in after 'block-time'
        ;; We may need a manual trigger to end bidding when this doesn't happen - unless there is a 
        ;; to repond to future events / timeouts that I dont know about.
        ;;
        (ok true)
    )
)

(define-private (refund-bid (nft-index uint) (currentBidder principal) (currentAmount uint))
    (begin
        (as-contract (stx-transfer? currentAmount tx-sender currentBidder))
    )
)
(define-private (last-bid (nft-index uint) (bidAmount uint) (currentBidIndex uint) (bidding-end-time uint) (saleCycle uint))
    (begin
        (unwrap! (stx-transfer? bidAmount tx-sender (var-get administrator)) failed-to-stx-transfer)
        (map-insert nft-bid-history {nft-index: nft-index, bid-index: (+ currentBidIndex u1)} {bidder: tx-sender, amount: bidAmount, when-bid: bidding-end-time, sale-cycle: saleCycle})
        (map-insert nft-high-bid-counter {nft-index: nft-index} {high-bid-counter: (+ currentBidIndex u1), bidder: tx-sender, amount: bidAmount, when-bid: bidding-end-time, sale-cycle: saleCycle})
        (ok true)
    )
)
(define-private (next-bid (nft-index uint) (bidAmount uint) (currentBidIndex uint) (bidding-end-time uint) (saleCycle uint))
    (begin
        (unwrap! (stx-transfer? bidAmount tx-sender (var-get administrator)) failed-to-stx-transfer)
        (map-insert nft-bid-history {nft-index: nft-index, bid-index: (+ currentBidIndex u1)} {bidder: tx-sender, amount: bidAmount, when-bid: bidding-end-time, sale-cycle: saleCycle})
        (map-set nft-high-bid-counter {nft-index: nft-index} {high-bid-counter: (+ currentBidIndex u1), bidder: tx-sender, amount: bidAmount, when-bid: bidding-end-time, sale-cycle: saleCycle})
        (ok true)
    )
)
(define-private (first-bid (nft-index uint) (bidAmount uint) (bidding-end-time uint) (saleCycle uint))
    (begin
        (unwrap! (stx-transfer? bidAmount tx-sender (var-get administrator)) failed-to-stx-transfer)
        (map-insert nft-bid-history {nft-index: nft-index, bid-index: u0} {bidder: tx-sender, amount: bidAmount, when-bid: bidding-end-time, sale-cycle: saleCycle})
        (map-insert nft-high-bid-counter {nft-index: nft-index} {high-bid-counter: u0, bidder: tx-sender, amount: bidAmount, when-bid: bidding-end-time, sale-cycle: saleCycle})
        (ok true)
    )
)

(define-private (payment-split (nft-index uint))
    (let
        (
            (addresses (unwrap! (get addresses (map-get? nft-beneficiaries {nft-index: nft-index})) failed-to-mint-err))
            (shares (unwrap! (get shares (map-get? nft-beneficiaries {nft-index: nft-index})) failed-to-mint-err))
            (saleType (unwrap! (get sale-type (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (saleAmount (unwrap! (get amount-stx (map-get? nft-sale-data {nft-index: nft-index})) amount-not-set))
            (owner (unwrap! (nft-get-owner? my-nft nft-index) seller-not-found))
        )
        (asserts! (or (is-eq saleType u1) (is-eq saleType u2)) not-approved-to-sell)
        ;; is there a way to also pass nft-index in this map function? (ok (map pay-royalty addresses shares)))
        (if (>= (len addresses) u1)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u0) not-allowed) (unwrap! (element-at shares u0) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u2)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u1) not-allowed) (unwrap! (element-at shares u1) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u3)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u2) not-allowed) (unwrap! (element-at shares u2) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u4)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u3) not-allowed) (unwrap! (element-at shares u3) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u5)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u4) not-allowed) (unwrap! (element-at shares u4) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u6)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u5) not-allowed) (unwrap! (element-at shares u5) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u7)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u6) not-allowed) (unwrap! (element-at shares u6) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u8)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u7) not-allowed) (unwrap! (element-at shares u7) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u9)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u8) not-allowed) (unwrap! (element-at shares u8) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        (if (>= (len addresses) u10)
            (unwrap! (pay-royalty saleAmount (unwrap! (element-at addresses u9) not-allowed) (unwrap! (element-at shares u9) not-allowed)) not-allowed)
            (unwrap! (ok true) not-allowed)
        )
        ;; (if (> share1 u0) (pay-royalty saleAmount address1 share1) (ok true))
        (ok true)
    )
)

(define-private (pay-royalty (saleAmount uint) (payee principal) (share uint))
    (begin
        (unwrap! (stx-transfer? (/ (* saleAmount share) u10000) tx-sender payee) failed-to-mint-err)
        (ok true)
    )
)

(define-private (is-nft-owner (nft-index uint))
    (if (is-eq (some tx-sender) (nft-get-owner? my-nft nft-index))
        (ok true)
        not-allowed
    )
)

(define-private (inc-transfer-count (nft-index uint))
    (let
        (
            (count (default-to u0 (get transfer-counter (map-get? nft-transfer-counter (tuple (nft-index nft-index))))))
        )
        (begin
            (map-insert nft-transfer-counter { nft-index: nft-index } { transfer-counter: count})
            (+ count u1)
        )
    )
)

(define-private (add-transfer (nftIndex uint) (transfer-counter uint) (from principal) (to principal) (sale-type uint) (when uint) (amount uint))
    (let
        (
            (saleCycleIndex (unwrap! (get sale-cycle-index (map-get? nft-sale-data {nft-index: nftIndex})) amount-not-set))
        )
        (begin
            (if (is-eq to tx-sender)
                (ok (map-insert nft-transfer-history {nft-index: nftIndex, transfer-counter: transfer-counter} {sale-cycle: saleCycleIndex, from: from, to: to, sale-type: sale-type, when: when, amount: amount}))
                not-allowed
            )
        )
    )
)