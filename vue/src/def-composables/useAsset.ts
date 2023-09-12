import { computed } from "vue";
import useCosmosBankV1Beta1 from "../composables/useCosmosBankV1Beta1";
import { useWalletStore } from "@/stores/useWalletStore";

export const useAsset = (denom: string) => {
  const walletStore = useWalletStore();
  const { QueryBalance } = useCosmosBankV1Beta1();
  const enabled = computed(() => walletStore.selectedAddress != "");
  const query = QueryBalance(walletStore.selectedAddress, { denom }, {
    enabled
  });
  const balance = computed(() => {
    return query.data?.value?.balance;
  });
  return { balance, isLoading: query.isLoading };
};
