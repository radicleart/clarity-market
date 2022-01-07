(define-public (pay (id uint) (price uint))
    (begin
        (try! (stx-transfer? (/ price u40) tx-sender 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6))
        (ok true)
    )
)
