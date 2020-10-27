;; appmap - map of applications connected to platform for purpose of indexing nfts
(define-data-var administrator principal 'STGPPTWJEZ2YAA7XMPVZ7EGKH0WX9F2DBNHTG5EY)
(define-map app-map  ((owner (buff 20)) (projectId (buff 100))) ((storage-model uint)))

(define-constant not-allowed u100)
(define-constant not-found u100)

(define-read-only (get-administrator)
    (var-get administrator))
(define-read-only (is-administrator)
    (ok (is-eq (var-get administrator) contract-caller)))
(define-read-only (only-administrator)
    (if (is-eq (var-get administrator) contract-caller) (ok none) (err 1)))
(define-public (transfer-administrator (new-administrator principal))
    (begin 
        (asserts! (is-eq (var-get administrator) contract-caller) (err 1))
        (var-set administrator new-administrator)
        (ok true)))
        
(define-public (add-app (owner (buff 20)) (projectId (buff 100)) (storage-model uint) (status uint))
  (begin
    (if (is-update-allowed)
      (begin
        (map-insert app-map {owner: owner, projectId: projectId} ((storage-model storage-model)))
        (ok owner)
      )
      (err not-allowed)
    )
  )
)
;; get the meta data for the given project
(define-public (get-app (owner (buff 20)) (projectId (buff 100)))
  (match (map-get? app-map {owner: owner, projectId: projectId})
    myProject (ok myProject) (err not-found)
  )
)
;; Private functions
(define-private (is-update-allowed)
  (is-eq tx-sender (var-get administrator))
)

