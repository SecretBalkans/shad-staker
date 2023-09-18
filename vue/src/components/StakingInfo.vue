<template>
  <div class="Wrapper bg-gray-100 py-2 px-4 mt-5">
    <div>Exchange rate: {{marketData?.price ? marketData.price/10**6: ""}} SCRT/stkd-SCRT</div>
    <div v-if="!props.withdraw">Stake fee: {{ stakingFees?.deposit/1000 }}%</div>
    <div v-else>Withdraw fee: {{ stakingFees?.withdraw/1000 }}%</div>
    <div>Withdraw Period: 21 days + batch time (0-3 days)</div>
    <div>stkd-SCRT APY: </div>
  </div>
</template>
<script setup lang="ts">
import { useStkdSecretInfo } from "@/def-composables/useStkdSecretInfo";
import { useStakingFees } from "@/def-composables/useStakingFees";

const marketData = useStkdSecretInfo()
const stakingFees = useStakingFees()

const props = defineProps({
  withdraw: {
    type: Boolean
  }
})

</script>

<style>
  .Wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: left;

    font-size: small;
  }
</style>
