const apiURL =
  import.meta.env.VITE_API_COSMOS ?? "https://rest.cosmos.directory/cosmoshub"; //"http://localhost:1317";
const rpcURL =
  import.meta.env.VITE_WS_TENDERMINT ??
  "https://rpc.cosmos.directory/cosmoshub"; //"http://localhost:26657";
const prefix = import.meta.env.VITE_ADDRESS_PREFIX ?? "cosmos";

const apiURLSecret =
  import.meta.env.VITE_API_COSMOS ??
  "https://rest.cosmos.directory/secretnetwork"; //"http://localhost:1317";
const rpcURLSecret =
  import.meta.env.VITE_WS_TENDERMINT ??
  "https://rpc.cosmos.directory/secretnetwork"; //"http://localhost:26657";
const prefixSecret = import.meta.env.VITE_ADDRESS_PREFIX ?? "secret";

const apiURLOsmosis =
  import.meta.env.VITE_API_COSMOS ?? "https://rest.cosmos.directory/osmosis"; //"http://localhost:1317";
const rpcURLOsmosis =
  import.meta.env.VITE_WS_TENDERMINT ?? "https://rpc.cosmos.directory/osmosis"; //"http://localhost:26657";
const prefixOsmosis = import.meta.env.VITE_ADDRESS_PREFIX ?? "osmo";

export const env = {
  apiURL,
  rpcURL,
  prefix,
};

export const envSecret = {
  apiURL: apiURLSecret,
  rpcURL: rpcURLSecret,
  prefix: prefixSecret,
};

export const envOsmosis = {
  apiURL: apiURLOsmosis,
  rpcURL: rpcURLOsmosis,
  prefix: prefixOsmosis,
};
