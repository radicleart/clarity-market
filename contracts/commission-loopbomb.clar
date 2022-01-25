(define-public (pay (id uint) (price uint))
    (begin
        (try! (stx-transfer? (/ (* price u3) u100) tx-sender 'SP29N24XJPW2WRVF6S2JWBC3TJBGBA5EXPSE6NH14))
        (try! (stx-transfer? (/ (* price u3) u100) tx-sender 'SP3BTM84FYABJGJ83519GG5NSV0A6A13D4NHJSS32))
        (try! (stx-transfer? (/ (* price u2) u100) tx-sender 'SP120HPHF8AZXS2SCXMXAX3XF4XT35C0HCHMAVMAJ))
        (ok true)
    )
)
