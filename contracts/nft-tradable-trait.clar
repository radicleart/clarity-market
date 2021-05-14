;; Contracts representing assets for sale in marketplace.
(define-trait nft-tradable-trait
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
    ;; responds with the token index
    (set-sale-data (uint uint uint uint uint uint) (response uint uint))

    ;; args - nft-index
    ;;        amount
    ;;        timestamp
    (make-offer (uint uint uint) (response uint uint))

    ;; args - nft-index
    ;;        owner
    ;;        buyer
    (buy-now (uint principal principal) (response uint uint))

    ;; args - nft-index
    ;;        amount
    ;;        timestamp
    (place-bid (nftIndex uint) (nextBidAmount uint) (appTimestamp uint) (response uint uint))

    ;; args - nft-index
    ;;        closeType - refund and close or pay and close
    (close-bidding (uint uint) (response uint uint))
  )
)