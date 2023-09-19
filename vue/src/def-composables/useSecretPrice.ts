import useOracle from "@/composables/custom/useOracle";
import { computed } from "vue";

export const useSecretPrice = () => {

    const computedStkdSecretInfo = computed(() => useOracle());
    const stkdSecretInfoQuery = computed(() =>
        computedStkdSecretInfo.value?.QuerySecretPrice(
            {
            enabled: true,
            staleTime: 12000,
            refetchInterval: 12000,
            refetchIntervalInBackground: false,
            refetchOnWindowFocus: true,
            }
        )
    );

    const secretPrice = computed(() => {
        return stkdSecretInfoQuery?.value?.data?.value
    })

    return secretPrice
}