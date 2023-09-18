import { useViewingKey } from "@/def-composables/useViewingKey";
import { computed, type Ref } from "vue";
import useSecretQueryBalances from "@/composables/custom/useQuerySecretBalances";
import { envSecret } from "@/env";
import { useWalletStore } from "@/stores/useWalletStore";

const byAddress = {} as Record<string, any>;

export function useSecretAssetAmount(contractAddress: string): { amount: Ref<string>; isLoading: Ref<boolean> } {
  if (byAddress[contractAddress]) {
    return byAddress[contractAddress];
  }
  const vk = useViewingKey(contractAddress);
  const walletStore = useWalletStore();
  const enabledSecret = computed(() => !!vk.hasViewingKey.value); // if useAssets is called with no wallet connected/no address actual query will be registered but never ran
  const computedSecretBalances = computed(() => useSecretQueryBalances(walletStore.secretJsClient)); //later pass the secret client from the wallet provider
  const secretAddress = computed(() => walletStore.addresses[envSecret.chainId]);

  const secretBalancesQuery = computed(() =>
    computedSecretBalances.value?.QuerySecretBalances(secretAddress.value, contractAddress, {
      enabled: enabledSecret.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    })
  );
  byAddress[contractAddress] = {
    amount: computed(() => secretBalancesQuery?.value?.data.value),
    isLoading: computed(() => vk.hasViewingKey.value && secretBalancesQuery?.value?.isLoading.value),
  };
  return useSecretAssetAmount(contractAddress);
}
