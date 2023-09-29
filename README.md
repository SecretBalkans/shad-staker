# ShadStaker
ShadStaker is a decentralized application that allows seemless staking/unstaking of SCRT, through the Shade protocol. It integrates Keplr wallet and provides custom rpc and api url selection. Through this app, users can choose any stakable assets undependent of the source chain and stake them in 1 simple click.
ShadStaker does the calculation of the best possible route and execute needed operations (swap, ibc, unwrap, wait). App is deployed on the Akash network, which makes it "unstoppable", resiliant to failures.

## Problem
There are multiple problems that ShadStaker is addressing. 
- UI/UX is a big problem within the blockchain space. We need solutions which would simplify things to the end user if we want to drive mass adoption of the tech.
- Shade protocol allows users to stake and unstake their assets, but they need to execute set of manual operations (swap, ibc, unwrap) to be able to stake their SCRT.
- Shade's UI for staking is not deployed to the decentralized cloud like Akash, which makes it less reliable.

## Solution

ShadeStaker consists of the Front-End dapp and the Route Calculation Engine.
### Front-End
- Built with Vue3/Vite. App uses composable patters for flowless rerendering of the components.
- Supports Keplr integration and custom rpc selection.
- Interface shows important market data and allow users to interact with the Shade protocol. 
- Deployed on Akash Network. In the Vue directory, there is deploy.yml file, which represent manifest for the Akash deployment. Docker image is stored on the Hub.

### Route Calculation Engine
This part of the system is used for finding the optimal route for staking.
Steps of route calculation:
- looking for the arbitrage opportunities
- building execution path
- executing atomic operations (swap, ibc, unwrap, wait)

## Usage
Dapp is hosted [here](http://ma4tshskutaaba50l865j7s4p8.ingress.d3akash.cloud/) <br/>

Docker image is [here](https://hub.docker.com/layers/hadzija7/shad-staker/3/images/sha256-214a476e24c36f19646567b435f12794ec922c8cd89465d9624b3dd7f02459dd?context=repo) <br/>

Akash SDL file is [here](https://github.com/SecretBalkans/akash-frontend/blob/main/vue/deploy.yml) <br/>

If you want to run locally, follow instruction in [Vue repositiory](https://github.com/SecretBalkans/akash-frontend/tree/main/vue)


## Demo
Demo video is hosted [here](https://youtu.be/E0Iax3bqhG4)
