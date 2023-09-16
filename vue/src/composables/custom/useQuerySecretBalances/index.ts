import { getStkdSecretBalance } from "@/secret-client/SecretClient";
import { useQuery } from "@tanstack/vue-query";

export default function useSecretQueryBalances() {
  const QuerySecretBalances = (address: string, contractAddress: string, options: any) => {
    const key = { type: "QuerySecretBalances", address, contractAddress };
    return useQuery(
      [key],
      () => {
        const { address, contractAddress } = key;
        return getStkdSecretBalance()
          .then((res) => res);
      },
      options
    );
  };

  return { QuerySecretBalances };
}
