<template>
  <table class="table-auto">
    <tbody>
      <tr v-for="(route, i) in activeRoute?.route" :key="route[0]?.denom || i" class="table-row text-xs">
        <td :key="routeItem?.denom || j" v-for="(routeItem, j) in route" :class="`table-cell p-0`">
          <span
            :class="`inline-flex float-left ${
              statuses[routeItem.waitId] === 'signed'
                ? 'bg-green-300'
                : statuses[routeItem.waitId] === 'rejected'
                ? 'bg-red-300'
                : statuses[routeItem.waitId] === 'signing'
                ? 'bg-amber-200'
                : ''
            }`"
          >
            <ignt-chevron-right-icon class="text-gray-500 mt-0.5 p-0.5 pr-0.5" v-if="routeItem?.txName" />
            <span
              :class="routeItem?.denom ? `ml-1` : ``"
              :style="!routeItem?.denom && { display: 'table', margin: '0 auto' }"
              v-if="routeItem?.txName"
              >{{ routeItem.txName }}</span
            >
          </span>
          <ignt-chevron-right-icon
            class="inline-flex text-gray-500 mt-0.5 p-0.5 float-left pr-0.5"
            v-if="route[j - 1]?.txName || (routeItem?.txName && routeItem?.denom)"
          />
          <span
            :class="
              `inline-flex float-left pl-1 ` +
              `${
                routeItem.txName
                  ? statuses[routeItem?.id] === 'finished'
                    ? 'bg-green-300'
                    : statuses[routeItem?.id] === 'started'
                    ? 'bg-amber-200'
                    : ''
                  : statuses[routeItem.id] === 'signed'
                  ? 'bg-green-300'
                  : statuses[routeItem.id] === 'rejected'
                  ? 'bg-red-300'
                  : statuses[routeItem.id] === 'signing'
                  ? 'bg-amber-200'
                  : ''
              }`
            "
            ><RouteAsset :amount="routeItem" v-if="routeItem?.denom"></RouteAsset
          ></span>
          <!--            <ignt-chevron-right-icon
          class="inline-flex text-gray-500 float-right ml-1 mt-0.5 p-0.5"
          v-if="j < route.length - 1 && route[j + 1]?.txName"
        />-->
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import type {BalanceAmount} from "@/utils/interfaces";
import {UI_STATE} from "@/utils/interfaces";
import {PropType} from "vue/dist/vue";
import RouteAsset from "@/components/RouteAsset.vue";
import BigNumber from "bignumber.js";
import {envOsmosis, envSecret} from "@/env";
import {scrtDenomOsmosis, sSCRTContractAddress, stkdSCRTContractAddress} from "@/utils/const";
import {IgntChevronRightIcon} from "@ignt/vue-library";
import {ref, watch} from "vue";
import {useRouteQueries} from "@/def-composables/useRouteQueries";

const emit = defineEmits(["queryUpdate"]);

const id = (i: BalanceAmount) => i;
const stake = (b: BalanceAmount) => ({
  ...b,
  txName: "stake",
  amount:
    "" +
    +BigNumber(b.amount)
      .dividedBy(+props.price / 10 ** 6 || 10)
      .toFixed(6),
  denom: "stkd-SCRT",
  stakable: false,
  chainId: envSecret.chainId,
  unstakable: true,
  secretAddress: stkdSCRTContractAddress,
});
const ibc = (b: any) => ({
  ...b,
  txName: "ibc",
  denom: "uscrt",
  stakable: true,
  unstakable: false,
  secretAddress: null,
  chainId: envSecret.chainId,
});
const unwrap = (b: any) => ({
  ...b,
  txName: "unwrap",
  denom: "uscrt",
  chainId: envSecret.chainId,
  secretAddress: null,
  stakable: true,
});

const statuses: any = ref({});

const routes = {
  //scrt on osmosis
  [scrtDenomOsmosis]: [id, ibc, stake],
  uscrt: [id, stake],
  sSCRT: [id, unwrap, stake],
} as Record<string, any>;

const props = defineProps({
  amounts: {
    type: Array as PropType<Array<BalanceAmount & { id?: string }>>,
    required: true,
  },
  price: {
    type: Number,
    default: 0,
    required: true,
  },
  state: {
    type: Number as PropType<UI_STATE>,
    required: true,
  },
});
const activeRoute: any = ref(null);
watch(
  [() => props.amounts, () => props.state !== UI_STATE.TX_SIGNING && props.price],
  () => {
    if ([UI_STATE.TX_SIGNING, UI_STATE.TX_ERROR, UI_STATE.TX_SUCCESS].includes(props.state)) {
      return;
    }
    const reduce = props.amounts?.reduce(
      (agg: any, amount: any) => {
        +amount.amount > 0 &&
          routes[amount.denom].forEach((fn: any) => {
            const nextStep = fn(amount);
            if (nextStep.txName) {
              if (agg[nextStep.txName]) {
                agg[nextStep.txName] = {
                  ...nextStep,
                  amount: BigNumber(nextStep.amount).plus(BigNumber(agg[nextStep.txName].amount)).toString(),
                };
              } else {
                agg[nextStep.txName] = nextStep;
              }
              agg[nextStep.txName].id = `${nextStep.txName}_${crypto.randomUUID()}`;
              agg[nextStep.txName].waitId = `wait_${nextStep.txName}_${crypto.randomUUID()}`;
            }
            if (amount.denom === "uscrt") {
              agg.base = amount;
            }
          });
        return agg;
      },
      {
        base: null,
        ibc: null,
        unwrap: null,
        stake: null,
      }
    ) as { ibc: any; unwrap: any; stake: any; base: any };
    if (!reduce.stake) {
      return {
        route: [],
      };
    }

    const osmosisTxs = [];
    const queries: any[][] = [];
    let totalSCRT = BigNumber(reduce.base?.amount || 0);
    if (reduce.ibc) {
      let find = props.amounts?.find((d) => d.denom === scrtDenomOsmosis);
      totalSCRT = totalSCRT.plus(find!.amount);
      osmosisTxs.push(find, reduce.ibc);
      find!.id = reduce.ibc.waitId;
      queries.push([
        {
          type: "ibc",
          chainId: envOsmosis.chainId,
          denom: scrtDenomOsmosis,
          amount: find!.amount,
          id: reduce.ibc.waitId,
        },
        {
          type: "balance",
          denom: "uscrt",
          chainId: envSecret.chainId,
          amount: find!.amount,
          wait: 120,
          id: reduce.ibc.id,
        },
      ]);
    }
    let scrtTxs = [];
    let baseTxs = [];
    if (reduce.unwrap) {
      let find = props.amounts?.find((d) => d.secretAddress === sSCRTContractAddress);
      totalSCRT = totalSCRT.plus(find!.amount);
      scrtTxs.push(find, reduce.unwrap);
      find!.id = reduce.unwrap.waitId;
      queries.push([
        {
          type: "unwrap",
          chainId: envSecret.chainId,
          secretAddress: sSCRTContractAddress,
          amount: find!.amount,
          id: reduce.unwrap.waitId,
        },
        {
          type: "balance",
          denom: "sSCRT",
          chainId: envSecret.chainId,
          id: reduce.unwrap.id,
          wait: 30,
          amount: `-${find!.amount}`,
        },
      ]);
    }

    if (reduce.base) {
      reduce.base.id = reduce.stake.waitId;
      baseTxs.push(reduce.base);
      if (scrtTxs.length) {
        baseTxs.push(
          ...[
            {
              txName: "wait",
            },
            {
              denom: "uscrt",
              amount: totalSCRT.toString(),
              chainId: envSecret.chainId,
            },
            reduce.stake,
          ]
        );
      } else if (osmosisTxs.length) {
        baseTxs.push([
          {
            txName: "wait",
          },
          {
            denom: "uscrt",
            amount: totalSCRT.toString(),
            chainId: envSecret.chainId,
          },
        ]);
      }
      baseTxs.push(reduce.stake);
    } else {
      if (scrtTxs.length) {
        scrtTxs.push(
          ...[
            osmosisTxs.length && {
              denom: "uscrt",
              amount: totalSCRT.toString(),
              chainId: envSecret.chainId,
            },
            reduce.stake,
          ].filter((d) => !!d)
        );
      } else {
        osmosisTxs.push(reduce.stake);
      }
    }
    queries.push(
      [
        osmosisTxs.length || scrtTxs.length
          ? {
              type: "waitAll",
              denom: "uscrt",
              chainId: envSecret.chainId,
              amount: totalSCRT.toString(),
            }
          : null,
        {
          id: reduce.stake.waitId,
          type: "stake",
          denom: "uscrt",
          chainId: envSecret.chainId,
          secretAddress: stkdSCRTContractAddress,
          amount: totalSCRT.toString(),
        },
        {
          id: reduce.stake.id,
          type: "balance",
          denom: "stkd-SCRT",
          status: [reduce.stake.id, "started", "finished"],
          chainId: envSecret.chainId,
          wait: 30,
          secretAddress: stkdSCRTContractAddress,
          amount: BigNumber(reduce.stake?.amount)
            .multipliedBy(1 - 0.2 / 100 - 0.01 / 100)
            .toString(),
        },
      ].filter((d) => !!d)
    );
    const { startQueries, events } = useRouteQueries(queries);
    emit("queryUpdate", startQueries);
    const route = [osmosisTxs, baseTxs, scrtTxs].filter((d) => !!d.length).sort((a, b) => a.length - b.length);
    // statuses.value = {};
    events.on("status", ({ jobId, status }) => {
      statuses.value = {
        ...statuses.value,
        [jobId]: status,
      };
    });

    activeRoute.value = {
      route,
    };
  },
  {
    onTrigger: console.log.bind(console),
  }
);
</script>

<style scoped></style>
