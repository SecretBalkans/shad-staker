<template>
  <span class="mr-1">{{ amount?.amount }}</span>
  <span class="text-gray-500" v-if="!amount.secretAddress">
    <IgntDenom
      :chain-id="amount?.chainId"
      :denom="amount?.denom ?? ''"
      :key="amount?.denom"
      :is-secret="!!amount?.secretAddress"
      modifier="path"
    />.
  </span>
  <IgntDenom :chain-id="amount?.chainId" :denom="amount?.denom ?? ''" :key="amount?.denom" :is-secret="!!amount?.secretAddress" />
</template>

<script lang="ts" setup>
import { type BalanceAmount } from "@/utils/interfaces";
import { PropType } from "vue";
import IgntDenom from "@/components/IgntDenom.vue";

defineProps({
  amount: {
    type: Object as PropType<BalanceAmount>,
  },
});
</script>

<style scoped></style>
