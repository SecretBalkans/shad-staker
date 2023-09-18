import type { SecretClient } from "@/secret-client/SecretClient";
import { useQuery } from "@tanstack/vue-query";

export default function useSecretQueryBalances(client: any) {
  const QuerySecretBalances = (address: string, contractAddress: string, options: any) => {
    const key = { type: "QuerySecretBalances", address, contractAddress };
    return useQuery(
      [key],
      () => {
        const { contractAddress } = key;
        return client?.getSecretBalance(contractAddress).then((res) => res);
      },
      options
    );
  };

  return { QuerySecretBalances };
}
