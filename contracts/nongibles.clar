;; nongible data structures
(define-data-var administrator principal 'STGPPTWJEZ2YAA7XMPVZ7EGKH0WX9F2DBNHTG5EY)
(define-non-fungible-token nongible-tokens (buff 32)) ;; identifier is 256-bit hash of image
(define-data-var mint-price uint u10000)
(define-data-var base-token-uri (buff 100) 0x68747470733a2f2f6c6f6f70626f6d622e7269736964696f2e636f6d2f6170692f76312f6173736574732f)
(define-map nongibles ((token-id (buff 32))) ((author principal) (date uint))) ;; extra info about token related to the nft-token

;; nongible public methods
(define-public (transfer-administrator (new-administrator principal))
    (begin 
        (asserts! (is-eq (var-get administrator) tx-sender) (err 1))
        (var-set administrator new-administrator)
        (ok true)))

;; nongible methods
(define-public (update-base-token-uri (new-base-token-uri (buff 100)))
    (begin 
        (asserts! (is-eq (var-get administrator) tx-sender) (err 1))
        (var-set base-token-uri new-base-token-uri)
        (ok true)))

(define-public (update-mint-price (new-mint-price uint))
    (begin 
        (asserts! (is-eq (var-get administrator) tx-sender) (err 1))
        (var-set mint-price new-mint-price)
        (ok true)))

(define-public (create-nongible (token-id (buff 32)))
    (begin 
        (asserts! (>= (stx-get-balance tx-sender) (var-get mint-price)) (err 2))
        (as-contract
            (stx-transfer? (var-get mint-price) tx-sender (var-get administrator))) ;; transfer stx if there is enough to pay for mint, otherwith throws an error
        (nft-mint? nongible-tokens token-id tx-sender) ;; fails if token has been minted before
        (map-insert nongibles ((token-id token-id)) ((author tx-sender) (date block-height)))
        (ok true)))

;; read only methods
(define-read-only (get-administrator)
    (var-get administrator))

(define-read-only (is-administrator)
    (ok (is-eq (var-get administrator) tx-sender)))

(define-read-only (get-base-token-uri)
    (var-get base-token-uri))

(define-read-only (get-mint-price)
    (var-get mint-price))

(define-read-only (get-token-uri (token-id (buff 32)))
    (concat (var-get base-token-uri) token-id))

(define-read-only (get-token-info (token-id (buff 32)))
    (map-get? nongibles ((token-id token-id))))

