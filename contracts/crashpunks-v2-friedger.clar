;; Interface definitions
(impl-trait .nft-trait.nft-trait)
(impl-trait .operable.operable)
;; (impl-trait .transferable.transferable)

;; contract variables

(define-data-var administrator principal 'SP3N4AJFZZYC4BK99H53XP8KDGXFGQ2PRSQP2HGT6)


;; TODO: MAKE SURE THIS MINT COUNTER IS CORRECT. SHOULD BE THE MINT-COUNTER FROM V1. DOUBLE CHECK IF OFF BY 1 ERROR
(define-data-var mint-counter uint u5721)

;; addresses to receive mint fee
(define-data-var collection-mint-addresses (list 4 principal) (list))
;; percent mint fee each address receives
(define-data-var collection-mint-shares (list 4 uint) (list))

;; addresses to receive royalty fees
;; first element at this list is ignored because the nft owner will be used
(define-data-var collection-royalty-addresses (list 10 principal) (list))
;; percent royalty fee each address receives
(define-data-var collection-royalty-shares (list 10 uint) (list))

;; TODO: update this
(define-data-var base-uri (string-ascii 80) "ipfs://Qmad43sssgNbG9TpC6NfeiTi9X6f9vPYuzgW2S19BEi49m/{id}")
(define-data-var metadata-frozen bool false)

;; constants
(define-constant percentage-with-twodp u10000000000)

;; 50 stx
(define-constant MINT-PRICE u50000000)

(define-constant token-name "crashpunks-v2")
(define-constant token-symbol "CPS-v2")
(define-constant COLLECTION-MAX-SUPPLY u9216)

(define-constant ERR-METADATA-FROZEN (err u101))
(define-constant ERR-COULDNT-GET-V1-DATA (err u102))
(define-constant ERR-COULDNT-GET-NFT-OWNER (err u103))
(define-constant ERR-PRICE-WAS-ZERO (err u104))
(define-constant ERR-NFT-NOT-LISTED-FOR-SALE (err u105))
(define-constant ERR-PAYMENT-ADDRESS (err u106))
(define-constant ERR-NFT-LISTED (err u107))
(define-constant ERR-COLLECTION-LIMIT-REACHED (err u108))
(define-constant ERR-MINT-PASS-LIMIT-REACHED (err u109))
(define-constant ERR-ADD-MINT-PASS (err u110))


(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-OWNER (err u402))
(define-constant ERR-NOT-V1-OWNER (err u403))
(define-constant ERR-NOT-ADMINISTRATOR (err u404))

(define-non-fungible-token crashpunks-v2 uint)

;; data structures

;; {owner, operator, nftIndex} -> boolean
;; if {owner, operator, nftIndex} is in map, then operator can perform actions on behalf of owner for this nftIndex
(define-map approvals {owner: principal, operator: principal, nft-index: uint} bool)
(define-map approvals-all {owner: principal, operator: principal} bool)

;; nftIndex -> price (in ustx)
;; if nftIndex is not in map, it is not listed for sale
(define-map nft-market uint {price: uint})

;; whitelist address -> # they can mint
(define-map mint-pass principal uint)

;; SIP-09: get last token id
(define-read-only (get-last-token-id)
  (ok (- (var-get mint-counter) u1))
)

;; SIP-09: URI for metadata associated with the token
(define-read-only (get-token-uri (id uint))
    (ok (some (var-get base-uri)))
)

;; SIP-09: Gets the owner of the 'Specified token ID.
(define-read-only (get-owner (nftIndex uint))
  (ok (nft-get-owner? crashpunks-v2 nftIndex))
)

;; SIP-09: Transfer
(define-public (transfer (nftIndex uint) (owner principal) (recipient principal))
    (begin
        (asserts! (unwrap! (is-approved nftIndex contract-caller) ERR-NOT-AUTHORIZED) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (map-get? nft-market nftIndex)) ERR-NFT-LISTED)
        (nft-transfer? crashpunks-v2 nftIndex owner recipient)
    )
)

;; operable
(define-read-only (is-approved (nftIndex uint) (operator principal))
    (let ((owner (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-COULDNT-GET-NFT-OWNER)))
        (ok (is-owned-or-approved nftIndex operator owner))
    )
)

;; operable
(define-public (set-approved (nftIndex uint) (operator principal) (approved bool))
    (let ((owner (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-COULDNT-GET-NFT-OWNER)))
        (ok (map-set approvals {owner: contract-caller, operator: operator, nft-index: nftIndex} approved))
    )
)

(define-public (set-approved-all (operator principal) (approved bool))
    (ok (map-set approvals-all {owner: contract-caller, operator: operator} approved))
)

;; public methods

;; upgrade from v1 to v2
;; Owner of crashpunks v1 calls this upgrade function
;; 1. Transfers v1 NFT to this contract
;; 2. This contract mints the v2 NFT with the same nftIndex for contract-caller
;; 3. This contract burns the v1 NFT
(define-public (upgrade-v1-to-v2 (nftIndex uint))
    ;; TODO: MAKE SURE THESE CONTRACT CALLS WORK, MAKE SURE THE CONRACT ADDRESSES WORKS FOR MAINNET
    (begin 
        ;; assert contract caller owns the v1 NFT at this nftIndex
        (asserts! (is-eq contract-caller (unwrap! (unwrap! (contract-call? .crashpunks-v1 get-owner nftIndex) ERR-NOT-V1-OWNER) ERR-NOT-V1-OWNER)) ERR-NOT-V1-OWNER)

        ;; 1. transfer v1 NFT to this contract
        (try! (contract-call? .crashpunks-v1 transfer nftIndex contract-caller (as-contract tx-sender)))
        
        ;; 2. Mint the v2 NFT with the same nftIndex for contract-caller
        (try! (nft-mint? crashpunks-v2 nftIndex contract-caller))

        ;; 3. Burn the v1 NFT
        (try! (contract-call? .crashpunks-v1 burn nftIndex (as-contract tx-sender)))
        (ok true)
    )
)

(define-public (batch-upgrade-v1-to-v2 (entries (list 200 uint)))
    (ok (fold upgrade-v1-to-v2-helper entries false))
)

(define-public (mint-token)
    (let (
            (mintCounter (var-get mint-counter))
            (mintPassBalance (get-mint-pass-balance contract-caller))
        )
        (asserts! (< mintCounter COLLECTION-MAX-SUPPLY) ERR-COLLECTION-LIMIT-REACHED)
        (asserts! (> mintPassBalance u0) ERR-MINT-PASS-LIMIT-REACHED)

        (try! (paymint-split MINT-PRICE contract-caller))
        (try! (nft-mint? crashpunks-v2 mintCounter contract-caller))
        (var-set mint-counter (+ mintCounter u1))
        (map-set mint-pass contract-caller (- mintPassBalance u1))
        (ok true)
    )
)

;; only size of list matters, content of list doesn't matter
(define-public (batch-mint-token (entries (list 20 uint)))
    (ok (fold mint-token-helper entries false))
)

;; fail-safe: allow admin to airdrop to recipient, hopefully will never be used
(define-public (admin-mint-airdrop (recipient principal) (nftIndex uint))
    (begin
        (asserts! (< nftIndex COLLECTION-MAX-SUPPLY) ERR-COLLECTION-LIMIT-REACHED)
        (asserts! (is-eq contract-caller (var-get administrator)) ERR-NOT-ADMINISTRATOR)
        (try! (nft-mint? crashpunks-v2 nftIndex recipient))
        (ok true)
    )
)

(define-public (set-mint-pass (account principal) (limit uint))
    (begin
        (asserts! (is-eq (var-get administrator) contract-caller) ERR-NOT-ADMINISTRATOR)
        (ok (map-set mint-pass account limit))
    )
)

(define-public (batch-set-mint-pass (entries (list 200 {account: principal, limit: uint})))
    (ok (fold set-mint-pass-helper entries false))
)

;; marketplace function
(define-public (list-item (nftIndex uint) (amount uint))
    (begin 
        (asserts! (unwrap! (is-approved nftIndex contract-caller) ERR-NOT-AUTHORIZED) ERR-NOT-AUTHORIZED)
        (asserts! (> amount u0) ERR-PRICE-WAS-ZERO)
        (ok (map-set nft-market nftIndex {price: amount}))
    )
)

;; marketplace function
(define-public (unlist-item (nftIndex uint))
    (begin 
        (asserts! (unwrap! (is-approved nftIndex contract-caller) ERR-NOT-AUTHORIZED) ERR-NOT-AUTHORIZED)
        (ok (map-delete nft-market nftIndex))
    )
)

;; marketplace function
(define-public (buy-now (nftIndex uint))
    (let 
        (
            (price (unwrap! (get price (map-get? nft-market nftIndex)) ERR-NFT-NOT-LISTED-FOR-SALE))
            (owner (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-COULDNT-GET-NFT-OWNER))
            (buyer contract-caller)
        )
        (try! (payment-split nftIndex price contract-caller))
        (try! (nft-transfer? crashpunks-v2 nftIndex owner buyer))
        (map-delete nft-market nftIndex)
        (ok true)
    )
)

(define-public (burn (nftIndex uint))
    (let ((owner (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-COULDNT-GET-NFT-OWNER)))
        (asserts! (is-eq owner contract-caller) ERR-NOT-OWNER)
        (map-delete nft-market nftIndex)
        (nft-burn? crashpunks-v2 nftIndex contract-caller)
    )
)

;; the contract administrator can change the contract administrator
(define-public (set-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get administrator) contract-caller) ERR-NOT-ADMINISTRATOR)
        (ok (var-set administrator new-administrator))
    )
)

(define-public (set-collection-royalties (new-mint-addresses (list 4 principal)) (new-mint-shares (list 4 uint)) (new-royalty-addresses (list 10 principal)) (new-royalty-shares (list 10 uint)))
    (begin
        (asserts! (is-eq (var-get administrator) contract-caller) ERR-NOT-ADMINISTRATOR)
        (var-set collection-mint-addresses new-mint-addresses)
        (var-set collection-mint-shares new-mint-shares)
        (var-set collection-royalty-addresses new-royalty-addresses)
        (var-set collection-royalty-shares new-royalty-shares)
        (ok true)
    )
)

(define-public (set-base-uri (new-base-uri (string-ascii 80)))
    (begin
        (asserts! (is-eq contract-caller (var-get administrator)) ERR-NOT-ADMINISTRATOR)
        (asserts! (not (var-get metadata-frozen)) ERR-METADATA-FROZEN)
        (var-set base-uri new-base-uri)
        (ok true))
)

(define-public (freeze-metadata)
    (begin
        (asserts! (is-eq contract-caller (var-get administrator)) ERR-NOT-ADMINISTRATOR)
        (var-set metadata-frozen true)
        (ok true)
    )
)

;; read only methods
(define-read-only (get-token-market-by-index (nftIndex uint))
    (map-get? nft-market nftIndex)
)

(define-read-only (get-mint-pass-balance (account principal))
    (default-to u0
        (map-get? mint-pass account)
    )
)


;; private methods
(define-private (is-owned-or-approved (nftIndex uint) (operator principal) (owner principal))
    (default-to 
        (default-to
            (is-eq owner operator)
            (map-get? approvals-all {owner: owner, operator: operator})
        )
        (map-get? approvals {owner: owner, operator: operator, nft-index: nftIndex})
    )
)

(define-private (paymint-split (mintPrice uint) (payer principal)) 
    (let (
            (split u0)
            (mintAddresses (var-get collection-mint-addresses))
            (mintShares (var-get collection-mint-shares))
        )
        (+ split (unwrap! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u0) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u0) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u1) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u1) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u2) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u2) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u3) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u3) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (ok split)
    )
)

;; TODO: update this to use a list of {address, share}, and fold 
(define-private (payment-split (nftIndex uint) (saleAmount uint) (payer principal)) 
    (let (
            (addresses (var-get collection-royalty-addresses))
            (shares (var-get collection-royalty-shares))
            (split u0)
        )
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u0) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u1) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u1) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u2) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u2) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u3) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u3) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u4) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u4) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u5) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u5) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u6) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u6) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u7) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u7) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u8) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u8) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (+ split (unwrap! (pay-royalty payer saleAmount (unwrap! (element-at addresses u9) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u9) ERR-PAYMENT-ADDRESS)) ERR-PAYMENT-ADDRESS))
        (ok split)
    )
)

(define-private (pay-royalty (payer principal) (saleAmount uint) (payee principal) (share uint))
    (let ((split (/ (* saleAmount share) percentage-with-twodp)))
        ;; ignore royalty payment if its to the buyer / contract-caller.
        (if (and 
                (> share u0)
                (not (is-eq contract-caller payee)) 
                (try! (stx-transfer? split payer payee))
            )
            (ok split)
            (ok u0)
        )
    )
)

(define-private (upgrade-v1-to-v2-helper (nftIndex uint) (initial-value bool))
    (unwrap-panic (upgrade-v1-to-v2 nftIndex))
)

(define-private (mint-token-helper (entry uint) (initial-value bool))
    (unwrap-panic (mint-token))
)

(define-private (set-mint-pass-helper (entry {account: principal, limit: uint}) (initial-value bool))
    (unwrap-panic (set-mint-pass (get account entry) (get limit entry)))
)

;; TODO: add all whitelists
;; (map-set mint-pass 'SP3BPB30CSNHF29C1SEZZV3ADWWS6131V6TFYAPG1 u5)
