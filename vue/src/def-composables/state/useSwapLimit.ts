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
      {
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
      }
      const swapLimit = +baseAmount.toFixed(6);
      let bestLimitRatio = 0;
      let bestOutcome: BigNumber | null = null;
      {
        const step = 1 / 20;
        const max = 1;
        for (let i = 1; i <= max / step; i++) {
          const currentRatio = i * step;
          const swapChoice = swapLimit * currentRatio;
          const stakeAmount = BigNumber(swapLimit).minus(swapChoice);
          const expectedResult = BigNumber(stakeAmount)
            .dividedBy(price)
            .plus(swapSCRStkdSCRTPoolData.swapSCRT(BigNumber(swapChoice)));
          const outcomeRate = BigNumber(swapLimit).dividedBy(expectedResult);
          const diff = BigNumber(outcomeRate).minus(price);
          if (outcomeRate.isGreaterThan(0) && !diff.isNaN() && (!bestOutcome || diff.isLessThan(bestOutcome))) {
            bestLimitRatio = currentRatio;
            bestOutcome = diff;
          } else if (!diff.isNaN()) {
            // means that we have a result, and we've begun to decrease compared to the bestOutcome
            break;
          }
        }
      }
      scrtSwapLimitStored = {
        ts: Date.now(),
        scrtSwapLimit: +BigNumber(swapLimit).times(bestLimitRatio).toFixed(6),
        ratio: +BigNumber(bestLimitRatio).toFixed(6),
        slippage: Math.abs(bestOutcome?.toNumber() || 0),
        stkdSCRTWithdrawLimit: +swapSCRStkdSCRTPoolData.swapStkdSCRT(baseAmount).toFixed(6),
      };
      console.log({ scrtSwapLimitStored });
      localStorage.setItem("SCRT_stkdSCRT_Limits", JSON.stringify(scrtSwapLimitStored));
    }

    return {
      scrtSwapLimit: scrtSwapLimitStored.scrtSwapLimit,
      stkdSCRTWithdrawLimit: scrtSwapLimitStored.stkdSCRTWithdrawLimit,
    };
  });
}
