# Clarity Market 1 2020

## Clarinet Commands

> clarinet new crashpunks-v2
> clarinet contract new crashpunks-v2
## Non Fungible Tokens / Digital Collectibles

Project spec can be found here: [Risidio Auctions](https://github.com/stacksgov/Stacks-Grants/issues/12)

Goals / roadmap of this work are;

* define digital assets as a space of sha 256 hashes (of collectibles / artwork)
* define projects as spaces of digital assets
* mint digital collectibles to owners addresses
* allow project (saas client) and platform to charge a small minting fee
* add marketplace and auction functionality

The specific amount of STX required to mint is project dependent and set by the project administrator.

Functionality is delivered in the following modules;

1. nongibles.clar
2. projects.clar
3. error-codes.clar

Where `nongibles.clar` manages the minting of assets / collectibles and `projects.clar`
handles project administration. Common erros are implemented by `error-codes.clar`.

We hope to connect these smart contracts to a platform for digital collectible. The project is inspired
by the Open Sea platform and our work building the radicle art and loopbomb d-apps.

## Clarinet Testing
Install clarinet by following the instructions [here](https://github.com/hirosystems/clarinet).
Install lcov as well. You'll have to find the respective instructions on your operating system.

```bash
clarinet test --coverage
```
will generate the file `coverage.lcov`

You can then view the coverage report by running 
```bash
genhtml coverage.lcov -o coverage
```
and opening the resulting `index.html` in the `coverage/` folder. 


## Unit Testing

```bash
git clone git@github.com:radicleart/clarity-hackathon-level1.git

npm install
```

(node version `nvm use v12.16.3`)

test classes can be found in `test/unit/*.ts`

```javascript
npm run nongibles
npm run projects
```

Note: nongibles tests currently fail because of current limitations in tooling around using
`(contract-call?)` in unit test environment.

## Integration Testing

Testing of this contract requires integration testing on the stacks mocknet. A high level description is presented below but most of the details were worked out by  [Friedger](https://github.com/friedger/clarity-smart-contracts) in Blockstack Community
so please head over there and check out his `escrow` contract for full details.

Generate two key sets using

```bash
cargo run --bin blockstack-cli generate-sk --testnet
```

Edit Stacks.toml to add the public key and set initial balances and run mocknet

```bash
vi $HOME/stacks-blockchain/testnet/stacks-node/Stacks.toml

nohup cargo testnet start --config=./testnet/stacks-node/Stacks.toml &

// tail the log file to watch for runtime errors in your script...
tail -f -n 200000 nohup.out | grep -i ST18PE05NG1YN7X6VX9SN40NZYP7B6NQY6C96ZFRC
```

Check balances and contract deployment using the API;

* Minter Balance: http://127.0.0.1:20443/v2/accounts/ST18PE05NG1YN7X6VX9SN40NZYP7B6NQY6C96ZFRC
* Contract Balance: http://127.0.0.1:20443/v2/accounts/STFJEDEQB1Y1CQ7F04CS62DCS5MXZVSNXXN413ZG
* Contract Source: http://127.0.0.1:20443/v2/contracts/source/ST18PE05NG1YN7X6VX9SN40NZYP7B6NQY6C96ZFRC/collectibles

## Issues

### Error Running Sidecar

```bash
$ npm run dev:integrated

> @blockstack/stacks-blockchain-sidecar@1.0.0 dev:integrated /Users/mikey/hubgit/blockstack/stacks-blockchain-sidecar
> npm run generate:schemas && npm run devenv:build && concurrently npm:dev npm:devenv:deploy

npm ERR! missing script: generate:schemas
```

### Unable to Call Read Only Functions

The problem  with the sidecar combined with not being able to find a way to call read only functions
using `makeContractCall` meant I wasn't quite able to read state from the chain and get the tests into
the correct shape.

```javascript
  var transaction = await makeContractCall({
    contractAddress: keys['contract-base'].stacksAddress,
    contractName,
    functionName,
    functionArgs,
    fee,
    senderKey: keys[sender].secretKey,
    nonce,
    network,
  });
  var result = await broadcastTransaction(transaction, network);
```

## References

* [Blockstack Clarity Documentation](https://docs.blockstack.org/core/smart/rpc-api.html)
* [Stacks Transactions JS Library](https://github.com/blockstack/stacks.js)
* [Stacks Blockchain](https://github.com/blockstack/stacks-blockchain)
* [Stacks Blockchain Sidecar](https://github.com/blockstack/stacks-blockchain-sidecar)
* [Clarity JS SDK](https://github.com/blockstack/clarity-js-sdk)
* [Clarity VSCode](https://github.com/blockstack/clarity-vscode)
