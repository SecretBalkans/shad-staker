<template>
  <div>
    <div class="Wrapper py-2 px-4" style="display: flex; justify-content: center; align-items: center; font-style: italic">
      <div>
        <div>Unbond amount in next batch: {{ stkdSecretInfo?.unbond_amount_of_next_batch / 10 ** 6 }}</div>
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
    <div class="mt-5 flex align-center items-center justify-center">
      <IgntButton style="width: 110px" type="primary" :disabled="!ableToTx" @click="claim">Claim </IgntButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";
import { useWalletStore } from "@/stores/useWalletStore";
import { IgntButton } from "@ignt/vue-library";
import { computed } from "vue";
const walletStore = useWalletStore();
const marketData = computed(() => walletStore.secretJsClient && useSecretStakingMarketData(walletStore.secretJsClient));
const unbondings = computed(() => marketData.value?.unbondings.value);
const stkdSecretInfo = computed(() => marketData.value?.stkdSecretInfo.value);

let validTxAmount = computed<boolean>(() => {
  return unbondings.value?.unbondings?.some((u: any) => u.claimable_scrt === true);
});

let ableToTx = computed<boolean>(() => validTxAmount.value);

const claim = async () => {
  const result = await walletStore.secretJsClient?.executeStkdSecretClaim();
  console.log("Executed claim...: ", result);
};
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
  justify-content: center;
  margin: 10px;
}

.Box div {
  display: flex;
  justify-content: center;
}
</style>
