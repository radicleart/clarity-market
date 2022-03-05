(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-public (pay (ft-trait <ft-trait>) (id uint) (price uint))
    (begin
        (try! (contract-call? ft-trait transfer (/ (* price u8) u100) tx-sender 'SPZRAE52H2NC2MDBEV8W99RFVPK8Q9BW8H88XV9N)) ;; artist
        (try! (contract-call? ft-trait transfer (/ (/ (* price u2) u5) u1000) tx-sender 'SP162D87CY84QVVCMJKNKGHC7GGXFGA0TAR9D0XJW)) ;; jim
        (try! (contract-call? ft-trait transfer (/ (/ (* price u2) u5) u1000) tx-sender 'SP1CS4FVXC59S65C3X1J3XRNZGWTG212JT7CG73AG)) ;; dash
        (try! (contract-call? ft-trait transfer (/ (/ (* price u2) u5) u1000) tx-sender 'SPZRAE52H2NC2MDBEV8W99RFVPK8Q9BW8H88XV9N)) ;; cx
        (try! (contract-call? ft-trait transfer (/ (/ (* price u2) u5) u1000) tx-sender 'SP2M92VAE2YJ1P5VZ1Q4AFKWZFEKDS8CDA1KVFJ21)) ;; pp
        (try! (contract-call? ft-trait transfer (/ (/ (* price u2) u5) u1000) tx-sender 'SP3N4AJFZZYC4BK99H53XP8KDGXFGQ2PRSQP2HGT6)) ;; mijoco
        (ok true)
    )
)
