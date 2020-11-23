;; Partial support for ERC-721 NFT methods
(define-trait transferable-nft-trait
  (
    ;; transfer asset - tx-sender is the recipient
    (transfer-from (principal principal uint) (response uint uint))

    ;; transfer asset - tx-sender must be current owner
    (transfer (principal uint) (response uint uint))

    ;; number of tokens owned by address
    (balance-of (principal) (response uint uint))
  )
)

(define-trait tradable-nft-trait
  (
    ;; set terms of sale
    ;; args - 1. sha256 asset hash
    ;;        2. sale-type 0=not for sale, 1=buy now, 2=bidding
    ;;        3. incremet - 0 if sale-type != 2 
    ;;        4. reserve - 0 if sale-type != 2 
    ;;        5. buy-now-or-starting-price - 0 if sale-type = 0 
    ;;        6. bidding-end-date - in ms since turn of epoch 
    (set-sale-data ((buff 32) uint uint uint uint uint) (response uint uint))
  )
)