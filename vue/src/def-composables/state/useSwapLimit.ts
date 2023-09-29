import { computed } from "vue";
import { useStkdScrtSwapPoolData } from "@/def-composables/useStkdScrtSwapPoolData";
import BigNumber from "bignumber.js";
import type { Amount } from "@/utils/types";
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";

let swapLimitInstance: any;

export function useSwapLimit(secretJsClient: any) {
  swapLimitInstance = swapLimitInstance || useUseSwapLimitInstance(secretJsClient);
  return swapLimitInstance;
}

function useUseSwapLimitInstance(secretJsClient: any) {
  const swapSCRStkdSCRTPoolData = useStkdScrtSwapPoolData(secretJsClient);
  const marketData = useSecretStakingMarketData(secretJsClient);
  return computed(() => {
    let scrtSwapLimitStored = JSON.parse(localStorage.getItem("SCRT_stkdSCRT_Limits") || "0");
    const priceInfo = marketData.stkdSecretInfo.value;
    if (!scrtSwapLimitStored || Date.now() - scrtSwapLimitStored.ts >= 600 * 1000) {
      if (!priceInfo || !swapSCRStkdSCRTPoolData.swapSCRT(BigNumber(100_000))?.isPositive()) {
        return null;
      }
      const price = BigNumber(priceInfo.price)
        .dividedBy(10 ** 6)
        .multipliedBy(1 + 0.2 / 100);
      let baseAmount = BigNumber(100_000);
      let step = BigNumber(20_000);
      const epsilon = price.dividedBy(10 ** 5);
      let count = 0;
      let prevAmount = BigNumber(baseAmount);
      let previousOutcome = prevAmount.dividedBy(swapSCRStkdSCRTPoolData.swapSCRT(baseAmount)).minus(price);

      let dir = 1;
      let bestOutcome: Amount, result: BigNumber;
      do {
        baseAmount = baseAmount.plus(step.multipliedBy(dir));
        if (baseAmount.isLessThanOrEqualTo(10)) {
          baseAmount = BigNumber(10);
        }
        const stkdScrtReceived = swapSCRStkdSCRTPoolData.swapSCRT(baseAmount);
        result = baseAmount.dividedBy(stkdScrtReceived);
        bestOutcome = result.minus(price);
        if (!bestOutcome?.toNumber() || !previousOutcome?.toNumber()) {
          return null;
        }
        if (
          bestOutcome.absoluteValue().isGreaterThan(previousOutcome.absoluteValue()) ||
          bestOutcome.isPositive() !== previousOutcome.isPositive()
        ) {
          dir *= -1;
          step = step.dividedBy(2);
        }
        prevAmount = baseAmount;
        previousOutcome = bestOutcome;
      } while (count++ < 1000 && bestOutcome.absoluteValue().isGreaterThan(epsilon));
      scrtSwapLimitStored = {
        ts: Date.now(),
        scrtSwapLimit: baseAmount.toFixed(6),
        stkdSCRTWithdrawLimit: swapSCRStkdSCRTPoolData.swapStkdSCRT(baseAmount).toFixed(6),
      };
      localStorage.setItem("SCRT_stkdSCRT_Limits", JSON.stringify(scrtSwapLimitStored));
    }

    return {
      scrtSwapLimit: scrtSwapLimitStored.scrtSwapLimit,
      stkdSCRTWithdrawLimit: scrtSwapLimitStored.stkdSCRTWithdrawLimit,
    };
  });
}
