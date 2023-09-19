import useQueryStkdSecretInfo from "@/composables/custom/useQueryStkdSecretInfo";
import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";

export const useStkdSecretInfo = () => {
  const walletStore = useWalletStore();

  const computedStkdSecretInfo = computed(() => useQueryStkdSecretInfo(walletStore.secretJsClient)); //later pass the secret client from the wallet provider
  const enabled = computed(() => !!walletStore.secretJsClient);
  const stkdSecretInfoQuery = computed(() =>
    computedStkdSecretInfo.value?.QueryStkdSecretInfo({
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    })
  );
  return computed(() => stkdSecretInfoQuery?.value?.data?.value?.["staking_info"]);
};
