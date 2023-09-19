<template>
  <table class="table-auto">
    <tbody>
      <!--      <tr class="text-xs">
  <td v-for="(routeItem, j) in tokenRoutes2[0]" :key="routeItem?.denom || j">
    <span v-if="routeItem">
      <ignt-chevron-right-icon class="inline-flex text-gray-500 text-xs" v-if="routeItem.txName" />
      <span class="inline-flex ml-1" v-if="routeItem.txName">{{ routeItem.txName }}</span>
      <RouteAsset class="flex" :amount="routeItem"></RouteAsset>
      <ignt-chevron-right-icon class="inline-flex text-gray-500 text-xs mr-0.5" v-if="tokenRoutes2[i+1]?.txName" />
    </span>
  </td>
</tr>-->
      <tr v-for="(route, i) in tokenRoutes2.route" :key="route[0]?.denom || i" class="table-row text-xs">
        <td :key="routeItem?.denom || j" v-for="(routeItem, j) in route" class="table-cell">
          <ignt-chevron-right-icon class="inline-flex text-gray-500 mt-0.5 p-0.5 float-left mr-0.5" v-if="routeItem?.txName" />
          <span
            :class="routeItem?.denom ? `inline-flex ml-1 float-left` : ``"
            :style="!routeItem?.denom && { display: 'table', margin: '0 auto' }"
            v-if="routeItem?.txName"
            >{{ routeItem?.txName }}</span
          >
          <ignt-chevron-right-icon
            class="inline-flex text-gray-500 mt-0.5 p-0.5 float-left mr-0.5"
            v-if="route[j - 1]?.txName || (routeItem?.txName && routeItem?.denom)"
          />
          <span class="inline-flex float-left ml-1"><RouteAsset :amount="routeItem" v-if="routeItem?.denom"></RouteAsset></span>
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
import type { BalanceAmount } from "@/utils/interfaces";
import { PropType } from "vue/dist/vue";
import RouteAsset from "@/components/RouteAsset.vue";
import BigNumber from "bignumber.js";
import { envOsmosis, envSecret } from "@/env";
import { scrtDenomOsmosis, sSCRTContractAddress, stkdSCRTContractAddress } from "@/utils/const";
import { IgntChevronRightIcon } from "@ignt/vue-library";
import { computed } from "vue";

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

const routes = {
  //scrt on osmosis
  [scrtDenomOsmosis]: [id, ibc, stake],
  uscrt: [id, stake],
  sSCRT: [id, unwrap, stake],
} as Record<string, any>;

const props = defineProps({
  amounts: {
    type: Array as PropType<Array<BalanceAmount>>,
    required: true,
  },
  price: {
    type: Number,
    default: 0,
    required: true,
  },
});
const tokenRoutes2 = computed(() => {
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
  const osmosisTxs = [];
  const queries: any[][] = [];
  let totalSCRT = BigNumber(reduce.base?.amount || 0);
  if (reduce.ibc) {
    let find = props.amounts?.find((d) => d.denom === scrtDenomOsmosis);
    totalSCRT = totalSCRT.plus(find!.amount);
    osmosisTxs.push(find, reduce.ibc);
    queries.push([
      {
        type: "ibc",
        chainId: envOsmosis.chainId,
        denom: scrtDenomOsmosis,
        amount: find!.amount,
      },
      {
        type: "balance",
        denom: "uscrt",
        chainId: envSecret.chainId,
        amount: find!.amount,
      },
    ]);
  }
  let scrtTxs = [];
  let baseTxs = [];
  if (reduce.unwrap) {
    let find = props.amounts?.find((d) => d.secretAddress === sSCRTContractAddress);
    totalSCRT = totalSCRT.plus(find!.amount);
    scrtTxs.push(find, reduce.unwrap);
    queries.push([
      {
        type: "unwrap",
        secretAddress: sSCRTContractAddress,
        amount: find!.amount,
      },
      {
        type: "balance",
        denom: "uscrt",
        chainId: envSecret.chainId,
        amount: find!.amount,
      },
    ]);
  }
  if (reduce.base) {
    baseTxs.push(
      reduce.base,
      ...(scrtTxs.length
        ? [
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
        : [
            ...(osmosisTxs.length
              ? [
                  {
                    txName: "wait",
                  },
                  {
                    denom: "uscrt",
                    amount: totalSCRT.toString(),
                    chainId: envSecret.chainId,
                  },
                ]
              : []),
            reduce.stake,
          ].filter((d) => !!d))
    );
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
  queries.push([
    {
      type: "balance",
      amount: totalSCRT.toString(),
    },
    {
      type: "stake",
      amount: totalSCRT.toString(),
    },
    {
      type: "balance",
      denom: "stkd-SCRT",
      secretAddress: stkdSCRTContractAddress,
    },
  ]);
  emit("queryUpdate", queries);
  return {
    route: [osmosisTxs, baseTxs, scrtTxs].filter((d) => !!d.length).sort((a, b) => a.length - b.length),
    queries,
  };
});
</script>

<style scoped></style>
