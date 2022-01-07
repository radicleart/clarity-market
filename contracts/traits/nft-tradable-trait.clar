;; Contracts representing assets for sale in marketplace.
(define-trait nft-tradable-trait
  (
     ;; Sets or unsets a user or contract principal who is allowed to call transfer
    (set-approval-for (uint principal) (response bool uint))

     ;; Sets or unsets a user or contract principal who is allowed to call transfer
    (get-approval (uint) (response (optional principal) uint))

    ;; list-item lists an item.
    ;; Callable by the owner or approval principal
    ;; Args: nft-index, amount
    ;; returns ok true if successful
    ;; emits {evt: "list-item", nftIndex: nftIndex, amount: amount}
    ;; Returns: ok true
    (list-item (uint uint) (response bool uint))

    ;; unlist-item removes a listing. 
    ;; Callable by the owner or approval principal
    ;; returns ok true if successful
    ;; emits {evt: "unlist-item", nftIndex: nftIndex}
    ;; Returns: ok true
    (unlist-item (uint) (response bool uint))

    ;; buy-now
    ;; transfers item to tx-sender inexchange for amount of token
    ;; fails if item is not listed
    ;; Args: nft-index, amount
    ;; emits {evt: "buy-now", nftIndex: nftIndex, owner: owner, recipient: recipient, amount: amount}
    ;; Returns: ok true
    (buy-now (uint principal principal) (response bool uint))
  )
)