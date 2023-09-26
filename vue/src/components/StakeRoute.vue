<template>
  <div v-if="tasks.ibc" class="flex-row">
    <RouteAsset :amount="tasks.ibc" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <StakeOp
      :op="`IBC from Osmosis (${tasks.ibc.amount} SCRT)`"
      :pulse="props.fsm?.matches('working.ibc.txWait')"
      :green="jobStates.ibc.type === 'finished'"
      :red="jobStates.ibc.type === 'error'"
      :ping="props.fsm?.matches('working.ibc.signing')"
      :yellow="props.fsm?.matches('working.ibc.signing') || props.fsm?.matches('working.ibc.txWait')"
    ></StakeOp>
    <RouteAsset :amount="tasks.ibc.wait" :col-id="1" @update="updateMaxLengths" :max-len="maxLengths[1]"></RouteAsset>
    <span v-if="!tasks.base && !tasks.unwrap">
      <StakeOp
        :op="`Stake from Osmosis (${tasks.ibc.amount} SCRT)`"
        :pulse="props.fsm?.matches('working.stake.staking.txWait')"
        :green="jobStates.stake.type === 'finished'"
        :red="jobStates.stake.type === 'error'"
        :ping="props.fsm?.matches('working.stake.staking.signing')"
        :yellow="props.fsm?.matches('working.stake.staking.signing') || props.fsm?.matches('working.stake.staking.txWait')"
      ></StakeOp>
      <RouteAsset :amount="tasks.stake.wait" :col-id="2" @update="updateMaxLengths" :max-len="maxLengths[2]"></RouteAsset>
    </span>
  </div>
  <div v-if="tasks.unwrap" class="flex-row">
    <RouteAsset :amount="tasks.unwrap" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <StakeOp
      :op="`Unwrap private sSCRT (${tasks.unwrap.amount} sSCRT)`"
      :pulse="props.fsm?.matches('working.unwrap.txWait')"
      :green="jobStates.unwrap.type === 'finished'"
      :red="jobStates.unwrap.type === 'error'"
      :ping="props.fsm?.matches('working.unwrap.signing')"
      :yellow="props.fsm?.matches('working.unwrap.signing') || props.fsm?.matches('working.unwrap.txWait')"
    ></StakeOp>
    <RouteAsset :amount="tasks.unwrap.wait" :col-id="1" @update="updateMaxLengths" :max-len="maxLengths[1]"></RouteAsset>
    <span v-if="!tasks.base">
      <StakeOp
        :op="`Stake after unwrap (${tasks.unwrap.amount} sSCRT)${tasks.ibc ? ` and IBC from Osmosis (${tasks.ibc.amount} SCRT)` : ''}`"
        :pulse="props.fsm?.matches('working.stake.staking.txWait')"
        :green="jobStates.stake.type === 'finished'"
        :red="jobStates.stake.type === 'error'"
        :ping="props.fsm?.matches('working.stake.staking.signing')"
        :yellow="props.fsm?.matches('working.stake.staking.signing') || props.fsm?.matches('working.stake.staking.txWait')"
      ></StakeOp>
      <RouteAsset :amount="tasks.stake.wait" :col-id="2" @update="updateMaxLengths" :max-len="maxLengths[2]"></RouteAsset>
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
      :pulse="props.fsm?.matches('working.stake.waitAll')"
      :green="props.fsm?.matches('working.stake.staking') || jobStates.stake.type === 'finished'"
      :red="jobStates.ibc?.type === 'error' || jobStates.unwrap?.type === 'error'"
      :op="`Wait ${[
        tasks.unwrap && `unwrap private sSCRT (${tasks.unwrap.amount} sSCRT)`,
        tasks.ibc && `IBC from Osmosis (${tasks.ibc.amount} SCRT)`,
      ]
        .filter((d) => !!d)
        .join(' and ')}`"
      v-if="tasks.unwrap || tasks.ibc"
    />
    <RouteAsset :amount="tasks.stake" :col-id="1" @update="updateMaxLengths" :max-len="maxLengths[1]"></RouteAsset>
    <StakeOp
      :op="`Stake SCRT (${[
        tasks.base?.amount && `${tasks.base?.amount} on SCRT`,
        tasks.unwrap?.amount && `${tasks.unwrap?.amount} unwrapped sSCRT`,
        tasks.ibc?.amount && `${tasks.ibc?.amount} SCRT from Osmosis`,
      ]
        .filter((d) => !!d)
        .join(' + ')})`"
      :status="jobStates.stake.type"
      :pulse="props.fsm?.matches('working.stake.staking.txWait')"
      :green="jobStates.stake.type === 'finished'"
      :red="jobStates.stake.type === 'error'"
      :ping="props.fsm?.matches('working.stake.staking.signing')"
      :yellow="props.fsm?.matches('working.stake.staking.signing') || props.fsm?.matches('working.stake.staking.txWait')"
    />
    <RouteAsset :amount="tasks.stake.wait" :col-id="2" @update="updateMaxLengths" :max-len="maxLengths[2]"></RouteAsset>
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
});
const tasks = computed(() => props.fsm.context.tasks);
const jobStates = computed(() => props.fsm.context.jobStates);
const amounts: any = { 0: {}, 1: {}, 2: {} };
const maxLengths = ref({ 0: 90, 1: 90, 2: 90 } as any);

const updateMaxLengths = ({ colId, amount, id }: any) => {
  amounts[colId] = {
    ...amounts[colId],
    [id]: getAutoWidth(amount.toString()),
  };
  maxLengths.value[colId] = Math.max(...(Object.values(amounts[colId]) as number[]));
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
