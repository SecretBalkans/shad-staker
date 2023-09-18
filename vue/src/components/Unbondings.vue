<template>
  <div>
    <div class="mt-4 flex justify-center text-red-900 text-xl">My Unbondings</div>
    <div class="Wrapper bg-gray-100 py-2 px-4 mt-5">
      <div v-for="(unbonding, index) in unbondings?.unbondings" :key="index">
        <div>Amount: {{ unbonding.amount }}</div>
        <div>Claimable: 
          <span v-if="!!unbonding.claimable_scrt">Yes</span>
          <span v-else>No ( {{(new Date(unbonding.unbonds_at * 1000)).toDateString()}} )</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useUnbondings } from "@/def-composables/useUnbondings";

const unbondings = useUnbondings()

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
