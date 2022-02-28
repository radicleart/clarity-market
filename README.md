# Clarity Market 1 2020

# Contracts

[Arkadiko](https://app.arkadiko.finance/)

```
SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-dao-token-trait-v1
SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token
SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-dao
```

Token Pair and Swap Contract
```
SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.wrapped-stx-token
SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-swap-token-wstx-xbtc
```

```
get-pair-details (YZR.wrapped-stx-token, YZR.Wrapped-Bitcoin)
(ok (some (tuple (balance-x u153799683635) (balance-y u440698629) (enabled true) (fee-balance-x u332732249) (fee-balance-y u1323023) (fee-to-address (some SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR)) (name "wSTX-xBTC") (shares-total u8127104822) (swap-token SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-swap-token-wstx-xbtc))))
```
## Clarinet Repo Structure

Adding a new project..

```bash
> cd projects
> clarinet new crashpunks-v2
> clarinet contract new crashpunks-v2

> clarinet new appmap
> clarinet contract new appmap
```

Run `clarinet test` within the specific project

```bash
$ tree -L 2 -I node_modules
.
├── README.md
├── configs
│   ├── README.md
│   ├── krypton-miner-conf.toml
│   └── xenon-miner-conf.toml
├── contracts
│   ├── commission-fixed.clar
│   ├── commission-nop.clar
│   ├── commission-thisisnumberone.clar
│   ├── genesis
│   ├── legacy
│   ├── template.clar
│   ├── testnet
│   └── traits
├── coverage.lcov
├── package-lock.json
├── package.json
├── projects
│   ├── appmap
│   ├── crashpunks-v2
│   └── loopbomb
├── settings
│   ├── Devnet.toml
│   ├── Mainnet.toml
│   └── Testnet.toml
├── src
│   ├── appmap-client.ts
│   ├── crashpunks-v1-client.ts
│   ├── crashpunks-v2-client.ts
│   ├── loopbomb-client.ts
│   └── utils.ts
└── tsconfig.json
```


## References

* [Blockstack Clarity Documentation](https://docs.blockstack.org/core/smart/rpc-api.html)
* [Stacks Transactions JS Library](https://github.com/blockstack/stacks.js)
* [Stacks Blockchain](https://github.com/blockstack/stacks-blockchain)
* [Stacks Blockchain Sidecar](https://github.com/blockstack/stacks-blockchain-sidecar)
* [Clarity JS SDK](https://github.com/blockstack/clarity-js-sdk)
* [Clarity VSCode](https://github.com/blockstack/clarity-vscode)