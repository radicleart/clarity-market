;; appmap - map of applications connected to auction platform
(define-data-var administrator principal 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)
(define-map app-map ((index uint)) ((owner (buff 80)) (projectId (buff 100)) (storage-model uint) (status uint)))
(define-data-var app-counter uint u0)

(define-constant not-found u100)
(define-constant not-allowed u101)
(define-constant illegal-storage u102)

;; -- writers --
(define-public (transfer-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get administrator) contract-caller) (err 1))
        (var-set administrator new-administrator)
        (ok true)))

;; Insert new app at current index
(define-public (add-app (owner (buff 80)) (projectId (buff 100)) (storage-model uint))
  (begin
    (if (is-storage-allowed storage-model)
      (begin
        (map-insert app-map ((index (var-get app-counter))) ((owner owner) (projectId projectId) (storage-model storage-model) (status u0)))
        (var-set app-counter (+ (var-get app-counter) u1))
        (ok owner)
      )
      (err illegal-storage)
    )
  )
)

;; Make app live - set status to 1
(define-public (set-app-live (index uint) (owner (buff 80)) (projectId (buff 100)) (storage-model uint))
  (begin
    (if (is-update-allowed)
    (begin
      (match (map-get? app-map {index: index})
        myProject 
        (ok (map-set app-map {index: index} ((owner owner) (projectId projectId) (storage-model storage-model) (status u1))))
        (err not-found)
      )
    )
      (err not-allowed)
    )
  )
)

;; -- read only --
;; Get app by index
(define-read-only (get-app (index uint))
  (match (map-get? app-map ((index index)))
    myProject (ok myProject) (err not-found)
  )
)
(define-read-only (get-app-counter)
  (ok (var-get app-counter))
)
;; Get current administrator
(define-read-only (get-administrator)
    (var-get administrator))


;; -- private --
(define-private (is-update-allowed)
  (is-eq (var-get administrator) contract-caller)
)
(define-private (is-storage-allowed (storage uint))
  (<= storage u10)
)