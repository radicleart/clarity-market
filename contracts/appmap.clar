;; application registry for applications  wishing to sell NFTs throug the marketplace
(define-data-var administrator principal 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)
(define-map app-map {index: int} {owner: (buff 80), gaia-filename: (buff 80), app-contract-id: (buff 100), storage-model: int, status: int})
(define-map app-map-reverse {app-contract-id: (buff 100)} {index: int})
(define-data-var app-counter int 0)

(define-constant not-found (err u100))
(define-constant illegal-storage (err u102))
(define-constant not-allowed (err u101))

;; -- writers --
(define-public (transfer-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get administrator) contract-caller) not-allowed)
        (var-set administrator new-administrator)
        (ok true)))

;; Insert new app at current index - can't have two apps with the same contract id here!
(define-public (register-app (owner (buff 80)) (gaia-filename (buff 80)) (app-contract-id (buff 100)) (storage-model int))
  (let
      (
          (index (get index (map-get? app-map-reverse {app-contract-id: app-contract-id})))
      )
      (if (is-none index)
        (begin
          (if (is-storage-allowed storage-model)
            (begin
              (map-insert app-map {index: (var-get app-counter)} {owner: owner, gaia-filename: gaia-filename, app-contract-id: app-contract-id, storage-model: storage-model, status: 0})
              (map-insert app-map-reverse {app-contract-id: app-contract-id} {index: (var-get app-counter)})
              (var-set app-counter (+ (var-get app-counter) 1))
              (print (var-get app-counter))
              (ok (var-get app-counter))
            )
            illegal-storage
          )
        )
        not-allowed
      )
  )
)

;; Make app live - set status to 1
(define-public (set-app-status (index int) (owner (buff 80)) (gaia-filename (buff 80)) (app-contract-id (buff 100)) (storage-model int) (status int))
  (begin
    (if (is-update-allowed)
      (begin
        (match (map-get? app-map {index: index})
          myProject 
          (ok (map-set app-map {index: index} {owner: owner, gaia-filename: gaia-filename, app-contract-id: app-contract-id, storage-model: storage-model, status: status}))
          not-found
        )
      )
      not-allowed
    )
  )
)

;; -- read only --
;; Get app by index
(define-read-only (get-app (index int))
    (match (map-get? app-map {index: index})
        myProject (ok myProject) not-found
    )
)
(define-read-only (get-app-index (app-contract-id (buff 100)))
    (let
        (
            (index (unwrap! (get index (map-get? app-map-reverse {app-contract-id: app-contract-id})) not-found))
        )
        (ok index)
    )
)

(define-read-only (get-app-counter)
    (ok (var-get app-counter))
)
;; Get current administrator
(define-read-only (get-administrator)
    (ok (var-get administrator))
)
(define-read-only (get-contract-data)
    (let
        (
            (the-app-counter    (var-get app-counter))
            (the-administrator  (var-get administrator))
        )
        (ok (tuple 
                (appCounter the-app-counter)
                (administrator the-administrator)
            )
        )
    )
)

;; -- private --
(define-private (is-update-allowed)
  (is-eq (var-get administrator) contract-caller)
)
(define-private (is-storage-allowed (storage int))
  (<= storage 10)
)