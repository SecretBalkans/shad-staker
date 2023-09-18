import { computed } from "vue";
import useCosmosBankV1Beta1 from "../composables/useCosmosBankV1Beta1";
import { useWalletStore } from "@/stores/useWalletStore";

export const useAsset = (denom: string, chainId: string) => {
  const walletStore = useWalletStore();
  const { QueryBalance } = useCosmosBankV1Beta1(walletStore.activeClients[chainId]);
  const enabled = computed(() => !!walletStore.addresses[chainId]);
  const query = QueryBalance(
    walletStore.addresses[chainId],
    { denom },
    {
      enabled,
      refetchOnWindowFocus: true,
    }
  );
  const balance = computed(() => {
    return query.data?.value?.balance;
  });
  return { balance, isLoading: query.isLoading };
};
