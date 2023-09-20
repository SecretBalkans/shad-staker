import { computed, effectScope, ref } from "vue";
import useQueryStkdSecretInfo from "@/composables/custom/useQueryStkdSecretInfo";
let instance: any;
export function useSecretStakingMarketData(client: any) {
  if (instance) {
    return instance;
  } else {
    instance = useSecretStakingMarketDataInstance(client);
    return instance;
  }
}
function useSecretStakingMarketDataInstance(client: any) {
  const scope = effectScope();
  const stkdSecretInfo = ref();
  const unbondings = ref();
  const stakingFees = ref();
  scope.run(() => {
    const { QueryStkdSecretInfo, QueryStakingFees, QueryUnbonding } = useQueryStkdSecretInfo(client);

    stkdSecretInfo.value = QueryStkdSecretInfo({
      enabled: true,
      staleTime: 120000,
      refetchInterval: 120000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

    unbondings.value = QueryUnbonding({
      enabled: true,
      staleTime: 120000,
      refetchInterval: 120000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });
    stakingFees.value = QueryStakingFees({
      enabled: true,
      staleTime: 120000,
      refetchInterval: 120000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });
  });
  return {
    stop: scope.stop,
    stkdSecretInfo: computed(() => stkdSecretInfo.value?.data),
    unbondings: computed(() => unbondings.value?.data),
    stakingFees: computed(() => stakingFees.value?.data),
  };
}
