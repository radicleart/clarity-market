(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-public (pay (ft-trait <ft-trait>) (id uint) (price uint))
    (begin
        (try! (contract-call? ft-trait transfer (/ (* price u5) u100) tx-sender 'ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5 none))
        (try! (contract-call? ft-trait transfer (/ (* price u5) u100) tx-sender 'ST1WJY09D3DEE45B1PY8TAV838VCH9HNEJXB2ZBPQ none))
        (ok true)
    )
)
