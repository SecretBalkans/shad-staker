<template>
  <div v-if="tasks.ibc" class="flex-row">
    <RouteAsset :amount="tasks.ibc" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <StakeOp
      :stopped="stopped"
      :op="`IBC from Osmosis (${tasks.ibc.amount} SCRT)`"
      :pulse="props.fsm?.matches('working.ibc.txWait') || props.fsm?.matches('working.ibc.txBroadcast')"
      :green="jobStates.ibc.type === 'finished'"
      :red="!!jobStates.ibc.error"
      :ping="props.fsm?.matches('working.ibc.signing')"
      :yellow="
        props.fsm?.matches('working.ibc.signing') ||
        props.fsm?.matches('working.ibc.txWait') ||
        props.fsm?.matches('working.ibc.txBroadcast')
      "
    ></StakeOp>
    <RouteAsset :amount="tasks.ibc.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <span v-if="!tasks.base && !tasks.unwrap">
      <StakeOp
        :stopped="stopped"
        :op="`Stake from Osmosis (${tasks.ibc.amount} SCRT)`"
        :pulse="props.fsm?.matches('working.stake.staking.txWait') || props.fsm?.matches('working.stake.staking.txBroadcast')"
        :green="jobStates.stake.type === 'finished'"
        :red="!!jobStates.stake.error"
        :ping="props.fsm?.matches('working.stake.staking.signing')"
        :yellow="
          props.fsm?.matches('working.stake.staking.signing') ||
          props.fsm?.matches('working.stake.staking.txWait') ||
          props.fsm?.matches('working.stake.staking.txBroadcast')
        "
      ></StakeOp>
      <RouteAsset :amount="tasks.stake.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    </span>
  </div>
  <div v-if="tasks.unwrap" class="flex-row">
    <RouteAsset :amount="tasks.unwrap" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <StakeOp
      :stopped="stopped"
      :op="`Unwrap private sSCRT (${tasks.unwrap.amount} sSCRT)`"
      :pulse="props.fsm?.matches('working.unwrap.txWait') || props.fsm?.matches('working.unwrap.txBroadcast')"
      :green="jobStates.unwrap.type === 'finished'"
      :red="!!jobStates.unwrap.error"
      :ping="props.fsm?.matches('working.unwrap.signing')"
      :yellow="
        props.fsm?.matches('working.unwrap.signing') ||
        props.fsm?.matches('working.unwrap.txWait') ||
        props.fsm?.matches('working.unwrap.txBroadcast')
      "
    ></StakeOp>
    <RouteAsset v-if="tasks.base" :amount="tasks.unwrap.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <span v-if="!tasks.base">
      <RouteAsset :amount="tasks.stake" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <StakeOp
        :stopped="stopped"
        :op="`Stake after unwrap (${tasks.unwrap.amount} sSCRT)${tasks.ibc ? ` and IBC from Osmosis (${tasks.ibc.amount} SCRT)` : ''}`"
        :pulse="props.fsm?.matches('working.stake.staking.txWait') || props.fsm?.matches('working.stake.staking.txBroadcast')"
        :green="jobStates.stake.type === 'finished'"
        :red="!!jobStates.stake.error"
        :ping="props.fsm?.matches('working.stake.staking.signing')"
        :yellow="
          props.fsm?.matches('working.stake.staking.signing') ||
          props.fsm?.matches('working.stake.staking.txWait') ||
          props.fsm?.matches('working.stake.staking.txBroadcast')
        "
      ></StakeOp>
      <RouteAsset :amount="tasks.stake.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    </span>
  </div>
  <div v-if="tasks.base" class="flex-row">
    <RouteAsset
      :amount="tasks.base"
      v-if="tasks.base && (tasks.unwrap || tasks.ibc)"
      :col-id="0"
      @update="updateMaxLengths"
      :max-len="maxLengths[0]"
    ></RouteAsset>
    <StakeOp
      type="wait"
      :stopped="stopped"
      :pulse="props.fsm?.matches('working.stake.waitAll')"
      :green="props.fsm?.matches('working.stake.staking') || jobStates.stake.type === 'finished' || !!jobStates.stake.error"
      :red="!!jobStates.ibc?.error || !!jobStates.unwrap?.error"
      :op="`Wait ${[
        tasks.unwrap && `unwrap private sSCRT (${tasks.unwrap.amount} sSCRT)`,
        tasks.ibc && `IBC from Osmosis (${tasks.ibc.amount} SCRT)`,
      ]
        .filter((d) => !!d)
        .join(' and ')}`"
      v-if="tasks.unwrap || tasks.ibc"
    />
    <RouteAsset :amount="tasks.stake" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <StakeOp
      :stopped="stopped"
      :op="`Stake SCRT (${[
        tasks.base?.amount && `${tasks.base?.amount} on SCRT`,
        tasks.unwrap?.amount && `${tasks.unwrap?.amount} unwrapped sSCRT`,
        tasks.ibc?.amount && `${tasks.ibc?.amount} SCRT from Osmosis`,
      ]
        .filter((d) => !!d)
        .join(' + ')})`"
      :pulse="props.fsm?.matches('working.stake.staking.txWait') || props.fsm?.matches('working.stake.staking.txBroadcast')"
      :green="jobStates.stake.type === 'finished'"
      :red="!!jobStates.stake.error"
      :ping="props.fsm?.matches('working.stake.staking.signing')"
      :yellow="
        props.fsm?.matches('working.stake.staking.signing') ||
        props.fsm?.matches('working.stake.staking.txWait') ||
        props.fsm?.matches('working.stake.staking.txBroadcast')
      "
    />
    <RouteAsset :amount="tasks.stake.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <!-- {{jobStates}}
    {{fsm.value}} -->
  </div>
</template>

<script lang="ts" setup>
import { Nullable } from "@/utils/interfaces";
import { computed, PropType, ref } from "vue";
import RouteAsset from "@/components/RouteAsset.vue";
import StakeOp from "@/components/StakeOp.vue";
import { getAutoWidth } from "@/utils/prettyNumber";

const props = defineProps({
  fsm: {
    type: null as Nullable<PropType<any>>,
    required: true,
  },
  stopped: {
    type: Boolean,
    required: false,
    default: false,
  },
});
const tasks = computed(() => props.fsm.context.tasks);
const jobStates = computed(() => props.fsm.context.jobStates);
const amounts: any = { 0: {}, 1: {}, 2: {} };
const maxLengths = ref({ 0: 90, 1: 90, 2: 90 } as any);

const updateMaxLengths = ({ colId, amount, id }: any) => {
  if (amount) {
    amounts[colId] = {
      ...amounts[colId],
      [id]: getAutoWidth(amount.toString()),
    };
    maxLengths.value[colId] = Math.max(...(Object.values(amounts[colId]) as number[]));
  }
};
/*
const tasks2 = computed(() => {
  let tasksValue = tasks.value;
  return (
    tasksValue &&
    Object.keys(tasksValue)
      .map((key) => {
        if (tasksValue[key]) {
          return {
            key,
            ...tasksValue[key],
          };
        } else {
          return null;
        }
      })
      .filter((d) => !!d)
  );
});
*/
</script>

<style scoped></style>
