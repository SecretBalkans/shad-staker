<template>
  <div>
    <div class="mt-4 flex justify-center text-red-900 text-xl">stkd-SCRT Market Statistics</div>
    <div class="grid grid-cols-1 mt-3">
      <div class="Box">
        <div style="font-weight: 600;">stkd-SCRT Exchange Rate</div>
        <div>{{marketData?.price ? marketData.price/10**6: ""}} SCRT/stkd-SCRT</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600;">Total Supply</div>
        <div>{{(marketData?.total_derivative_token_supply/10**6).toFixed(0)}} SCRT/stkd-SCRT</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600;">Community Rewards</div>
        <div>{{(marketData?.rewards/10**6).toFixed(0)}} SCRT</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600;">Next Unbond Amount</div>
        <div>{{marketData?.unbond_amount_of_next_batch}}</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600;">stkd-SCRT Market Cap</div>
        <div>{{marketData?.price/10**6}} SCRT/stkd-SCRT</div>
      </div>
      <div class="Box">
        <div style="font-weight: 600;">APY</div>
        <div>{{marketData?.price/10**6}} SCRT/stkd-SCRT</div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useStkdSecretInfo } from "@/def-composables/useStkdSecretInfo";

const marketData = useStkdSecretInfo()

</script>

<style>
  .Box {
    background-color: #FFF8F9;
    justify-content: center;
    margin: 10px;
    /* border: 2px solid #A71C24; */
  }

  .Box div {
    display: flex;
    justify-content: center;
  }
</style>
