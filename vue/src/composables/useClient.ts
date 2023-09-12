import { Client } from "example-client-ts";
import type { Env } from "example-client-ts/env";
import { useWalletStore } from "@/stores/useWalletStore";

const useClientInstance = (env?: Env) => {
  if (!env) {
    const walletStore = useWalletStore();
    return walletStore.activeClient;
  } else {
    const client = new Client(env);
    return client;
  }
};
let clientInstance: any; //ReturnType<typeof useClientInstance>;

export const useClient = (env?: Env) => {
  if (!clientInstance) {
    clientInstance = useClientInstance(env);
  }
  return clientInstance;
};

const useClientInstanceGeneric = (env: any) => {
  const client = new Client(env);
  return client;
};
let clientInstanceGeneric: any; //ReturnType<typeof useClientInstanceGeneric>;
let currentEnv: any;

export const useClientGeneric = (env: any) => {
  if (!clientInstanceGeneric || currentEnv != env) {
    clientInstanceGeneric = useClientInstanceGeneric(env);
  }
  return clientInstanceGeneric;
};
