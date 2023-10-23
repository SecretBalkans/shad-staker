import { computed, effectScope, ref } from "vue";
import useQueryStkdSecretInfo from "@/composables/custom/useQueryStkdSecretInfo";
import { calculateBestShadeSwapRoutes, parseRawShadePool } from "@/utils/shade-calc-utils";
import BigNumber from "bignumber.js";
let instance: any;
export function useStkdScrtSwapPoolData(secretJsClient?: any) {
  if (!secretJsClient) {
    return instance;
  }
  if (instance) {
    return instance;
  } else {
    instance = useStkdScrtSwapPoolDataInstance(secretJsClient);
    return instance;
  }
}
function useStkdScrtSwapPoolDataInstance(secretJsClient: any) {
  const scope = effectScope();
  const stkdSecretPoolData = ref();
  const parsed = computed(() => {
    const data = stkdSecretPoolData.value?.data;
    if (!data) {
      return null;
    }
    return parseRawShadePool(
      {
        token_0: "SCRT",
        token_1: "stkd-SCRT",
        lp_token: data.liquidity_token,
        token_0_amount: data.amount_0,
        token_1_amount: data.amount_1,
        flags: data.flags,
        stable_params: {
          price_ratio: data.stable_info?.p,
          gamma1: data.stable_info?.stable_params.gamma1,
          gamma2: data.stable_info?.stable_params.gamma2,
          a: data.stable_info?.stable_params.a,
          min_trade_size_0_to_1: data.stable_info?.stable_params.min_trade_size_x_for_y,
          min_trade_size_1_to_0: data.stable_info?.stable_params.min_trade_size_y_for_x,
          max_price_impact_allowed: data.stable_info?.stable_params.max_price_impact_allowed,
        },
        id: "1111051c-5a3d-4ec0-81c8-e8e00c53a812",
        fees: {
          dao: BigNumber(data.fee_info?.shade_dao_fee?.nom).dividedBy(data.fee_info?.shade_dao_fee?.denom).toString(),
          lp: BigNumber(data.fee_info?.lp_fee?.nom).dividedBy(data.fee_info?.lp_fee?.denom).toString(),
        },
      },
      6,
      6
    );
  });
  scope.run(() => {
    const { QueryStkdScrtPoolData } = useQueryStkdSecretInfo(secretJsClient);

    stkdSecretPoolData.value = QueryStkdScrtPoolData({
      enabled: true,
      staleTime: 240000,
      refetchInterval: 240000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });
  });
  return {
    stop: scope.stop,
    swapSCRT: (amount: BigNumber) => {
      if (!parsed.value) {
        return null;
      }
      return BigNumber(
        calculateBestShadeSwapRoutes({
          inputTokenAmount: BigNumber(amount).multipliedBy(10 ** 6),
          startingTokenId: "SCRT",
          endingTokenId: "stkd-SCRT",
          isReverse: false,
          maxHops: 5,
          // TODO: there is a limit on secret network for max hops length.
          //  we need to split big routes into two smaller ones and execute it into
          //  two messages and thus support bigger (7-8-more?) routes
          //  as they can often give better arb
          shadePairs: { "SCRT_stkd-SCRT": parsed.value },
        })[0]?.quoteOutputAmount
      ).dividedBy(10 ** 6);
    },
    swapStkdSCRT: (amount: number | BigNumber) => {
      if (!parsed.value) {
        return null;
      }
      return BigNumber(
        calculateBestShadeSwapRoutes({
          inputTokenAmount: BigNumber(amount).multipliedBy(10 ** 6),
          startingTokenId: "stkd-SCRT",
          endingTokenId: "SCRT",
          isReverse: false,
          maxHops: 5,
          // TODO: there is a limit on secret network for max hops length.
          //  we need to split big routes into two smaller ones and execute it into
          //  two messages and thus support bigger (7-8-more?) routes
          //  as they can often give better arb
          shadePairs: { "SCRT_stkd-SCRT": parsed.value },
        })[0]?.quoteOutputAmount
      ).dividedBy(10 ** 6);
    },
  };
}
