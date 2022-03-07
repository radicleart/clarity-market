;; Implement the `ft-trait` trait defined in the `ft-trait` contract - SIP 10
;; This can use sugared syntax in real deployment (unit tests do not allow)
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

;; ;; Implement the token restriction trait
;;(impl-trait .restricted-token-trait.restricted-token-trait)

;; Error returned for permission denied - stolen from http 403
(define-constant PERMISSION_DENIED_ERROR u403)

;; Data variables specific to the deployed token contract
(define-data-var token-name (string-ascii 32) "Test Wrapper")
(define-data-var token-symbol (string-ascii 32) "TWR")
(define-data-var token-decimals uint u8)

;; Track who deployed the token and whether it has been initialized
(define-data-var deployer-principal principal tx-sender)
(define-data-var is-initialized bool true)

;; Meta Read Only Functions for reading details about the contract - conforms to SIP 10
;; --------------------------------------------------------------------------

;; Defines built in support functions for tokens used in this contract
;; A second optional parameter can be added here to set an upper limit on max total-supply
(define-fungible-token test-wrapper)


;; Get the token balance of the specified owner in base units
(define-read-only (get-balance (owner principal))
  (ok (ft-get-balance test-wrapper owner)))

;; Returns the token name
(define-read-only (get-name)
  (ok (var-get token-name)))

;; Returns the symbol or "ticker" for this token
(define-read-only (get-symbol)
  (ok (var-get token-symbol)))

;; Returns the number of decimals used
(define-read-only (get-decimals)
  (ok (var-get token-decimals)))

;; Returns the total number of tokens that currently exist
(define-read-only (get-total-supply)
  (ok (ft-get-supply test-wrapper)))


;; Write function to transfer tokens between accounts - conforms to SIP 10
;; --------------------------------------------------------------------------

;; Transfers tokens to a recipient
;; The originator of the transaction (tx-sender) must be the 'sender' principal
;; Smart contracts can move tokens from their own address by calling transfer with the 'as-contract' modifier to override the tx-sender.

(define-public (transfer (amount uint) (sender principal) (recipient principal ) (memo (optional (buff 34) )))
  (begin
    ;; (try! (detect-transfer-restriction amount sender recipient)) ;; Ensure there is no restriction
    (asserts! (is-eq tx-sender sender) (err u4)) ;; Ensure the originator is the sender principal
    (print (default-to 0x memo))
    (ft-transfer? test-wrapper amount sender recipient) ) ) ;; Transfer


;; Role Based Access Control
;; --------------------------------------------------------------------------
(define-constant OWNER_ROLE u0) ;; Can manage RBAC
(define-constant MINTER_ROLE u1) ;; Can mint new tokens to any account
(define-constant BURNER_ROLE u2) ;; Can burn tokens from any account
(define-constant REVOKER_ROLE u3) ;; Can revoke tokens and move them to any account
(define-constant BLACKLISTER_ROLE u4) ;; Can add principals to a blacklist that can prevent transfers

;; Each role will have a mapping of principal to boolean.  A true "allowed" in the mapping indicates that the principal has the role.
;; Each role will have special permissions to modify or manage specific capabilities in the contract.
;; Note that adding/removing roles could be optimized by having just 1 function, but since this is sensitive functionality, it was split
;;    into 2 separate functions to make it explicit.
;; See the Readme about more details on the RBAC setup.
(define-map roles { role: uint, account: principal } { allowed: bool })

;; Checks if an account has the specified role
(define-read-only (has-role (role-to-check uint) (principal-to-check principal))
  (default-to false (get allowed (map-get? roles {role: role-to-check, account: principal-to-check}))))  

;; Add a principal to the specified role
;; Only existing principals with the OWNER_ROLE can modify roles
(define-public (add-principal-to-role (role-to-add uint) (principal-to-add principal))   
   (begin
    ;; Check the contract-caller to verify they have the owner role
    (asserts! (has-role OWNER_ROLE contract-caller) (err PERMISSION_DENIED_ERROR))
    ;; Print the action for any off chain watchers
    (print { action: "add-principal-to-role", role-to-add: role-to-add, principal-to-add: principal-to-add })
    (ok (map-set roles { role: role-to-add, account: principal-to-add } { allowed: true }))))
   
;; Remove a principal from the specified role
;; Only existing principals with the OWNER_ROLE can modify roles
;; WARN: Removing all owners will irrevocably lose all ownership permissions
(define-public (remove-principal-from-role (role-to-remove uint) (principal-to-remove principal))   
   (begin
    ;; Check the contract-caller to verify they have the owner role
    (asserts! (has-role OWNER_ROLE contract-caller) (err PERMISSION_DENIED_ERROR))
    ;; Print the action for any off chain watchers
    (print { action: "remove-principal-from-role", role-to-remove: role-to-remove, principal-to-remove: principal-to-remove })
    (ok (map-set roles { role: role-to-remove, account: principal-to-remove } { allowed: false }))))


;; Token URI
;; --------------------------------------------------------------------------

;; Variable for URI storage
(define-data-var uri (string-utf8 256) u"")

;; Public getter for the URI
(define-read-only (get-token-uri)
  (ok (some (var-get uri))))

;; Setter for the URI - only the owner can set it
(define-public (set-token-uri (updated-uri (string-utf8 256)))
  (begin
    (asserts! (has-role OWNER_ROLE contract-caller) (err PERMISSION_DENIED_ERROR))
    ;; Print the action for any off chain watchers
    (print { action: "set-token-uri", updated-uri: updated-uri })
    (ok (var-set uri updated-uri))))


;; Minting and Burning
;; --------------------------------------------------------------------------

;; Mint tokens to the target address
;; Only existing principals with the MINTER_ROLE can mint tokens
(define-public (mint-tokens (mint-amount uint) (mint-to principal) )
  (begin
    (asserts! (is-eq (var-get deployer-principal) contract-caller) (err PERMISSION_DENIED_ERROR))
    ;; Print the action for any off chain watchers
    (print { action: "mint-tokens", mint-amount: mint-amount, mint-to: mint-to  })
    (ft-mint? test-wrapper mint-amount mint-to)))

;; Burn tokens from the target address
;; Only existing principals with the BURNER_ROLE can mint tokens
(define-public (burn-tokens (burn-amount uint) (burn-from principal) )
  (begin
    (asserts! (has-role BURNER_ROLE contract-caller) (err PERMISSION_DENIED_ERROR))
    ;; Print the action for any off chain watchers
    (print { action: "burn-tokens", burn-amount: burn-amount, burn-from : burn-from  })
    (ft-burn? test-wrapper burn-amount burn-from)))

(ft-mint? test-wrapper u1000000000000 'ST29N24XJPW2WRVF6S2JWBC3TJBGBA5EXPSC03Y0G)
(ft-mint? test-wrapper u1000000000000 'ST3BTM84FYABJGJ83519GG5NSV0A6A13D4N25KH1K)
(ft-mint? test-wrapper u1000000000000 'ST120HPHF8AZXS2SCXMXAX3XF4XT35C0HCJZ3NS8S)

;; Revoking Tokens
;; --------------------------------------------------------------------------

;; Transfer Restrictions
;; --------------------------------------------------------------------------
;; Initialization
;; --------------------------------------------------------------------------

