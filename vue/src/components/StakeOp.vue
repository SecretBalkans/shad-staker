<template>
  <span class="relative inline-block" style="top: -1rem" :title="props.op">
    <span
      :class="{
        'animate-pulse': !stopped && pulse,
        'bg-gray-200': pulse,
        'bg-green-200': green,
        'bg-red-200': red,
        'bg-amber-300': yellow,
        'animate-ping': !stopped && ping,
      }"
      style="border-radius: 3rem;"
      class="absolute h-7 w-7 inline-flex"
    >
    </span>
    <span class="relative h-7 w-7 top-0.5 left-0.5">
      <IgntTxArrowIcon v-if="type === 'op'" class="inline rotate-90 text-2xl w-7 h-7 rounded-sm" />
      <IgntDotsIcon v-if="type === 'wait'" class="inline text-2xl w-7 h-7 rounded-sm" />
    </span>
    <!--    <ignt-chevron-right-icon class="text-" :class="`text-${green ? 'green' : yellow ? 'amber' : 'white'}-500`" />-->
  </span>
</template>

<script lang="ts" setup>
import { IgntDotsIcon, IgntTxArrowIcon } from "@ignt/vue-library";
const props = defineProps({
  op: {
    type: String,
  },
  green: {
    type: Boolean,
  },
  red: {
    type: Boolean,
  },
  yellow: {
    type: Boolean,
  },
  pulse: {
    type: Boolean,
  },
  ping: {
    type: Boolean,
  },
  stopped: {
    type: Boolean,
  },
  type: {
    type: String,
    default: "op",
  },
});
</script>

<style scoped></style>
