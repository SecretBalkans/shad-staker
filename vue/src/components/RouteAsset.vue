<template>
  <span class="z-10 inline-flex flex-col justify-center items-center" :style="{ marginLeft: `${maxLen < 48 ? 48 - maxLen : 0}px` }">
    <IgntDenom
      class="inline-flex"
      shorten
      :icon="amount.icon"
      :denom="amount.denom"
      :chain-id="amount.chainId"
      :is-secret="!!amount.secretAddress"
      modifier="avatar"
    />
    <selectable-label class="inline-flex" :text="'' + Math.abs(+amount?.amount.toString())" pretty-number="2" :width="`${maxLen}px`" />
  </span>
</template>

<script lang="ts" setup>
import { type BalanceAmount } from "@/utils/interfaces";
import { onBeforeUnmount, onMounted, PropType, watch } from "vue";
import IgntDenom from "@/components/IgntDenom.vue";
import SelectableLabel from "@/components/pretty/SelectableLabel.vue";
import {uuidv4} from "@/utils/uuid";
import {prettyNumber} from "@/utils/prettyNumber";

const props = defineProps({
  amount: {
    type: Object as PropType<BalanceAmount>,
  },
  maxLen: {
    type: Number,
  },
  colId: {
    type: Number,
  },
});
const id = uuidv4();
const emit = defineEmits(["update"]);
watch(
  () => "" + props.amount?.amount,
  (amount) => emit("update", { colId: props.colId, amount, id })
);
onMounted(() => {
  emit("update", { colId: props.colId, amount: props.amount?.amount, id });
});
onBeforeUnmount(() => {
  emit("update", { colId: props.colId, amount: 0, id });
});
</script>

<style scoped></style>
