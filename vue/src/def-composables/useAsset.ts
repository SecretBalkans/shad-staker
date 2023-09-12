import { computed } from "vue";
import useCosmosBankV1Beta1 from "../composables/useCosmosBankV1Beta1";
import { useWalletStore } from "@/stores/useWalletStore";

export const useAsset = (denom: string) => {
  const walletStore = useWalletStore();
  const { QueryBalance } = useCosmosBankV1Beta1();
  const query = computed((e) => {
    console.log(e);
    return QueryBalance(walletStore.selectedAddress, { denom }, {});
  });
  const balance = computed(() => {
    return query.value.data?.value?.balance;
  });
  return { balance, isLoading: query.value.isLoading };
};
