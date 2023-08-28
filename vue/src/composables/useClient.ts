import { Client } from 'example-client-ts'
import { env } from '../env';

const useClientInstance = () => {
  const client = new Client(env);
  return client;
};
let clientInstance: any//ReturnType<typeof useClientInstance>;

export const useClient = () => {
  if (!clientInstance) {
    clientInstance = useClientInstance();
  }
  return clientInstance;
};

const useClientInstanceGeneric = (env: any) => {
  const client = new Client(env);
  return client;
};
let clientInstanceGeneric: any//ReturnType<typeof useClientInstanceGeneric>;
let currentEnv: any

export const useClientGeneric = (env: any) => {
if (!clientInstanceGeneric || currentEnv != env) {
    clientInstanceGeneric = useClientInstanceGeneric(env);
  }
  return clientInstanceGeneric;
};
