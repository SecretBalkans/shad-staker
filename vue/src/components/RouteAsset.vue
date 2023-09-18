<template>
  {{ amount?.amount }}
  <IgntDenom :chain-id="amount?.chainId" :denom="amount?.denom ?? ''" :key="amount?.denom" :is-secret="!!amount?.secretAddress" />
  <span class="text-gray-500">
    (<IgntDenom
      :chain-id="amount?.chainId"
      :denom="amount?.denom ?? ''"
      :key="amount?.denom"
      :is-secret="!!amount?.secretAddress"
      modifier="path"
    />)
  </span>
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
