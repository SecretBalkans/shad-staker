const apiURL = import.meta.env.VITE_API_COSMOS ?? "https://rest.cosmos.directory/cosmoshub" //"http://localhost:1317";
const rpcURL = import.meta.env.VITE_WS_TENDERMINT ?? "https://rpc.cosmos.directory/cosmoshub"//"http://localhost:26657";
const prefix = import.meta.env.VITE_ADDRESS_PREFIX ?? "cosmos";

export const env = {
  apiURL,
  rpcURL,
  prefix,
};
