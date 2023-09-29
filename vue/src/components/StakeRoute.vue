<template>
  <div
    :hidden="!tasks.stake"
    class="pt-2.5 px-2 pb-1.5"
    :style="
      colored
        ? {
            borderBottom: `1px solid rgba(${borderColor(props.fsm)}, 0.4)`,
            borderTop: `1px solid rgba(${borderColor(props.fsm)}, 0.4)`,
            backgroundColor: '#fff',
            backgroundSize: `10px 10px`,
            backgroundImage: `repeating-linear-gradient(135deg,
            rgba(${borderColor(props.fsm)}, 0.3) 0,
            rgba(${borderColor(props.fsm)}, 0.3) 1px, #fff 0, #fff 50%)`,
          }
        : {}
    "
  >
    <div v-if="tasks.ibc" class="flex-row">
      <RouteAsset :amount="tasks.ibc" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <TxFsmOp :fsm="props.fsm" :tx-state-path="`ibc`" :stopped="stopped" :op="`IBC from Osmosis (${tasks.ibc.amount} SCRT)`"></TxFsmOp>
      <RouteAsset :amount="tasks.ibc.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <span v-if="!tasks.base && !tasks.unwrap">
        <TxFsmOp
          :fsm="props.fsm"
          :stopped="stopped"
          :op="`Stake from Osmosis (${tasks.ibc.amount} SCRT)`"
          :tx-state-path="`stake.staking`"
          :job-state-path="`stake`"
        ></TxFsmOp>
        <RouteAsset :amount="tasks.stake.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      </span>
    </div>
    <div v-if="tasks.unwrap" class="flex-row">
      <RouteAsset :amount="tasks.unwrap" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <TxFsmOp
        :fsm="props.fsm"
        :tx-state-path="`unwrap`"
        :stopped="stopped"
        :op="`Unwrap private sSCRT (${tasks.unwrap.amount} sSCRT)`"
      ></TxFsmOp>
      <RouteAsset
        v-if="tasks.base"
        :amount="tasks.unwrap.wait"
        :col-id="0"
        @update="updateMaxLengths"
        :max-len="maxLengths[0]"
      ></RouteAsset>
      <span v-if="!tasks.base">
        <RouteAsset :amount="tasks.stake" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
        <TxFsmOp
          :fsm="props.fsm"
          :tx-state-path="`stake.staking`"
          :job-state-path="`stake`"
          :stopped="stopped"
          :op="`Stake after unwrap (${tasks.unwrap.amount} sSCRT)${tasks.ibc ? ` and IBC from Osmosis (${tasks.ibc.amount} SCRT)` : ''}`"
        ></TxFsmOp>
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
      <TxFsmOp
        type="wait"
        :stopped="stopped"
        :pulse="props.fsm?.matches('working.stake.waitAll')"
        :green="props.fsm?.matches('working.stake.staking') || jobStates.stake.type === 'finished' || !!jobStates.stake.error"
        :error="!!jobStates.ibc?.error || !!jobStates.unwrap?.error"
        :op="`Wait ${[
          tasks.unwrap && `unwrap private sSCRT (${tasks.unwrap.amount} sSCRT)`,
          tasks.ibc && `IBC from Osmosis (${tasks.ibc.amount} SCRT)`,
        ]
          .filter((d) => !!d)
          .join(' and ')}`"
        v-if="tasks.unwrap || tasks.ibc"
      />
      <RouteAsset :amount="tasks.stake" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <TxFsmOp
        :fsm="props.fsm"
        :tx-state-path="`stake.staking`"
        :job-state-path="`stake`"
        :stopped="stopped"
        :op="`Stake SCRT (${[
          tasks.base?.amount && `${tasks.base?.amount} on SCRT`,
          tasks.unwrap?.amount && `${tasks.unwrap?.amount} unwrapped sSCRT`,
          tasks.ibc?.amount && `${tasks.ibc?.amount} SCRT from Osmosis`,
        ]
          .filter((d) => !!d)
          .join(' + ')})`"
      ></TxFsmOp>
      <RouteAsset :amount="tasks.stake.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <!-- {{jobStates}}
      {{fsm.value}} -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Nullable } from "@/utils/interfaces";
import { computed, PropType, ref } from "vue";
import RouteAsset from "@/components/RouteAsset.vue";
import TxFsmOp from "@/components/TxFsmOp.vue";
import { getAutoWidth } from "@/utils/prettyNumber";

const props = defineProps({
  colored: {
    type: Boolean,
  },
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
const borderColor = (fsm: any) => (fsm.value === "success" ? "143, 188, 143" : fsm.value === "failure" ? "255, 182, 193" : "255, 215, 0");
</script>

<style scoped></style>
