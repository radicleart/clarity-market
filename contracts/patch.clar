(define-data-var nftadmin principal 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)
(define-data-var transfer-status uint u1)


(define-public (transfer (nftIndex uint) (owner principal) (recipient principal))
    (if (is-eq (var-get transfer-status) u2)
        (if (is-eq (var-get nftadmin) tx-sender)
            (transfer-internal nftIndex owner recipient)
            not-allowed
        )
  (if (and (is-owner-or-approval nftIndex owner) (is-owner-or-approval nftIndex tx-sender))
            (transfer-internal nftIndex owner recipient)
            nft-not-owned-err
        )
    )
)

(define-private (transfer-internal (nftIndex uint) (owner principal) (recipient principal))
     (match (nft-transfer? loopbomb nftIndex owner recipient)
         success (ok true)
         error (nft-transfer-err error))
)

(define-public (set-transfers (tstatus uint) (nft-admin principal))
    (begin
        (asserts! (is-eq (var-get administrator) tx-sender) not-allowed)
        (var-set nftadmin nft-admin)
       (var-set transfer-status tstatus)
        (ok true)
    )
    nft-not-owned-err)
)
