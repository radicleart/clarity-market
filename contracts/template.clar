;; Interface definitions
;; (impl-trait 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW.nft-interface.transferable-nft-trait)
(impl-trait 'params.platformAddress.nft-interface.tradable-nft-trait)

;; contract variables
(define-data-var administrator principal 'params.contractOwner)
(define-data-var mint-price uint uparams.mintPrice)
(define-data-var base-token-uri (buff 100) params.callBack)
(define-data-var mint-counter uint u0)
(define-data-var platform-fee uint u5)
;; constants
(define-constant token-name "params.tokenName")
(define-constant token-symbol "params.tokenSymbol")

;; Non Fungible Token, modeled after ERC-721 via transferable-nft-trait
;; Note this is a basic implementation - no support yet for setting approvals for assets
;; NFT are identified by nft-index (uint) which is tied via a reverse lookup to a real world
;; asset hash - SHA 256 32 byte value. The Asset Hash is used to tie arbitrary real world
;; data to the NFT
(define-non-fungible-token my-nft uint)


;; data structures
(define-map beneficiaries {nft-index: uint} {addresses: (list 10 principal), shares: (list 10 uint)})
(define-map my-nft-lookup {asset-hash: (buff 32), edition: uint} {nft-index: uint})
(define-map my-nft-data {nft-index: uint} {asset-hash: (buff 32), max-editions: uint, edition: uint, date: uint, series-original: uint})
(define-map my-nft-edition-pointer {nft-index: uint} {current-edition: uint})
(define-map sale-data {nft-index: uint} {sale-type: uint, increment-stx: uint, reserve-stx: uint, amount-stx: uint, bidding-end-time: uint})
(define-map transfer-map {nft-index: uint} {transfer-count: uint})
(define-map transfer-history-map {nft-index: uint, transfer-count: uint} {from: principal, to: principal, sale-type: uint, when: uint, amount: uint})

(define-constant not-allowed (err u10))
(define-constant not-found (err u11))
(define-constant amount-not-set (err u12))
(define-constant seller-not-found (err u13))
(define-constant asset-not-registered (err u14))
(define-constant transfer-error (err u15))
(define-constant not-approved-to-sell (err u16))

(define-constant same-spender-err (err u17))
(define-constant failed-to-mint-err (err u18))

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
;; where the asset hash is unknown (ie cant be found from my-nft-lookup).
(define-public (mint-token (asset-hash (buff 32)) (max-editions uint) (addresses (list 10 principal)) (shares (list 10 uint)))
    (let
        (
            (mintCounter (var-get mint-counter))
            (ahash (get asset-hash (map-get? my-nft-data {nft-index: (var-get mint-counter)})))
        )
        (asserts! (> (stx-get-balance tx-sender) (var-get mint-price)) failed-to-mint-err)
        (asserts! (is-none ahash) asset-not-registered)

        ;; transfer stx if there is enough to pay for mint, otherwith throws an error
        (map-insert my-nft-data {nft-index: mintCounter} {asset-hash: asset-hash, max-editions: max-editions, edition: u0, date: block-height, series-original: mintCounter})
        (map-insert my-nft-edition-pointer {nft-index: mintCounter} {current-edition: u1})
        (map-insert my-nft-lookup {asset-hash: asset-hash, edition: u0} {nft-index: mintCounter})

        (map-insert beneficiaries {nft-index: mintCounter} {addresses: addresses, shares: shares})
        ;; finally - mint the NFT and step the counter
        (unwrap! (as-contract
            (stx-transfer? (var-get mint-price) tx-sender (var-get administrator))) failed-to-mint-err)
        (unwrap! (nft-mint? my-nft mintCounter tx-sender) failed-to-mint-err)
        (var-set mint-counter (+ mintCounter u1))
        (ok mintCounter)
    )
)

;; Mint subsequent editions of the NFT
;; nft-index: the index of the original NFT in this series of editions.
;; The sale data must have been set on the asset before calling this.
;; The amount is split according to the royalties
(define-public (mint-edition (nft-index uint) (edition uint))
    (let
        (
            ;; before we start... check the hash corresponds to a minted asset
            (ahash (unwrap! (get asset-hash (map-get? my-nft-data {nft-index: nft-index})) failed-to-mint-err))
            (mintCounter (var-get mint-counter))
            (editionCounter (unwrap! (get current-edition (map-get? my-nft-edition-pointer {nft-index: nft-index})) failed-to-mint-err))
            (saleType (unwrap! (get sale-type (map-get? sale-data {nft-index: nft-index})) amount-not-set))
            (amount (unwrap! (get amount-stx (map-get? sale-data {nft-index: nft-index})) amount-not-set))
            (maxEditions (unwrap! (get max-editions (map-get? my-nft-data {nft-index: nft-index})) failed-to-mint-err))
        )
        (asserts! (or (is-eq saleType u1) (is-eq saleType u2)) not-approved-to-sell)
        (asserts! (is-none (get nft-index (map-get? my-nft-lookup {asset-hash: ahash, edition: edition}))) failed-to-mint-err)
        (asserts! (> edition u0) failed-to-mint-err)
        (asserts! (<= edition maxEditions) not-allowed)
        (asserts! (> (stx-get-balance tx-sender) amount) failed-to-mint-err)


        ;; set the current-edition pointer to next edition
        (map-set my-nft-edition-pointer {nft-index: nft-index} {current-edition: (+ editionCounter u1)})

        ;; set max editions to zero and edition to current edition pointer to indicate this is an edition
        (map-insert my-nft-data {nft-index: mintCounter} {asset-hash: ahash, max-editions: u0, edition: editionCounter, date: block-height, series-original: nft-index})

        ;; put the nft index into the list of editions in the look up map
        (map-insert my-nft-lookup {asset-hash: ahash, edition: editionCounter} {nft-index: mintCounter})

        ;; mint the NFT and update the counter for the next..
        (unwrap! (nft-mint? my-nft mintCounter tx-sender) failed-to-mint-err)
        (var-set mint-counter (+ mintCounter u1))

        ;; finally send the payments - or roll everything back.
        (if (is-ok (payment-split nft-index))
            (ok mintCounter) not-allowed
        )
    )
)

;; set-sale-data updates the sale type and purchase info for a given NFT. Only the owner can call this method
;; and doing so make the asset transferable by the recipient - on condition of meeting the conditions of sale
;; This is equivalent to the setApprovalForAll method in ERC 721 contracts.
(define-public (set-sale-data (myIndex uint) (sale-type uint) (increment-stx uint) (reserve-stx uint) (amount-stx uint) (bidding-end-time uint))
    (begin
        (if
            (is-ok (is-nft-owner myIndex))
            (if (map-set sale-data {nft-index: myIndex} {sale-type: sale-type, increment-stx: increment-stx, reserve-stx: reserve-stx, amount-stx: amount-stx, bidding-end-time: bidding-end-time})
                (ok myIndex) not-allowed
            )
            not-allowed
        )
    )
)

;; transfer - differs from blockstack nft contract in that the tx-sender is the recipient
;; of the asset rather than the owner.
;; tx-sender / buyer transfers 'platform-fee'% of the buy now amount to the
;; contract miner-address remainder to the seller address. Reset the
;; map data in sale-data and my-nft data to indicate not for sale and BNS
;; name of new owner.
(define-public (transfer-from (nft-index uint))
    (let
        (
            (saleType (unwrap! (get sale-type (map-get? sale-data {nft-index: nft-index})) amount-not-set))
            (amount (unwrap! (get amount-stx (map-get? sale-data {nft-index: nft-index})) amount-not-set))
            (owner (unwrap! (nft-get-owner? my-nft nft-index) seller-not-found))
            (ahash (get asset-hash (map-get? my-nft-data {nft-index: nft-index})))
            (platformFee (var-get platform-fee))
        ) 
        (asserts! (is-some ahash) asset-not-registered)
        (asserts! (is-eq saleType u1) not-approved-to-sell)
        (asserts! (> amount u0) amount-not-set)

        (let ((count (inc-transfer-count nft-index)))
            (unwrap! (add-transfer nft-index (- count u1) owner tx-sender saleType u0 amount) failed-to-mint-err)
        )

        ;; (map-set my-nft-data { nft-index: nft-index } { asset-hash: (unwrap! ahash not-found),  edition: edition, date: block-height, series-original: nft-index })
        (map-set sale-data { nft-index: nft-index } { amount-stx: u0, bidding-end-time: u0, increment-stx: u0, reserve-stx: u0, sale-type: u0 })
        (unwrap! (stx-transfer? (/ (* amount platformFee) u100) tx-sender (var-get administrator)) failed-to-mint-err)
        (unwrap! (stx-transfer? (/ (* amount (- u100 platformFee)) u100) tx-sender owner) failed-to-mint-err)
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

(define-read-only (get-token-info (nft-index uint))
    (map-get? my-nft-data {nft-index: nft-index})
)

(define-read-only (get-token-info-full (nft-index uint))
    (let
        (
            (the-token-info (map-get? my-nft-data {nft-index: nft-index}))
            (the-sale-data (map-get? sale-data {nft-index: nft-index}))
            (the-owner (unwrap-panic (nft-get-owner? my-nft nft-index)))
            (the-tx-count (default-to u0 (get transfer-count (map-get? transfer-map (tuple (nft-index nft-index))))))
        )
        (ok (tuple (token-info the-token-info) (sale-data the-sale-data) (owner the-owner) (transfer-count the-tx-count)))
    )
)

(define-read-only (get-index (asset-hash (buff 32)))
    (match (map-get? my-nft-lookup {asset-hash: asset-hash, edition: u0})
        indices
        (ok (get nft-index indices))
        not-found
    )
)

(define-read-only (get-sale-data (nft-index uint))
    (match (map-get? sale-data {nft-index: nft-index})
        mySaleData
        (ok mySaleData)
        not-found
    )
)

(define-read-only (get-transfer-count (nft-index uint))
  (let
      (
          (count (default-to u0 (get transfer-count (map-get? transfer-map (tuple (nft-index nft-index))))))
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
(define-private (payment-split (nft-index uint))
    (let
        (
            (addresses (unwrap! (get addresses (map-get? beneficiaries {nft-index: nft-index})) failed-to-mint-err))
            (shares (unwrap! (get shares (map-get? beneficiaries {nft-index: nft-index})) failed-to-mint-err))
            (saleType (unwrap! (get sale-type (map-get? sale-data {nft-index: nft-index})) amount-not-set))
            (saleAmount (unwrap! (get amount-stx (map-get? sale-data {nft-index: nft-index})) amount-not-set))
            (owner (unwrap! (nft-get-owner? my-nft nft-index) seller-not-found))
        )
        (asserts! (or (is-eq saleType u1) (is-eq saleType u2)) not-approved-to-sell)
        (asserts! (> (stx-get-balance tx-sender) saleAmount) failed-to-mint-err)
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
            (count (default-to u0 (get transfer-count (map-get? transfer-map (tuple (nft-index nft-index))))))
        )
        (begin
            (map-insert transfer-map { nft-index: nft-index } { transfer-count: count})
            (+ count u1)
        )
    )
)

(define-private (add-transfer (nft-index uint) (transfer-count uint) (from principal) (to principal) (sale-type uint) (when uint) (amount uint))
  (if (is-eq to tx-sender)
    (ok (map-insert transfer-history-map {nft-index: nft-index, transfer-count: transfer-count} {from: from, to: to, sale-type: sale-type, when: when, amount: amount}))
    not-allowed
  )
)