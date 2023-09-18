import useIbcApplicationsTransferV1 from "@/composables/useIbcApplicationsTransferV1";
import { computed, ref, unref } from "vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { watch } from "vue";
import { hydrate, dehydrate } from "@tanstack/vue-query";
import useSecretQueryBalances from "@/composables/custom/useQuerySecretBalances";

const useSecretDenomInstances = {} as Record<string, ReturnType<typeof useSecretDenomInstance>>;
const useSecretDenomInstance = (contractAddress: string, secretAddress: string) => {
  const walletStore = useWalletStore();
  const computedSecretBalances = computed(() => useSecretQueryBalances(walletStore.secretJsClient)); //later pass the secret client from the wallet provider
  const enabled = computed(() => !!computedSecretBalances.value);
  const secretBalancesQuery = computed(() =>
    computedSecretBalances.value?.QuerySecretBalances(secretAddress, contractAddress, {
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    })
  );

  return secretBalancesQuery.value?.data.value;
};
export const useSecretDenom = (contractAddress: string, secretAddress: string) => {
  const denomAddress = `${contractAddress}_${secretAddress}`;
  if (!useSecretDenomInstances[denomAddress]) {
    useSecretDenomInstances[denomAddress] = useSecretDenomInstance(denomAddress, secretAddress);
  }
  return useSecretDenomInstances[denomAddress];
};
