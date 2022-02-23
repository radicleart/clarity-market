(define-public (pay (id uint) (price uint))
    (begin
        (try! (stx-transfer? (/ (* price u5) u100) tx-sender 'ST1P89TEC03E29V5MYJBSCC8KWR1A243ZG382B1X5))
        (try! (stx-transfer? (/ (* price u5) u100) tx-sender 'ST1WJY09D3DEE45B1PY8TAV838VCH9HNEJXB2ZBPQ))
        (ok true)
    )
)
