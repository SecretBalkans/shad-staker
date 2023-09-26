<template>
  <span class="inline-flex">
    <span
      :title="props.op"
      :class="{
        'animate-pulse': pulse,
        'bg-gray-200': pulse,
        'bg-green-200': green,
        'bg-red-200': red,
        'bg-amber-300': yellow,
        'animate-ping': ping,
      }"
      style="border-radius: 3rem"
      class="flex items-center justify-center ml-3.5 h-7 w-7"
    >
    </span>
    <span class="relative right-7 flex items-center justify-center ml-0.5">
      <IgntTxArrowIcon v-if="type === 'op'" class="rotate-90 text-2xl w-7 h-7 rounded-sm" />
      <IgntDotsIcon v-if="type === 'wait'" class="text-2xl w-7 h-7 rounded-sm" />
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
  type: {
    type: String,
    default: "op",
  },
});
</script>

<style scoped></style>
