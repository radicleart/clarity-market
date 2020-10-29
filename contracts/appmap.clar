;; appmap - map of applications connected to platform for purpose of indexing nfts
(define-data-var administrator principal 'ST1ESYCGJB5Z5NBHS39XPC70PGC14WAQK5XXNQYDW)
(define-map app-map  ((owner (buff 80)) (projectId (buff 100))) ((storage-model uint) (status uint)))

(define-constant not-found u100)
(define-constant not-allowed u101)
(define-constant illegal-storage u102)

(define-read-only (get-administrator)
    (var-get administrator))

(define-public (transfer-administrator (new-administrator principal))
    (begin 
        (asserts! (is-eq (var-get administrator) contract-caller) (err 1))
        (var-set administrator new-administrator)
        (ok true)))

;; ADD APPLICATION - status is 0 (inactive until reviewed)
(define-public (add-app (owner (buff 80)) (projectId (buff 100)) (storage-model uint))
  (begin
    (if (is-storage-allowed storage-model)
      (begin
        (map-insert app-map {owner: owner, projectId: projectId} ((storage-model storage-model) (status u0)))
        (ok owner)
      )
      (err illegal-storage)
    )
  )
)

;; get the meta data for the given project
(define-public (get-app (owner (buff 80)) (projectId (buff 100)))
  (match (map-get? app-map {owner: owner, projectId: projectId})
    myProject (ok myProject) (err not-found)
  )
)

;; ADD APPLICATION - status is 0 (inactive until reviewed)
(define-public (set-app-live (owner (buff 80)) (projectId (buff 100)))
  (begin
    (if (is-update-allowed)
    (begin
      (match (map-get? app-map {owner: owner, projectId: projectId})
        myProject 
        (ok (map-set app-map {owner: owner, projectId: projectId} ((storage-model u1) (status u1))))
        (err not-found)
      )
    )
      (err not-allowed)
    )
  )
)

;; Private functions
(define-private (is-update-allowed)
  (is-eq (var-get administrator) contract-caller)
)
(define-private (is-storage-allowed (storage uint))
  (<= storage u10)
)