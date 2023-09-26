<template>
  <div>
    <div class="pt-8">
      <div class="text-xs text-gray-600">
        {{
          state.currentUIState === UI_STATE.STAKE
            ? `Liquid stake SCRT from Osmosis or Secret chain`
            : isTxError || isTxSuccess
            ? `Finished.`
            : `Executing...`
        }}
      </div>
    </div>
    <div v-if="hasAnyBalance && state.currentUIState === UI_STATE.STAKE">
      <IgntAmountSelect
        :mode="'stake'"
        class="token-selector--main"
        :selected="state.amounts"
        :balances="balances.assets"
        @update="handleTxAmountUpdate"
      />
    </div>
    <div v-if="state.amounts[0] || state.currentUIState === UI_STATE.TX_SIGNING || isTxSuccess || isTxError">
      <div class="text-xs pb-1 pt-5 text-gray-600" v-if="fsm.context.tasks.stake?.wait?.amount">
        Route for
        {{
          `${[fsm.context.tasks.unwrap, fsm.context.tasks.base, fsm.context.tasks.ibc].filter((d) => !!d).length > 1 ? `a total of ` : ``}`
        }}{{ fsm.context.tasks.stake?.wait?.amount }} stkd-SCRT
      </div>
      <StakeRoute :fsm="fsm"></StakeRoute>
    </div>
    <div>
      <div v-if="isTxError" class="flex items-center justify-center text-xs text-red-500 italic mt-2">Error submitting Tx</div>

      <div v-if="isTxSuccess" class="flex items-center justify-center text-xxs text-green-500 italic mt-2">Staked successfully</div>
    </div>
    <div style="width: 100%; height: 24px" />
    <div>
      <ignt-button
        @click="() => resetTx()"
        class="w-full"
        v-if="state.currentUIState !== UI_STATE.STAKE"
        :type="state.currentUIState === UI_STATE.TX_SIGNING ? `primary` : `secondary`"
      >
        {{ state.currentUIState === UI_STATE.TX_SIGNING ? `Cancel` : "Close" }}
        <ignt-clear-icon :class="`inline-flex text-${state.currentUIState === UI_STATE.TX_SIGNING ? `white` : `black`}-500 pb-0.5`" />
      </ignt-button>
      <IgntButton
        style="width: 100%"
        :disabled="!ableToTx"
        @click="sendTx"
        :busy="isTxOngoing"
        v-if="state.currentUIState === UI_STATE.STAKE"
      >
        Stake
      </IgntButton>
    </div>
    <div>
      <StakingInfo :withdraw="false" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useAssets } from "@/def-composables/useAssets";
import type { BalanceAmount } from "@/utils/interfaces";
import { UI_STATE } from "@/utils/interfaces";
import { computed, onMounted, reactive, watch } from "vue";
import BigNumber from "bignumber.js";
import { IgntButton, IgntClearIcon } from "@ignt/vue-library";
import IgntAmountSelect from "./IgntAmountSelect.vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { envSecret } from "@/env";
import StakingInfo from "./StakingInfo.vue";
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";
import { useStakeFSM } from "@/def-composables/state/useStakeFSM";
import { useMachine } from "@xstate/vue";
import StakeRoute from "@/components/StakeRoute.vue";

interface State {
  amounts: Array<BalanceAmount>;
  currentUIState: UI_STATE;
  advancedOpen: boolean;
  executed: boolean;
  fsm: any;
  fsmValue: any;
}

const initialState: State = {
  amounts: [],
  executed: false,
  currentUIState: UI_STATE.STAKE,
  fsm: null,
  fsmValue: null,
  advancedOpen: false,
};
const state = reactive(initialState);
const walletStore = useWalletStore();
let chainId = envSecret.chainId;
const address = computed(() => walletStore.addresses[chainId]);
const { balances } = useAssets();

const marketData = computed(() => walletStore.secretJsClient && useSecretStakingMarketData(walletStore.secretJsClient));
const stkdSecretInfo = computed(() => marketData.value?.stkdSecretInfo.value);

const resetTx = (): void => {
  if (state.currentUIState !== UI_STATE.STAKE) {
    handleTxAmountUpdate([]);
    bootstrapTxAmount();
    resetMachine();
    state.executed = false;
    state.currentUIState = UI_STATE.STAKE;
  }
};
const machine = useStakeFSM();
let stateMachine = useMachine(machine);
const fsm = computed(() => stateMachine.state.value);
stateMachine.service.start();
const resetMachine = (): void => {
  stateMachine.send("RESET");
};
stateMachine.service.onTransition((context: any, event: any) => {
  if (context.matches("success") || context.matches("failure")) {
    state.currentUIState = context.matches("success") ? UI_STATE.TX_SUCCESS : UI_STATE.TX_ERROR;
  }
});
const sendTx = async (): Promise<void> => {
  state.currentUIState = UI_STATE.TX_SIGNING;
  try {
    stateMachine.send("START");
  } catch (e) {
    console.error(e);
    state.currentUIState = UI_STATE.TX_ERROR;
  }
};

const handleTxAmountUpdate = (selected: BalanceAmount[]) => {
  state.amounts = selected;
  stateMachine.send("INIT", { amounts: state.amounts, price: stkdSecretInfo.value?.price });
};

const parseAmount = (amount: string): BigNumber => {
  return !amount ? new BigNumber(0) : new BigNumber(amount);
};
const hasAnyBalance = computed<boolean>(
  () =>
    balances.value.assets.length &&
    balances.value.assets.some((x: any) => parseAmount(x.amount ?? "0").isPositive() && stkdSecretInfo.value?.price)
);
const isTxOngoing = computed<boolean>(() => {
  return state.currentUIState === UI_STATE.TX_SIGNING;
});
const isTxSuccess = computed<boolean>(() => {
  return state.currentUIState === UI_STATE.TX_SUCCESS;
});
const isTxError = computed<boolean>(() => {
  return state.currentUIState === UI_STATE.TX_ERROR;
});

let validTxAmount = computed<boolean>(() => {
  return (
    state.amounts.length > 0 &&
    state.amounts.every((x) => {
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
  let firstBalance = balances.value.assets.find((d: any) => d.stakable && BigNumber(d.amount).isGreaterThan(0));
  if (hasAnyBalance.value && firstBalance && !state.amounts.length) {
    state.executed = true;
    state.amounts[0] = {
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
