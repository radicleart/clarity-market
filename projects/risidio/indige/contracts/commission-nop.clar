(use-trait sip10 .sip-010-trait-ft-standard.sip-010-trait)

(define-public (pay (sip10 <sip10>) (id uint) (price uint))
    (begin
        (try! (contract-call? sip10 transfer price tx-sender 'ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5 none))
        (ok true)
    )
)
