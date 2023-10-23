<template>
  <span class="relative inline-block" style="top: 0.25rem" :title="title">
    <span
      :class="{
        'animate-pulse': !stopped && pulse,
        'bg-gray-200': pulse,
        'bg-green-200': green,
        'bg-red-200': error,
        'bg-amber-300': yellow,
        'animate-ping': !stopped && ping,
      }"
      style="border-radius: 3rem"
      class="absolute h-6 w-6 inline-flex"
    >
    </span>
    <span class="relative h-6 w-6">
      <a v-bind:href="externalLink" target="_blank">
        <svg
          v-if="externalLink && type === 'op'"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-4 h-4 relative top-1 left-1"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
        <span v-if="!externalLink" class="inline text-xl rounded-sm relative left-0.5 top-0.5">
          <IgntTxArrowIcon v-if="type === 'op'" class="rotate-90" />
          <IgntDotsIcon v-if="type === 'wait'" />
        </span>
      </a>
    </span>
    <!--    <ignt-chevron-right-icon class="text-" :class="`text-${green ? 'green' : yellow ? 'amber' : 'white'}-500`" />-->
  </span>
</template>

<script lang="ts" setup>
import { IgntDotsIcon, IgntTxArrowIcon } from "@ignt/vue-library";
import { computed } from "vue";
const props = defineProps({
  /**
   * Needed for auto-resolution of a txMachine states, errors, waits, etc.
   */
  fsm: {
    type: Object as any,
  },
  /**
   * Overwrite `txStatePath` in conjunction with fsm for auto-resolution of a txMachine states, errors, waits, etc.
   */
  jobStatePath: {
    type: String,
  },
  /**
   * Needed in conjunction with fsm for auto-resolution of a txMachine states, errors, waits, etc.
   */
  txStatePath: {
    type: String,
  },
  op: {
    type: String,
    required: true,
  },
  stopped: {
    type: Boolean,
  },
  green: {
    type: Boolean,
  },
  error: {
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
const jobStatesPath = computed(() => props.jobStatePath || props.txStatePath);
const jobStates = computed(() => props.fsm?.context.jobStates);
const currentJobState = computed(() => jobStates.value?.[jobStatesPath.value!]);
const currentTaskChainId = computed(() => props.fsm?.context.tasks?.[jobStatesPath.value!]?.chainId);
const yellow = computed(
  () =>
    props.yellow ||
    props.fsm?.matches(`working.${props.txStatePath}.signing`) ||
    props.fsm?.matches(`working.${props.txStatePath}.txWait`) ||
    props.fsm?.matches(`working.${props.txStatePath}.initialBalance`) ||
    props.fsm?.matches(`working.${props.txStatePath}.txBroadcast`)
);
const ping = computed(() => props.ping || props.fsm?.matches(`working.${props.txStatePath}.signing`));
const pulse = computed(
  () =>
    props.pulse ||
    props.fsm?.matches(`working.${props.txStatePath}.txWait`) ||
    props.fsm?.matches(`working.${props.txStatePath}.initialBalance`) ||
    props.fsm?.matches(`working.${props.txStatePath}.initialBalance`) ||
    props.fsm?.matches(`working.${props.txStatePath}.txBroadcast`)
);
const green = computed(() => props.green || currentJobState.value?.type === "finished");
const error = computed(() => props.error || currentJobState.value?.error);
const txHash = computed(() => props.fsm && currentJobState.value?.txHash);
const title = computed(() => {
  if (error.value) {
    return `Encountered an error: "${error.value.message || error.value}"`;
  }
  if (yellow.value) {
    return `${
      props.type === "wait"
        ? ""
        : `${
            props.stopped
              ? `Didn't sign`
              : `${
                  currentJobState.value?.type === "txBroadcast"
                    ? "Waiting on-chain execution"
                    : currentJobState.value?.type === "initialBalance" || currentJobState.value?.type === "txWait"
                    ? "Broadcasting"
                    : "Signing"
                }`
          }`
    } of ${props.op}`;
  }
  if (green.value) {
    return `Finished ${props.op}`;
  }
  return `${props.stopped ? `Didn't` : ``} ${props.op}`;
});
const externalLink = computed(() => {
  if (txHash.value) {
    return `https://mintscan.io/${currentTaskChainId.value.split("-")[0]}/tx/${txHash.value}`;
  } else {
    return null;
  }
});
</script>

<style scoped></style>
