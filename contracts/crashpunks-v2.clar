;; Interface definitions
(impl-trait .nft-trait.nft-trait)
(impl-trait .operable.operable)
;; (impl-trait .transferable.transferable)

;; contract variables

(define-data-var administrator principal 'SP3N4AJFZZYC4BK99H53XP8KDGXFGQ2PRSQP2HGT6)
(define-data-var mint-price uint u1000)
(define-data-var mint-counter uint u0)
(define-data-var signer (buff 33) 0x02815c03f6d7181332afb1b0114f5a1c97286b6092957910ae3fab4006598aee1b)
(define-data-var is-collection bool true)
(define-data-var collection-mint-addresses (list 4 principal) (list))
(define-data-var collection-mint-shares (list 4 uint) (list))
(define-data-var collection-addresses (list 10 principal) (list))
(define-data-var collection-shares (list 10 uint) (list))
(define-data-var collection-secondaries (list 10 uint) (list))

;; constants
(define-constant token-name "crashpunks-v2")
(define-constant token-symbol "CPS-v2")
(define-constant collection-max-supply u9216)


(define-constant ERR-NFT-DATA-NOT-FOUND (err u101))

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-OWNER (err u402))

(define-non-fungible-token crashpunks-v2 uint)

;; data structures
(define-map approvals {owner: principal, operator: principal, nft-index: uint} bool)
(define-map nft-data {nft-index: uint} {asset-hash: (buff 32), meta-data-url: (string-ascii 256) })

;; SIP-09: get last token id
(define-read-only (get-last-token-id)
  (ok (- (var-get mint-counter) u1))
)

;; SIP-09: URI for metadata associated with the token
(define-read-only (get-token-uri (nftIndex uint))
  (ok (get meta-data-url (map-get? nft-data {nft-index: nftIndex})))
)

;; SIP-09: Gets the owner of the 'Specified token ID.
(define-read-only (get-owner (nftIndex uint))
  (ok (nft-get-owner? crashpunks-v2 nftIndex))
)

;; SIP-09: Transfer
(define-public (transfer (nftIndex uint) (owner principal) (recipient principal))
    (begin
        ;; TODO: update these assertions
        ;; (asserts! (and (is-owner-or-approval id owner) (is-owner-or-approval id contract-caller)) (err ERR-NOT-AUTHORIZED))
        (nft-transfer? crashpunks-v2 nftIndex owner recipient)
    )
)

;; operable-trait
(define-read-only (is-approved (nftIndex uint) (address principal))
    (let
        (
            (owner (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-NOT-OWNER))
        )
        (begin
            (if (or
                (is-eq owner tx-sender)
                (is-eq owner contract-caller)
                (default-to false (map-get? approvals {owner: owner, operator: tx-sender, nft-index: nftIndex}))
                (default-to false (map-get? approvals {owner: owner, operator: contract-caller, nft-index: nftIndex}))
            ) (ok true) ERR-NOT-AUTHORIZED
            )
        )
    )
)

;; see operable-trait
(define-public (set-approved (nftIndex uint) (operator principal) (approved bool))
    (let
        (
            (owner (unwrap! (nft-get-owner? crashpunks-v2 nftIndex) ERR-NOT-OWNER))
        )
        (asserts! (is-eq owner contract-caller) ERR-NOT-OWNER)
        (if approved
            (ok (map-set approvals {owner: owner, operator: operator, nft-index: nftIndex} approved))
            (ok (map-delete approvals {owner: owner, operator: operator, nft-index: nftIndex}))
        )
    )
)

(define-public (update-meta-data-url (nftIndex uint) (newMetaDataUrl (string-ascii 256)))
    (let
        (
            (data (unwrap! (map-get? nft-data {nft-index: nftIndex}) ERR-NFT-DATA-NOT-FOUND))
        )
        ;; TODO: update these assertions
        ;; (asserts! (unwrap! (is-approved nftIndex (unwrap! (nft-get-owner? crashpunks nftIndex) not-allowed)) not-allowed) not-allowed)
        (ok (map-set nft-data
            {nft-index: nftIndex} 
            (merge data
                {
                    meta-data-url: newMetaDataUrl
                }
            )
        ))
    )
)
