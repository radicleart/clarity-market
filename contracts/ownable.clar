(define-data-var owner principal 'S1G2081040G2081040G2081040G208105NK8PE5)

(define-read-only (get-owner)
    (var-get owner))

(define-read-only (is-owner)
    (ok (is-eq (var-get owner) contract-caller)))

(define-read-only (only-owner)
    (if (is-eq (var-get owner) contract-caller) (ok none) (err 1)))

(define-public (transfer-ownership (new-owner principal))
    (begin 
        (asserts! (is-eq (var-get owner) contract-caller) (err 1))
        (var-set owner new-owner)
        (ok true)))