;; Working example of SIP013 for editions or prints of artwork with internal marketplace functions
;; Editions are interchangeable per artwork and max edition supply is 100 per artwork or 100 x COLLECTION_MAX_SUPPLY.
;; An alternative impl is the idea of a collection of collections - enabling multiple collections in the same contract.
;; (impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)
(impl-trait .sip013-semi-fungible-token-trait.sip013-semi-fungible-token-trait)

(use-trait com10 .commission-trait-sip10.commission)
(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)

;; data structures
(define-fungible-token edition-token u100000)
(define-non-fungible-token artwork-token {token-id: uint, owner: principal})
(define-map token-balances {token-id: uint, owner: principal} uint)
(define-map token-supplies uint uint)
(define-map approvals {owner: principal, operator: principal, id: uint} bool)

;; contract variables
(define-data-var PER_TOKEN_MAX_SUPPLY uint u100)
(define-data-var CONTRACT_OWNER principal tx-sender)
(define-data-var ADMIN_MINT_PASS principal 'SP2DDG43477A5ZAEJJ76FSYDY2J5XQYFP9HCGS8AM)
(define-data-var token-uri (string-ascii 246) "ipfs://QmVXvcdKHUcg1RcsxAASmdAJAJtnxdE4YngcDiuAXcREZN/edition-{id}.json")
(define-data-var metadata-frozen bool false)

;; constants
(define-constant COLLECTION_MAX_SUPPLY u1000)

(define-constant ERR_TOKEN_ID_TAKEN (err u100))
(define-constant ERR_METADATA_FROZEN (err u101))
(define-constant ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE (err u102))
(define-constant ERR_PRICE_WAS_ZERO (err u104))
(define-constant ERR_NFT_NOT_LISTED_FOR_SALE (err u105))
(define-constant ERR_NFT_LISTED (err u107))
(define-constant ERR_COLLECTION_LIMIT_REACHED (err u108))
(define-constant ERR_MINT_PASS_LIMIT_REACHED (err u109))
(define-constant ERR_WRONG_COMMISSION (err u111))
(define-constant ERR_WRONG_TOKEN (err u112))
(define-constant ERR_UNKNOWN_TENDER (err u113))
(define-constant ERR_BATCH_SIZE_EXCEEDED u114)
(define-constant ERR_NOT_ADMIN_MINT_PASS (err u115))
(define-constant ERR_INSUFFICIENT_BALANCE (err u116))
(define-constant ERR_LIMIT_PER_FT_EXCEEDED (err u117))

(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_NOT_OWNER (err u402))
(define-constant ERR_NOT_ADMINISTRATOR (err u403))
(define-constant ERR_NOT_FOUND (err u404))

;; SIP-013: ------------------------------------------------------------------
(define-read-only (get-balance (token-id uint) (who principal))
	(ok (get-balance-uint token-id who))
)
(define-read-only (get-overall-balance (who principal))
	(ok (ft-get-balance edition-token who))
)
(define-read-only (get-total-supply (token-id uint))
	(ok (default-to u0 (map-get? token-supplies token-id)))
)
(define-read-only (get-overall-supply)
	(ok (ft-get-supply edition-token))
)
(define-read-only (get-decimals (token-id uint))
	(ok u0)
)
(define-read-only (get-token-uri (token-id uint))
	(ok (some (var-get token-uri)))
)
(define-public (transfer (token-id uint) (amount uint) (sender principal) (recipient principal))
	(begin
		(asserts! (or (is-eq sender tx-sender) (is-eq sender contract-caller)) ERR_NOT_AUTHORIZED)
        (try! (transfer-internal token-id amount sender recipient))
		(ok true)
	)
)
(define-private (transfer-internal (token-id uint) (amount uint) (sender principal) (recipient principal))
	(let
		(
			(sender-balance (get-balance-uint token-id sender))
		)
        ;; token must be delisted in this contract before being transferred
		(asserts! (<= amount sender-balance) ERR_INSUFFICIENT_BALANCE)
		(try! (ft-transfer? edition-token amount sender recipient))
		(try! (tag-nft-token-id {token-id: token-id, owner: sender}))
		(try! (tag-nft-token-id {token-id: token-id, owner: recipient}))
		(set-balance token-id (- sender-balance amount) sender)
		(set-balance token-id (+ (get-balance-uint token-id recipient) amount) recipient)
		(print {type: "sft_transfer_event", token-id: token-id, amount: amount, sender: sender, recipient: recipient})
		(ok true)
	)
)
(define-public (transfer-memo (token-id uint) (amount uint) (sender principal) (recipient principal) (memo (buff 34)))
	(begin
		(try! (transfer token-id amount sender recipient))
		(print memo)
		(ok true)
	)
)
(define-public (transfer-many (transfers (list 100 {token-id: uint, amount: uint, sender: principal, recipient: principal})))
	(fold transfer-many-iter transfers (ok true))
)
(define-public (transfer-many-memo (transfers (list 100 {token-id: uint, amount: uint, sender: principal, recipient: principal, memo: (buff 34)})))
	(fold transfer-many-memo-iter transfers (ok true))
)

;; SIP013 Helpers
(define-private (get-balance-uint (token-id uint) (who principal))
	(default-to u0 (map-get? token-balances {token-id: token-id, owner: who}))
)
(define-private (transfer-many-iter (item {token-id: uint, amount: uint, sender: principal, recipient: principal}) (previous-response (response bool uint)))
	(match previous-response prev-ok (transfer (get token-id item) (get amount item) (get sender item) (get recipient item)) prev-err previous-response)
)
(define-private (transfer-many-memo-iter (item {token-id: uint, amount: uint, sender: principal, recipient: principal, memo: (buff 34)}) (previous-response (response bool uint)))
	(match previous-response prev-ok (transfer-memo (get token-id item) (get amount item) (get sender item) (get recipient item) (get memo item)) prev-err previous-response)
)
;; if minting - burns the original and remints a 
(define-private (tag-nft-token-id (nft-token-id {token-id: uint, owner: principal}))
    ;; burning then minting seems counter intuitive but makes possible post conditions for semi-fungible transfers
    ;; since post conditions can't currently be hooked onto custom events.
	(begin
		(and
			(is-some (nft-get-owner? artwork-token nft-token-id))
            ;; the try! is only evaluated if nft-token-id has been minted i.e. has owner - i.e. we are in the transfer flow!
            ;; nft-burn returns an error (u1) - so control will exit here if the asset identified by nft-token-id doesn't exist
			(try! (nft-burn? artwork-token nft-token-id (get owner nft-token-id)))
		)
		(nft-mint? artwork-token nft-token-id (get owner nft-token-id))
	)
)
(define-private (set-balance (token-id uint) (balance uint) (owner principal))
	(map-set token-balances {token-id: token-id, owner: owner} balance)
)
;; ------------------------------------------------------------------------------------------

;; -- Minting / Burning functions -----------------------------------------------------------
(define-public (burn (token-id uint))
    (let (
            (owner (unwrap! (nft-get-owner? artwork-token {token-id: token-id, owner: contract-caller}) ERR_NOT_OWNER))
			(balance (get-balance-uint token-id contract-caller))
        )
        (map-delete token-balances {token-id: token-id, owner: owner})
        (try! (ft-burn? edition-token balance owner))
        (try! (nft-burn? artwork-token {token-id: token-id, owner: owner} owner))
		(ok token-id)
    )
)
(define-public (admin-mint (token-id uint) (amount uint) (recipient principal))
	(begin
        (asserts! (and (> token-id u0) (<= token-id COLLECTION_MAX_SUPPLY)) ERR_COLLECTION_LIMIT_REACHED)
        (asserts! (is-eq contract-caller (var-get ADMIN_MINT_PASS)) ERR_NOT_ADMIN_MINT_PASS)
        (asserts! (>= (var-get PER_TOKEN_MAX_SUPPLY) (+ (unwrap! (get-total-supply token-id) ERR_LIMIT_PER_FT_EXCEEDED) amount)) ERR_LIMIT_PER_FT_EXCEEDED)
		(try! (ft-mint? edition-token amount recipient))
		(try! (tag-nft-token-id {token-id: token-id, owner: recipient}))
		(set-balance token-id (+ (get-balance-uint token-id recipient) amount) recipient)
		(map-set token-supplies token-id (+ (unwrap-panic (get-total-supply token-id)) amount))
		(print {type: "sft_mint_event", token-id: token-id, amount: amount, recipient: recipient})
		(ok token-id)
	)
)
(define-public (admin-mint-many (entries (list 200 {token-id: uint, amount: uint, recipient: principal})))
    (fold check-err
        (map admin-mint-next entries)
        (ok true)
    )
)
(define-private (admin-mint-next (entry {token-id: uint, amount: uint, recipient: principal}))
    (begin
        (try! (admin-mint (get token-id entry) (get amount entry) (get recipient entry)))
        (ok true)
    )
)
;; ------------------------------------------------------------------------------------------

;; -- Approval functions --------------------------------------------------
(define-public (set-approved (token-id uint) (operator principal) (approved bool))
    (let ((owner (unwrap! (nft-get-owner? artwork-token { token-id: token-id, owner: tx-sender }) ERR_NOT_OWNER)))
        (asserts! (is-eq owner contract-caller) ERR_NOT_OWNER)
        (ok (map-set approvals { owner: owner, operator: operator, id: token-id } approved))
    )
)
(define-read-only (is-approved (token-id uint) (operator principal))
    (let ((owner (unwrap! (nft-get-owner? artwork-token { token-id: token-id, owner: operator }) ERR_NOT_OWNER)))
        (ok (is-owned-or-approved token-id operator owner))
    )
)
(define-private (is-owned-or-approved (token-id uint) (operator principal) (owner principal))
    (default-to
        (is-eq owner operator)
        (map-get? approvals {owner: owner, operator: operator, id: token-id})
    )
)
;; ------------------------------------------------------------------------------------------

;; -- Admin functions --------------------------------------------------
(define-public (set-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (var-set CONTRACT_OWNER new-administrator))
    )
)

(define-public (set-limit-per-token (limit uint))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (var-set PER_TOKEN_MAX_SUPPLY limit))
    )
)

(define-public (set-admin-mint-pass (new-admin-mint-pass principal))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (var-set ADMIN_MINT_PASS new-admin-mint-pass))
    )
)

(define-public (set-token-uri (new-token-uri (string-ascii 80)))
    (begin
        (asserts! (is-eq contract-caller (var-get CONTRACT_OWNER)) ERR_NOT_ADMINISTRATOR)
        (asserts! (not (var-get metadata-frozen)) ERR_METADATA_FROZEN)
        (var-set token-uri new-token-uri)
        (ok true))
)

(define-public (freeze-metadata)
    (begin
        (asserts! (is-eq contract-caller (var-get CONTRACT_OWNER)) ERR_NOT_ADMINISTRATOR)
        (var-set metadata-frozen true)
        (ok true)
    )
)
(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
    (match prior 
        ok-value result
        err-value (err err-value)
    )
)
;; ------------------------------------------------------------------------------------------