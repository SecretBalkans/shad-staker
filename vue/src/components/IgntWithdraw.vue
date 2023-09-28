<template>
  <div>
    <div class="pt-8">
      <div class="text-xs text-gray-600">Unstake stkdSCRT and wait for unbonding period to receive SCRT</div>
    </div>
    <div>
      <div class="">
        <div v-if="hasAnyBalance">
          <IgntAmountSelect
            :mode="'unstake'"
            class="token-selector--main"
            :selected="state.tx.amounts"
            :balances="balances.assets"
            @update="handleTxAmountUpdate"
          />

          <div class="mt-5 flex align-center items-center justify-center">
            <IgntButton style="width: 110px" :disabled="!ableToTx" @click="withdraw" :busy="state.isTxOngoing">Withdraw </IgntButton>
          </div>
        </div>
      </div>
      <div class="p-5">
        <StakingInfo :withdraw="true" />
      </div>
      <div class="p-5 pt-0 text-right"></div>
    </div>

    <UnbondingsInfo />
  </div>
</template>
<script setup lang="ts">
import { IgntButton } from "@ignt/vue-library";
import StakingInfo from "./StakingInfo.vue";
import UnbondingsInfo from "./UnbondingsInfo.vue";
import { computed, onMounted, reactive, watch } from "vue";
import { useAssets } from "@/def-composables/useAssets";
import BigNumber from "bignumber.js";
import IgntAmountSelect from "./IgntAmountSelect.vue";
import type { BalanceAmount } from "@/utils/interfaces";
import { useWalletStore } from "@/stores/useWalletStore";
import { envSecret } from "@/env";

interface TxData {
  receiver: string;
  ch: string;
  amounts: Array<BalanceAmount>;
  memo: string;
  fees: Array<BalanceAmount>;
}

interface State {
  tx: TxData;
  advancedOpen: boolean;
  startQueries: any;
  executed: boolean;
  isTxOngoing: boolean;
}

const initialState: State = {
  tx: {
    receiver: "",
    ch: "",
    amounts: [],
    memo: "",
    fees: [],
  },
  startQueries: null,
  executed: false,
  advancedOpen: false,
  isTxOngoing: false,
};

const walletStore = useWalletStore();
const state = reactive(initialState);
let chainId = envSecret.chainId;
const address = computed(() => walletStore.addresses[chainId]);

const { balances } = useAssets();

const parseAmount = (amount: string): BigNumber => {
  return !amount ? new BigNumber(0) : new BigNumber(amount);
};

const hasAnyBalance = computed<boolean>(
  () => balances.value.assets.length && balances.value.assets.some((x: any) => parseAmount(x.amount ?? "0").isPositive())
);

const handleTxAmountUpdate = (selected: BalanceAmount[]) => {
  state.tx.amounts = selected;
};

const withdraw = async () => {
  const inputAmount = (Number(state.tx.amounts[0].amount) * 10 ** 6).toString();
  console.log("Input amount: ", inputAmount);
  state.isTxOngoing = true;
  const result = await walletStore.secretJsClient?.executeStkdSecretWithdraw(inputAmount);
  state.isTxOngoing = false;
  console.log("Executed withdrawal...: ", result);
};

let validTxAmount = computed<boolean>(() => {
  return (
    state.tx.amounts.length > 0 &&
    state.tx.amounts.every((x) => {
      let parsedAmount = parseAmount(x.amount);

      return (
        !parsedAmount.isNaN() &&
        parsedAmount.isPositive() &&
        !parsedAmount.isZero() &&
        parsedAmount.isLessThanOrEqualTo(BigNumber(balances.value.assets.find((d: any) => d.denom === x.denom)?.amount || 0))
      );
    })
  );
});

let ableToTx = computed<boolean>(() => validTxAmount.value);
const bootstrapTxAmount = () => {
  let firstBalance = balances.value.assets.find((d: any) => d.unstakable && BigNumber(d.amount).isGreaterThan(0));
  if (hasAnyBalance.value && firstBalance && !state.tx.amounts.length) {
    state.executed = true;
    state.tx.amounts[0] = {
      ...firstBalance,
      amount: "0",
    };
  }
};

onMounted(() => {
  watch(
    () => !state.executed && walletStore.secretJsClient && address.value && balances.value.assets,
    (val) => {
      if (val) {
        bootstrapTxAmount();
      }
    }
  );
});
</script>
