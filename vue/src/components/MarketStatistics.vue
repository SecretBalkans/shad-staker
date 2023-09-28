<template>
  <div>
    <div class="flex justify-center text-red-900 text-xl">stkd-SCRT Market Statistics</div>
    <div class="flex-col mt-1">
      <!-- <div class="Box">
        <div style="font-weight: 600">stkd-SCRT Exchange Rate</div>
        <div>{{ stkdSecretInfo?.price ? stkdSecretInfo.price / 10 ** 6 : "" }} SCRT/stkd-SCRT</div>
      </div> -->
      <div class="Box">
        <div style="font-weight: 600">Total Supply</div>
        <div>{{ (stkdSecretInfo?.total_derivative_token_supply / 10 ** 6).toFixed(0) }} SCRT/stkd-SCRT</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600">Community Rewards</div>
        <div>{{ (stkdSecretInfo?.rewards / 10 ** 6).toFixed(0) }} SCRT</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600">Next Unbond Amount</div>
        <div>{{ stkdSecretInfo?.unbond_amount_of_next_batch }}</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600">stkd-SCRT Market Cap</div>
        <div>{{ ((stkdSecretPrice * stkdSecretInfo?.total_derivative_token_supply) / 10 ** 12).toFixed(2) }} M</div>
      </div>
      <!-- <div class="Box">
        <div style="font-weight: 600">APY</div>
        <div>~26%</div>
      </div> -->
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";
import { useStkdSecretPrice } from "@/def-composables/useStkdSecretPrice";
import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";
const walletStore = useWalletStore();
const queryPrice = useStkdSecretPrice();
const marketData = computed(() => walletStore.secretJsClient && useSecretStakingMarketData(walletStore.secretJsClient));
const stkdSecretInfo = computed(() => marketData.value?.stkdSecretInfo.value);
const stkdSecretPrice = computed(() => queryPrice.value);
</script>

<style>
.Box {
  background-color: #fff8f9;
  justify-content: center;
  border-bottom-width: 70%;
  border-bottom: 3px solid #fff8f9;
}

.Box div {
  display: flex;
  justify-content: center;
}
</style>
