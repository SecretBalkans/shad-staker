const apiURLSecret =
  import.meta.env.VITE_API_COSMOS ??
  "https://secretnetwork-api.lavenderfive.com:443"// "https://secretnetwork-api.lavenderfive.com:443"; //"http://localhost:1317";
const rpcURLSecret =
  import.meta.env.VITE_WS_TENDERMINT ??
  "https://secretnetwork-rpc.lavenderfive.com:443"; //"http://localhost:26657";
const prefixSecret = import.meta.env.VITE_ADDRESS_PREFIX ?? "secret";

const apiURLOsmosis =
  import.meta.env.VITE_API_COSMOS ?? "https://lcd-osmosis.whispernode.com:443"; //"http://localhost:1317";
const rpcURLOsmosis =
  import.meta.env.VITE_WS_TENDERMINT ?? "https://rpc-osmosis-ia.cosmosia.notional.ventures"; //"http://localhost:26657";
const prefixOsmosis = import.meta.env.VITE_ADDRESS_PREFIX ?? "osmo";

export const envSecret = {
  apiURL: apiURLSecret,
  rpcURL: rpcURLSecret,
  prefix: prefixSecret,
  chainId: "secret-4",
};

export const envOsmosis = {
  apiURL: apiURLOsmosis,
  rpcURL: rpcURLOsmosis,
  prefix: prefixOsmosis,
  chainId: "osmosis-1",
};
