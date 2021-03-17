;; application registry for applications  wishing to sell NFTs throug the marketplace
(define-data-var administrator principal 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)
(define-map app-map {index: int} {owner: (buff 80), app-contract-id: (buff 100)})
(define-data-var app-counter int 0)

(define-constant not-found (err u100))
(define-constant illegal-storage (err u102))
(define-constant not-allowed (err u101))

