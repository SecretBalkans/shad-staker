import { useQuery } from "@tanstack/vue-query";

export default function useSecretQueryBalance() {
  const QuerySecretBalance = (address: string, contractAddress: string, client: any, options: any) => {
    const key = { type: "QuerySecretBalance", address, contractAddress };
    return useQuery(
      [key],
      () => {
        const { contractAddress } = key;
        return client.getSecretBalance(contractAddress).then((res: any) => res);
      },
      options
    );
  };

  return { QuerySecretBalance };
}
