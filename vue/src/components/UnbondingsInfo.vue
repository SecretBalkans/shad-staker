<template>
  <div>
    <div class="Wrapper bg-gray-100 py-2 px-4 mt-5">
      <div>
        <div>Unbond amount in next batch: {{ stkdSecretInfo?.unbond_amount_of_next_batch }}</div>
        <div>Next batch estimate time: {{ new Date(stkdSecretInfo?.next_unbonding_batch_time * 1000).toDateString() }}</div>
      </div>
    </div>
    <div class="mt-4 flex justify-center text-red-900 text-xl">My Unbondings</div>
    <div class="Box" v-for="(unbonding, index) in unbondings?.unbondings" :key="index">
      <div>Amount: {{ unbonding.amount / 10 ** 6 }} SCRT</div>
      <div>
        Claimable:
        <span v-if="!!unbonding.claimable_scrt"> Yes</span>
        <span v-else>&nbsp;No ( {{ new Date(unbonding.unbonds_at * 1000).toDateString() }} )</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";
import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";
const walletStore = useWalletStore();
const marketData = computed(() => walletStore.secretJsClient && useSecretStakingMarketData(walletStore.secretJsClient));
const unbondings = computed(() => marketData.value?.unbondings.value);
const stkdSecretInfo = computed(() => marketData.value?.stkdSecretInfo.value);
</script>

<style>
.Wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;

  font-size: small;
}

.Box {
  background-color: #fff8f9;
  justify-content: center;
  margin: 10px;
  /* border: 2px solid #A71C24; */
}

.Box div {
  display: flex;
  justify-content: center;
}
</style>
