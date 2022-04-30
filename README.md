# Clarity Projects

To run clarinet tests cd into the project and run clarinet test

```#javascript
> cd projects/risidio/indige
> clarinet test
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