<template>
  <div>
    <IgntDenom :denom="amount.denom" :chain-id="amount.chainId" modifier="avatar" class="z-10" />
    <div class="flex flex-col justify-between ml-4 z-10">
      <div class="font-semibold">
        <IgntDenom :denom="amount.denom" :chain-id="amount.chainId" />
      </div>

      <div
        class="text-xs"
        :class="{
          error: !hasEnoughBalance,
        }"
      >
        {{ balance?.amount ?? 0 }} available
      </div>
    </div>

    <div class="flex-1 w-full h-full">
      <IgntAmountInput
        class="absolute w-full left-0 text-right h-full top-0 outline-0 focus:bg-gray-100 text-3xl font-medium rounded-lg px-4"
        @update="handleChange"
      />

      <div class="focus-background"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { BalanceAmount } from "@/utils/interfaces";
import { useAsset } from "@/def-composables/useAsset";
import BigNumber from "bignumber.js";
import { IgntAmountInput } from "@ignt/vue-library";
import IgntDenom from "./IgntDenom.vue";
import { computed, ref, type PropType } from "vue";
import {useWalletStore} from "@/stores/useWalletStore";

const props = defineProps({
  amount: {
    type: Object as PropType<BalanceAmount>,
    required: true,
  }
});
const walletStore = useWalletStore()
const { balance } = useAsset(props.amount.denom, props.amount.chainId);

const emit = defineEmits(["change"]);
const value = ref(
  new BigNumber(props.amount.amount != "" ? props.amount.amount : 0)
);
const hasEnoughBalance = computed(() => {
  const balanceBN = new BigNumber(balance.value?.amount ?? 0);
  if (Number(value)) {
    return balanceBN.gte(value.value);
  } else {
    return true;
  }
});
const handleChange = (amount: BigNumber) => {
  if (hasEnoughBalance.value) {
    emit("change", amount.toString());
  }
};
</script>
