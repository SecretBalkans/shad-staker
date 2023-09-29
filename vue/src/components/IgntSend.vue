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
          `${
            [fsm.context.tasks.unwrap, fsm.context.tasks.base, fsm.context.tasks.ibc].filter((d) => !!d).length > 1
              ? `a
        total of `
              : ``
          }`
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
      <ignt-card v-if="state.currentUIState === UI_STATE.TX_SIGNING && state.confirmCancel" class="border-4 p-3">
        Do you really want to cancel?
        <small class="block">(signed transactions might already be executed.)</small>
        <div class="flex align-center items-center justify-center mt-2">
          <ignt-button @click="() => resetTx(true)" class="w-2/5 mr-3" type="primary">
            <ignt-clear-icon class="inline-block text-white mr-3"></ignt-clear-icon>Yes
          </ignt-button>
          <ignt-button @click="() => (state.confirmCancel = false)" class="w-2/5 max-h-20" type="secondary"> No </ignt-button>
        </div>
      </ignt-card>
      <div class="flex align-center items-center justify-center">
        <ignt-button
          style="width: 150px"
          @click="
            () =>
              (state.currentUIState === UI_STATE.TX_SIGNING && confirmCancel()) ||
              (state.currentUIState !== UI_STATE.TX_SIGNING && resetTx(false))
          "
          class="w-full"
          v-if="state.currentUIState !== UI_STATE.STAKE && !state.confirmCancel"
          :type="state.currentUIState === UI_STATE.TX_SIGNING ? `primary` : `secondary`"
        >
          {{ state.currentUIState === UI_STATE.TX_SIGNING ? `Cancel` : "Close" }}
          <ignt-clear-icon :class="`inline-flex text-${state.currentUIState === UI_STATE.TX_SIGNING ? `white` : `black`}-500 pb-0.5`" />
        </ignt-button>
      </div>
      <div class="flex align-center items-center justify-center">
        <IgntButton
          style="width: 110px"
          :disabled="!ableToTx"
          @click="sendTx"
          :busy="isTxOngoing"
          v-if="state.currentUIState === UI_STATE.STAKE"
          >Stake
        </IgntButton>
      </div>
    </div>
    <div class="p-5">
      <StakingInfo :withdraw="false" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useAssets } from "@/def-composables/useAssets";
import type { BalanceAmount } from "@/utils/interfaces";
import { UI_STATE } from "@/utils/interfaces";
import { computed, nextTick, onMounted, reactive, watch } from "vue";
import BigNumber from "bignumber.js";
import { IgntButton, IgntCard, IgntClearIcon } from "@ignt/vue-library";
import IgntAmountSelect from "./IgntAmountSelect.vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { envSecret } from "@/env";
import StakingInfo from "./StakingInfo.vue";
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";
import { useStakeFSM } from "@/def-composables/state/useStakeFSM";
import { useMachine } from "@xstate/vue";
import StakeRoute from "@/components/StakeRoute.vue";
import { PERSISTENCE_HISTORY_KEY, PERSISTENCE_KEY } from "@/utils/const";

interface State {
  amounts: Array<BalanceAmount>;
  currentUIState: UI_STATE;
  advancedOpen: boolean;
  executed: boolean;
  confirmCancel: boolean;
}

const machine = useStakeFSM();
const persisted = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || "{}");
const latestState = persisted.fsm || machine.initialState;
const initialState: State = {
  amounts: [],
  executed: false,
  currentUIState: persisted.uiState || UI_STATE.STAKE,
  confirmCancel: false,
  advancedOpen: false,
};
const state = reactive(initialState);
const walletStore = useWalletStore();
let chainId = envSecret.chainId;
const address = computed(() => walletStore.addresses[chainId]);
const { balances } = useAssets();

const marketData = computed(() => walletStore.secretJsClient && useSecretStakingMarketData(walletStore.secretJsClient));
const stkdSecretInfo = computed(() => marketData.value?.stkdSecretInfo.value);
const confirmCancel = (): void => {
  state.confirmCancel = true;
};
const resetTx = (isCancel = false): void => {
  if (state.currentUIState !== UI_STATE.STAKE) {
    persistCurrentFSMToHistory();
    handleTxAmountUpdate([]);
    bootstrapTxAmount();
    resetMachine(isCancel);
    state.executed = false;
    state.confirmCancel = false;
    state.currentUIState = UI_STATE.STAKE;
  }
};
let stateMachine = useMachine(machine, { state: latestState });
const fsm = computed(() => stateMachine.state.value);
stateMachine.service.start();
const resetMachine = (isCancel = false): void => {
  localStorage.removeItem(PERSISTENCE_KEY);
  stateMachine.send("RESET", { isCancel });
};
function persistCurrentFSMToHistory() {
  try {
    console.log("Persisted to history", { state: fsm.value.value, context: fsm.value.context, uiState: state.currentUIState });
    const history = JSON.parse(localStorage.getItem(PERSISTENCE_HISTORY_KEY) || "[]");
    localStorage.setItem(
      PERSISTENCE_HISTORY_KEY,
      JSON.stringify([
        ...history,
        {
          time: Date.now(),
          fsm: fsm.value,
        },
      ])
    );
  } catch (e) {
    console.error("Error persisting state", e);
  }
}
function persistCurrentFSM() {
  if ([UI_STATE.TX_SIGNING, UI_STATE.TX_SUCCESS, UI_STATE.TX_ERROR].includes(state.currentUIState)) {
    try {
      console.log("Persisted", { state: fsm.value.value, context: fsm.value.context, uiState: state.currentUIState });
      localStorage.setItem(
        PERSISTENCE_KEY,
        JSON.stringify({
          fsm: fsm.value,
          uiState: state.currentUIState,
        })
      );
    } catch (e) {
      console.error("Error persisting state", e);
    }
  }
}
stateMachine.service.onTransition((context: any) => {
  nextTick(() => {
    persistCurrentFSM();
  });
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

watch(
  () => JSON.stringify({ state }),
  () => nextTick(persistCurrentFSM)
);

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
