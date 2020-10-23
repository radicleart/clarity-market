;; ownable
(define-data-var owner principal 'S1G2081040G2081040G2081040G208105NK8PE5)

(define-read-only (get-owner)
    (var-get owner))

(define-read-only (is-owner)
    (ok (is-eq (var-get owner) tx-sender)))

(define-read-only (only-owner)
    (if (is-eq (var-get owner) tx-sender) (ok none) (err 1)))

(define-public (transfer-ownership (new-owner principal))
    (begin 
        (asserts! (is-eq (var-get owner) tx-sender) (err 1))
        (var-set owner new-owner)
        (ok true)))

;; loopbomb
(define-non-fungible-token loopbomb-tokens (buff 32)) ;; identifier is 256-bit hash of image
(define-data-var mint-price uint u5000000000000000)
(define-data-var base-token-uri (buff 100) "https://loopbomb.com/assets/api/v2/loop/")
(define-map loopbombs ((token-id (buff 32))) ((author principal) (date uint))) ;; extra info about token related to the nft-token

(define-public (update-base-token-uri (new-base-token-uri (buff 100)))
    (begin 
        (asserts! (is-eq (var-get owner) tx-sender) (err 1))
        (var-set base-token-uri new-base-token-uri)
        (ok true)))

(define-public (update-mint-price (new-mint-price uint))
    (begin 
        (asserts! (is-eq (var-get owner) tx-sender) (err 1))
        (var-set mint-price new-mint-price)
        (ok true)))

(define-read-only (get-base-token-uri)
    (var-get base-token-uri))

(define-read-only (get-mint-price)
    (var-get mint-price))

(define-read-only (get-token-uri (token-id (buff 32)))
    (concat (var-get base-token-uri) token-id))

(define-read-only (get-token-info (token-id (buff 32)))
    (map-get? loopbombs ((token-id token-id))))

(define-public (create-loopbomb (token-id (buff 32)))
    (begin 
        (as-contract
            (stx-transfer? (var-get mint-price) tx-sender (var-get owner))) ;; transfer stx if there is enough to pay for mint, otherwith throws an error
        (nft-mint? loopbomb-tokens token-id tx-sender) ;; fails if token has been minted before
        (map-insert loopbombs ((token-id token-id)) ((author tx-sender) (date block-height)))
        (ok true)))