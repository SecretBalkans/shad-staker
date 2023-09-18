    import useQueryStkdSecretInfo from "@/composables/custom/useQueryStkdSecretInfo";
import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";

export const useStakingFees = () => {
    const walletStore = useWalletStore();

    const computedStkdSecretInfo = computed(() => useQueryStkdSecretInfo(walletStore.secretJsClient)); //later pass the secret client from the wallet provider
    const enabled = computed(() => !!walletStore.secretJsClient);
    const stkdSecretInfoQuery = computed(() =>
        computedStkdSecretInfo.value?.QueryStakingFees(
            {
            enabled: enabled.value,
            staleTime: 12000,
            refetchInterval: 12000,
            refetchIntervalInBackground: false,
            refetchOnWindowFocus: true,
            }
        )
    );

    const stakingFees = computed(() => {
        const res = stkdSecretInfoQuery?.value?.data?.value?.['fee_info']
        return res
    })

    return stakingFees
}