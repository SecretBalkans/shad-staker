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
    <span v-if="tasks.ibc" class="flex-row">
      <RouteAsset :amount="tasks.ibc" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
      <TxFsmOp
        :fsm="props.fsm"
        :tx-state-path="`ibc`"
        :stopped="stopped"
        :op="`IBC from Osmosis (${prettyNumber(tasks.ibc.amount, 6, 6, false)} SCRT)`"
      ></TxFsmOp>
    </span>
    <RouteAsset v-if="tasks.stake" :amount="tasks.stake" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <TxFsmOp
      v-if="tasks.stake"
      :fsm="props.fsm"
      :stopped="stopped"
      :op="`${stakeOpLabel}`"
      :tx-state-path="`stake.staking`"
      :job-state-path="`stake`"
    ></TxFsmOp>
    <RouteAsset v-if="tasks.stake" :amount="tasks.stake?.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    <!--    <div v-if="tasks.unwrap" class="flex-row">
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
          :op="`${stakeOpLabel} after unwrap (${tasks.unwrap.amount} sSCRT)${
            tasks.ibc ? ` and IBC from Osmosis (${tasks.ibc.amount} SCRT)` : ''
          }`"
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
        :op="`${stakeOpLabel} SCRT (${[
          tasks.base?.amount && `${tasks.base?.amount} on SCRT`,
          tasks.unwrap?.amount && `${tasks.unwrap?.amount} unwrapped sSCRT`,
          tasks.ibc?.amount && `${tasks.ibc?.amount} SCRT from Osmosis`,
        ]
          .filter((d) => !!d)
          .join(' + ')})`"
      ></TxFsmOp>
      <RouteAsset :amount="tasks.stake.wait" :col-id="0" @update="updateMaxLengths" :max-len="maxLengths[0]"></RouteAsset>
    </div>-->
    {{ tasks?.stake?.ops }} {{ tasks?.stake?.ratio * 100 }}
  </div>
</template>

<script lang="ts" setup>
import { Nullable } from "@/utils/interfaces";
import { computed, PropType, ref } from "vue";
import RouteAsset from "@/components/RouteAsset.vue";
import TxFsmOp from "@/components/TxFsmOp.vue";
import { getAutoWidth, prettyNumber } from "@/utils/prettyNumber";

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
const amounts: any = { 0: {}, 1: {}, 2: {} };
const maxLengths = ref({ 0: 90, 1: 90, 2: 90 } as any);
const stakeOpLabel = computed(() => {
  const swapAmount = tasks.value.stake.ops.find((d: any) => d.tx === "swap")?.amount;
  const stakeAmount = tasks.value.stake.ops.find((d: any) => d.tx === "stake")?.amount;
  const arr = [
    tasks.value.stake?.ops?.find((d: any) => d.tx === "unwrap") &&
      `${prettyNumber(tasks.value.stake.value?.ops?.find((d: any) => d.tx === "unwrap").amount.toString(), 6, 6, false)} sSCRT ${
        props.stopped ? `were not` : "will be"
      } unwrapped for stake`,
    tasks.value.stake?.ops?.find((d: any) => d.tx === "wrap") &&
      `${prettyNumber(tasks.value.stake?.ops?.find((d: any) => d.tx === "wrap").amount.toString(), 6, 6, false)} SCRT ${
        props.stopped ? `were not` : "will be"
      } wrapped for swap`,
  ].filter((d) => !!d);

  return (
    (tasks.value.stake?.ratio > 0 && tasks.value.stake?.ratio < 1
      ? [`swap ${prettyNumber(swapAmount, 6, 6, false)}`, `stake ${prettyNumber(stakeAmount, 6, 6, false)}`].join(
          " and "
        )
      : tasks.value.stake?.ratio === 1
      ? `Swap all`
      : `Stake all`) +
    ` SCRT` +
    (arr.length > 0 ? `${props.stopped ? ` also ${arr.join(" and ")}` : `(${arr.join(" and ")})`}` : "")
  );
});
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
