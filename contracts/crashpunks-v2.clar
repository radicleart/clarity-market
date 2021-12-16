;; Interface definitions
(impl-trait .nft-trait.nft-trait)
(impl-trait .operable.operable)

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
(define-constant ERR-NOT-ADMINISTRATOR (err u403))
(define-constant ERR-NOT-FOUND (err u404))

(define-non-fungible-token crashpunks-v2 uint)

;; data structures

;; {owner, operator, id} -> boolean
;; if {owner, operator, id}->true in map, then operator can perform actions on behalf of owner for this id
(define-map approvals {owner: principal, operator: principal, nft-index: uint} bool)
(define-map approvals-all {owner: principal, operator: principal} bool)

;; id -> price (in ustx)
;; if id is not in map, it is not listed for sale
(define-map nft-price uint uint)

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
(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? crashpunks-v2 id))
)

;; SIP-09: Transfer
(define-public (transfer (id uint) (owner principal) (recipient principal))
    (begin
        (asserts! (unwrap! (is-approved id contract-caller) ERR-NOT-AUTHORIZED) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (map-get? nft-price id)) ERR-NFT-LISTED)
        (nft-transfer? crashpunks-v2 id owner recipient)
    )
)

;; operable
(define-read-only (is-approved (id uint) (operator principal))
    (let ((owner (unwrap! (nft-get-owner? crashpunks-v2 id) ERR-COULDNT-GET-NFT-OWNER)))
        (ok (is-owned-or-approved id operator owner))
    )
)

;; operable
(define-public (set-approved (id uint) (operator principal) (approved bool))
    (ok (map-set approvals {owner: contract-caller, operator: operator, nft-index: id} approved))
)

(define-public (set-approved-all (operator principal) (approved bool))
    (ok (map-set approvals-all {owner: contract-caller, operator: operator} approved))
)

;; public methods

;; upgrade from v1 to v2
;; Owner of crashpunks v1 calls this upgrade function
;; 1. This contract burns the v1 NFT
;; 2. This contract mints the v2 NFT with the same id for contract-caller
(define-public (upgrade-v1-to-v2 (id uint))
    ;; TODO: MAKE SURE THESE CONTRACT CALLS WORK, MAKE SURE THE CONRACT ADDRESSES WORKS FOR MAINNET
    (begin 
        ;; 1. Burn the v1 NFT
        (try! (contract-call? .crashpunks-v1 burn id contract-caller))

        ;; 2. Mint the v2 NFT with the same id for contract-caller
        (try! (nft-mint? crashpunks-v2 id contract-caller))
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
(define-public (admin-mint-airdrop (recipient principal) (id uint))
    (begin
        (asserts! (< id COLLECTION-MAX-SUPPLY) ERR-COLLECTION-LIMIT-REACHED)
        (asserts! (is-eq contract-caller (var-get administrator)) ERR-NOT-ADMINISTRATOR)
        (try! (nft-mint? crashpunks-v2 id recipient))
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
(define-public (list-item (id uint) (amount uint))
    (begin 

        ;; (asserts! (unwrap! (is-approved id contract-caller) ERR-NOT-AUTHORIZED) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq contract-caller (unwrap! (nft-get-owner? crashpunks-v2 id) ERR-COULDNT-GET-NFT-OWNER)) ERR-NOT-OWNER)
        (asserts! (> amount u0) ERR-PRICE-WAS-ZERO)
        (ok (map-set nft-price id amount))
    )
)

;; marketplace function
(define-public (unlist-item (id uint))
    (begin 
        (asserts! (is-eq contract-caller (unwrap! (nft-get-owner? crashpunks-v2 id) ERR-COULDNT-GET-NFT-OWNER)) ERR-NOT-OWNER)
        (ok (map-delete nft-price id))
    )
)

;; marketplace function
(define-public (buy-now (id uint))
    (let 
        (
            (price (unwrap! (map-get? nft-price id) ERR-NFT-NOT-LISTED-FOR-SALE))
            (owner (unwrap! (nft-get-owner? crashpunks-v2 id) ERR-COULDNT-GET-NFT-OWNER))
            (buyer contract-caller)
        )
        (try! (payment-split id price contract-caller))
        (try! (nft-transfer? crashpunks-v2 id owner buyer))
        (map-delete nft-price id)
        (ok true)
    )
)

(define-public (burn (id uint))
    (let ((owner (unwrap! (nft-get-owner? crashpunks-v2 id) ERR-COULDNT-GET-NFT-OWNER)))
        (asserts! (is-eq owner contract-caller) ERR-NOT-OWNER)
        (map-delete nft-price id)
        (nft-burn? crashpunks-v2 id contract-caller)
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
(define-read-only (get-nft-price (id uint))
    (map-get? nft-price id)
)

(define-read-only (get-mint-pass-balance (account principal))
    (default-to u0
        (map-get? mint-pass account)
    )
)


;; private methods
(define-private (is-owned-or-approved (id uint) (operator principal) (owner principal))
    (default-to 
        (default-to
            (is-eq owner operator)
            (map-get? approvals-all {owner: owner, operator: operator})
        )
        (map-get? approvals {owner: owner, operator: operator, nft-index: id})
    )
)

(define-private (paymint-split (mintPrice uint) (payer principal)) 
    (let (
            (mintAddresses (var-get collection-mint-addresses))
            (mintShares (var-get collection-mint-shares))
        )
        (try! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u0) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u0) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u1) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u1) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u2) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u2) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer mintPrice (unwrap! (element-at mintAddresses u3) ERR-PAYMENT-ADDRESS) (unwrap! (element-at mintShares u3) ERR-PAYMENT-ADDRESS)))
        (ok true)
    )
)

;; TODO: update this to use a list of {address, share}, and fold 
(define-private (payment-split (id uint) (saleAmount uint) (payer principal)) 
    (let (
            (addresses (var-get collection-royalty-addresses))
            (shares (var-get collection-royalty-shares))
            (split u0)
        )
        (try! (pay-royalty payer saleAmount (unwrap! (nft-get-owner? crashpunks-v2 id) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u0) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u1) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u1) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u2) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u2) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u3) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u3) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u4) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u4) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u5) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u5) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u6) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u6) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u7) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u7) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u8) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u8) ERR-PAYMENT-ADDRESS)))
        (try! (pay-royalty payer saleAmount (unwrap! (element-at addresses u9) ERR-PAYMENT-ADDRESS) (unwrap! (element-at shares u9) ERR-PAYMENT-ADDRESS)))
        (ok true)
    )
)

(define-private (pay-royalty (payer principal) (saleAmount uint) (payee principal) (share uint))
    (let ((split (/ (* saleAmount share) percentage-with-twodp)))
        ;; ignore royalty payment if its to the buyer / contract-caller.
        (ok (and 
                (> share u0)
                (not (is-eq contract-caller payee)) 
                (try! (stx-transfer? split payer payee))
            )
        )
    )
)

(define-private (upgrade-v1-to-v2-helper (id uint) (initial-value bool))
    (unwrap-panic (upgrade-v1-to-v2 id))
)

(define-private (mint-token-helper (entry uint) (initial-value bool))
    (unwrap-panic (mint-token))
)

(define-private (set-mint-pass-helper (entry {account: principal, limit: uint}) (initial-value bool))
    (unwrap-panic (set-mint-pass (get account entry) (get limit entry)))
)

;; TODO: add all whitelists
;; (map-set mint-pass 'SP3BPB30CSNHF29C1SEZZV3ADWWS6131V6TFYAPG1 u5)
