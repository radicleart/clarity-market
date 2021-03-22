;; Partial support for ERC-721 NFT methods - approvals not yet supported.
(define-trait transferable-nft-trait
  (
    ;; transfer asset - tx-sender is the  / buyer - this is 
    ;; different from the blockstack implemnentation where the tx-sender 
    ;; has to call this method.
    (transfer-from (principal principal uint) (response uint uint))

    ;; transfer asset - safer form tx-sender must be current owner
    (transfer (principal uint) (response uint uint))

    ;; number of tokens owned by address
    (balance-of (principal) (response uint uint))
  )
)

;; Contracts representing assets for sale in marketplace.
(define-trait tradable-nft-trait
  (
;; set-sale-data updates the sale type and purchase info for a given NFT. Only the owner can call this method
;; and doing so make the asset transferable by the recipient - on condition of meeting the conditions of sale
;; This is equivalent to the setApprovalForAll method in ERC 721 contracts.
    ;; args - 1. sha256 asset hash
    ;;        2. sale-type 0=not for sale, 1=buy now, 2=bidding
    ;;        3. incremet - 0 if sale-type != 2 
    ;;        4. reserve - 0 if sale-type != 2 
    ;;        5. buy-now-or-starting-price - 0 if sale-type = 0 
    ;;        6. bidding-end-date - in ms since turn of epoch 
    (set-sale-data (uint uint uint uint uint uint) (response uint uint))
;; Indicates the number of transfers for the given asset
    ;; args - 1. nft-index
    (get-transfer-count (uint) (response uint uint))
  )
)

;; Real world asset.
(define-trait traceable-nft-trait
  (
;; Indicates the number of transfers for the given asset
    ;; args - 1. nft-index
    (get-geo-coords (uint) (response uint uint))
  )
)