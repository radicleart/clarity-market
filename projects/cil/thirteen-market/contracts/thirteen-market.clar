
;; Working example of a SIP013 marketplace contract.
;; (impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)
(use-trait nft-trait .sip013-semi-fungible-token-trait.sip013-semi-fungible-token-trait)
(use-trait ft-trait .sip-010-trait-ft-standard.sip-010-trait)
(use-trait commission-trait .commission-trait-sip10.commission)

;; data structures
(define-map allowed-asset-contracts principal bool)
(define-map listings uint
    {
		token-id: uint,
		maker: principal,
		nft-asset-contract: principal,
		expiry: uint,
        unit-price: uint,
        amount: uint,
		taker: (optional principal),
        commission: principal, 
        token: principal
    }
)
(define-data-var listing-nonce uint u1)
(define-data-var CONTRACT_OWNER principal tx-sender)

;; errors
(define-constant ERR_UNKNOWN_LISTING (err u2000))
(define-constant ERR_PRICE_WAS_ZERO (err u2001))
(define-constant ERR_NFT_ASSET_MISMATCH (err u2003))
(define-constant ERR_ASSET_NOT_ALLOWED (err u2005))
(define-constant ERR_EXPIRY_IN_PAST (err u2006))
(define-constant ERR_PAYMENT_CONTRACT_NOT_ALLOWED (err u2007))
(define-constant ERR_MAKER_TAKER_EQUAL (err u2008))
(define-constant ERR_UNINTENDED_TAKER (err u2009))
(define-constant ERR_LISTING_EXPIRED (err u2010))
(define-constant ERR_PAYMENT_ASSET_MISMATCH (err u2012))
(define-constant ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE (err u2013))
(define-constant ERR_WRONG_COMMISSION (err u2014))
(define-constant ERR_WRONG_TOKEN (err u2015))
(define-constant ERR_NOT_OWNER (err u402))
(define-constant ERR_NOT_ADMINISTRATOR (err u403))



;; -- Marketplace functions -----------------------------------------------------------------
(define-read-only (get-listing (listing-id uint))
	(map-get? listings listing-id)
)

(define-public (list-in-token (nft-asset-contract <nft-trait>) (listing {token-id: uint, amount: uint, unit-price: uint, expiry: uint, taker: (optional principal)}) (com <commission-trait>) (payment-token <ft-trait>))
    (let (
            (listing-id (var-get listing-nonce))
        )
		(asserts! (is-allowed (contract-of nft-asset-contract)) ERR_ASSET_NOT_ALLOWED)
		(asserts! (is-allowed (contract-of payment-token)) ERR_PAYMENT_CONTRACT_NOT_ALLOWED)
		(asserts! (> (get expiry listing) block-height) ERR_EXPIRY_IN_PAST)
		(asserts! (> (get unit-price listing) u0) ERR_PRICE_WAS_ZERO)

        (try! (transfer-nft nft-asset-contract (get token-id listing) (get amount listing) tx-sender (as-contract tx-sender)))
		(map-set listings listing-id (merge {maker: tx-sender, nft-asset-contract: (contract-of nft-asset-contract), commission: (contract-of com), token: (contract-of payment-token)} listing))
		(var-set listing-nonce (+ listing-id u1))
		(ok listing-id)
    )
)

(define-public (unlist-in-token (listing-id uint) (nft-asset-contract <nft-trait>))
	(let (
		    (listing (unwrap! (map-get? listings listing-id) ERR_UNKNOWN_LISTING))
		    (maker (get maker listing))
		)
		(asserts! (is-eq maker tx-sender) ERR_NOT_OWNER)
		(asserts! (is-eq (get nft-asset-contract listing) (contract-of nft-asset-contract)) ERR_NFT_ASSET_MISMATCH)
		(map-delete listings listing-id)
		(as-contract (transfer-nft nft-asset-contract (get token-id listing) (get amount listing) tx-sender maker))
	)
)

(define-private (transfer-nft (token-contract <nft-trait>) (token-id uint) (amount uint) (sender principal) (recipient principal))
	(contract-call? token-contract transfer token-id amount sender recipient)
)

(define-public (buy-in-token (listing-id uint) (nft-asset-contract <nft-trait>) (comm <commission-trait>) (token <ft-trait>))
    (let 
        (
		    (listing (unwrap! (map-get? listings listing-id) ERR_UNKNOWN_LISTING))
            (taker contract-caller)
            (amount (get amount listing))
            (price (* amount (get unit-price listing)))
        )
		(asserts! (not (is-eq (get maker listing) tx-sender)) ERR_MAKER_TAKER_EQUAL)
		(asserts! (match (get taker listing) intended-taker (is-eq intended-taker tx-sender) true) ERR_UNINTENDED_TAKER)
		(asserts! (< block-height (get expiry listing)) ERR_LISTING_EXPIRED)
		(asserts! (is-eq (get nft-asset-contract listing) (contract-of nft-asset-contract)) ERR_NFT_ASSET_MISMATCH)
        (asserts! (is-eq (contract-of token) (get token listing)) ERR_WRONG_TOKEN)
        (asserts! (is-eq (contract-of comm) (get commission listing)) ERR_WRONG_COMMISSION)
        
        (try! (contract-call? token transfer price taker (get maker listing) none))
        (try! (contract-call? comm pay token (get token-id listing) price))
		(try! (as-contract (transfer-nft nft-asset-contract (get token-id listing) (get amount listing) tx-sender taker)))
		(map-delete listings listing-id)
        (ok true)
    )
)
;; ------------------------------------------------------------------------------------------

;; -- Admin functions -----------------------------------------------------------------------
(define-public (set-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (var-set CONTRACT_OWNER new-administrator))
    )
)

(define-read-only (is-allowed (asset-contract principal))
	(default-to false (map-get? allowed-asset-contracts asset-contract))
)

(define-public (set-allowed (asset-contract principal) (allowed bool))
	(begin
		(asserts! (is-eq (var-get CONTRACT_OWNER) tx-sender) ERR_NOT_ADMINISTRATOR)
		(ok (map-set allowed-asset-contracts asset-contract allowed))
	)
)
;; ------------------------------------------------------------------------------------------