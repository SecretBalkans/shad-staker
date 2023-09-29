<template>
  <div>
    <IgntDenom :icon="amount.icon" :denom="amount.denom ?? ''" :chain-id="amount.chainId" modifier="avatar" class="z-10" />
    <div class="flex flex-col justify-between ml-4 z-10">
      <div class="font-semibold">
        <IgntDenom :denom="amount.denom ?? ''" :chain-id="amount.chainId" />
        <IgntDenom
          :chain-id="amount?.chainId"
          :denom="amount?.denom ?? ''"
          modifier="path"
          class="text-normal opacity-50 ml-1.5"
          :key="amount?.denom"
          :shorten="false"
        />
        <span class="float-right ml-2 pt-1 cursor-pointer">
          <IgntClearIcon @click="() => emit('remove', amount)" />
        </span>
      </div>
      <div
        class="text-xs"
        :class="{
          error: !hasEnoughBalance,
        }"
      >
        {{ balanceAvailable ?? 0 }} available
      </div>
    </div>

    <div class="flex-1 w-full h-full">
      <IgntAmountInput
        :max-decimals="6"
        :ref="(el) => (eli = el?.$el)"
        class="absolute w-full left-0 text-right h-full top-0 outline-0 focus:bg-gray-100 text-3xl font-medium rounded-lg px-4"
        @update="handleChange"
      />
      <div class="focus-background"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { BalanceAmount } from "@/utils/interfaces";
import BigNumber from "bignumber.js";
import { IgntAmountInput, IgntClearIcon } from "@ignt/vue-library";
import IgntDenom from "./IgntDenom.vue";
import { computed, onMounted, type PropType, ref } from "vue";
import { useAssets } from "@/def-composables/useAssets";
const eli = ref(null as any);
onMounted(() => {
  props.autoFocus && eli.value?.focus();
});
const props = defineProps({
  amount: {
    type: Object as PropType<BalanceAmount>,
    required: true,
  },
  autoFocus: {
    type: Boolean,
    default: false,
  },
});
const { balances } = useAssets();

const emit = defineEmits(["change", "remove"]);
const balanceAvailable = computed(() => balances.value.assets.find((x) => x.denom === props.amount.denom)?.amount);
const hasEnoughBalance = computed(() => {
  const balanceBN = new BigNumber(props.amount?.amount ?? 0);
  if (Number(balanceAvailable) && balanceAvailable.value) {
    return balanceBN.lte(balanceAvailable.value);
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
