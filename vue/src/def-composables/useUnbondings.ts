import useQueryStkdSecretInfo from "@/composables/custom/useQueryStkdSecretInfo";
import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";

export const useUnbondings = () => {
  const walletStore = useWalletStore();

  const computedStkdSecretInfo = computed(() => useQueryStkdSecretInfo(walletStore.secretJsClient));
  const enabled = computed(() => !!walletStore.secretJsClient);
  const stkdSecretInfoQuery = computed(() =>
    computedStkdSecretInfo.value?.QueryUnbonding({
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    })
  );

  return computed(() => stkdSecretInfoQuery?.value?.data?.value?.["unbonding"]);
};
