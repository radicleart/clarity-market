(define-data-var owner principal 'STGPPTWJEZ2YAA7XMPVZ7EGKH0WX9F2DBNHTG5EY)

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