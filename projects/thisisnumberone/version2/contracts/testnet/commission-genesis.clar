(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-public (pay (ft-trait <ft-trait>) (id uint) (price uint))
    (begin
        (try! (contract-call? ft-trait transfer (/ (* price u8) u100) tx-sender 'ST2KAEEGWXNBFWTT5DJG14WH3G2CEFPWV99YPJPMR none)) ;; artist
        (try! (contract-call? ft-trait transfer (/ (/ (* price u20) u5) u1000) tx-sender 'ST37Y2WXPXA2GFBAWPPVK8GANJBXR9NNK6F0K0PD none)) ;; jim
        (try! (contract-call? ft-trait transfer (/ (/ (* price u20) u5) u1000) tx-sender 'ST2HMPFXR919ZGJHP0EP52J7NQ6WQ25RC2S1M1FSX none)) ;; dash
        (try! (contract-call? ft-trait transfer (/ (/ (* price u20) u5) u1000) tx-sender 'ST2H1GA0VFR6CBA9VSCCY94RQP17KHVBQ9PKJG3N0 none)) ;; cx
        (try! (contract-call? ft-trait transfer (/ (/ (* price u20) u5) u1000) tx-sender 'ST2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1TC4PAG none)) ;; pp
        (try! (contract-call? ft-trait transfer (/ (/ (* price u20) u5) u1000) tx-sender 'ST132K8CVJ9B2GEDHTQS5MH3N7BR5QDMN1P1RZG3Y none)) ;; mijoco
        (ok true)
    )
)
