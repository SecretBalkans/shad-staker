<template>
  <div>
    <div class="pt-8">
      <div class="text-xs text-gray-600">
        {{
          state.currentUIState === UI_STATE.STAKE
            ? `Liquid stake SCRT from Osmosis or Secret chain`
            : isTxError
            ? "Finished with an error:"
            : isTxSuccess
            ? `Finished:`
            : `Executing...`
        }}
      </div>
      <div class="text-xs italic mt-2 max-w-fit">
        <div v-if="isTxError" class="text-red-500">
          {{ fsm.context.jobStates?.stake?.error || fsm.context.jobStates?.ibc?.error }}
          <div title="Click tx link in route for more details!" class="mt-1">
            <ignt-warning-icon></ignt-warning-icon>
          </div>
        </div>
        <div v-if="isTxSuccess" class="text-green-500">Staked successfully</div>
      </div>
    </div>
    <div v-if="!marketData.stkdSecretInfo.value?.price || !swapLimit">
      <IgntLoadingIcon class="inline-block mr-5" />Loading
      {{ [!marketData.stkdSecretInfo.value?.price && `market`, !swapLimit && "swap"].filter((d) => !!d).join(" and ") }} data...
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
    <div class="w-fit pt-5" v-if="state.amounts[0] || state.currentUIState === UI_STATE.TX_SIGNING || isTxSuccess || isTxError">
      <div class="text-xs pb-1 text-gray-600" v-if="fsm.context.tasks.stake?.wait?.amount">
        Route through ShadStake to convert SCRT to stkdSCRT
        <span v-if="fsm.context.tasks.stake.ops.find((d) => d.tx === 'swap')">(will utilize swap)</span>
        <span v-if="!fsm.context.tasks.stake.ops.find((d) => d.tx === 'swap')">(will use only staking)</span>
        <div>
          You will receive
          {{
            arbPercent.stkdSCRT > 0
              ? `${arbPercent.percent}% (+${arbPercent.stkdSCRT} stkdSCRT = $${arbPercent.usd}) compared to direct SCRT staking!`
              : "same amount as direct SCRT staking."
          }}
        </div>
      </div>
      <div class="pl-5 pr-20">
        <StakeRoute :fsm="fsm" :colored="state.currentUIState !== UI_STATE.TX_SIGNING && fsm.value !== 'idle'"></StakeRoute>
      </div>
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
import { IgntButton, IgntCard, IgntClearIcon, IgntLoadingIcon, IgntWarningIcon } from "@ignt/vue-library";
import IgntAmountSelect from "./IgntAmountSelect.vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { envSecret } from "@/env";
import StakingInfo from "./StakingInfo.vue";
import { useSecretStakingMarketData } from "@/def-composables/useSecretStakingMarketData";
import { useStakeFSM } from "@/def-composables/state/useStakeFSM";
import { useMachine } from "@xstate/vue";
import StakeRoute from "@/components/StakeRoute.vue";
import { PERSISTENCE_HISTORY_KEY, PERSISTENCE_KEY } from "@/utils/const";
import { useSwapLimit } from "@/def-composables/state/useSwapLimit";
import { prettyNumber } from "@/utils/prettyNumber";
import { useStkdSecretPrice } from "@/def-composables/useStkdSecretPrice";

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
const swapLimit = computed(() => walletStore.secretJsClient && useSwapLimit(walletStore.secretJsClient).value);
const handleTxAmountUpdate = (selected: BalanceAmount[]) => {
  state.amounts = selected;
  stateMachine.send("INIT", {
    amounts: state.amounts,
    price: stkdSecretInfo.value?.price,
    swapLimit: swapLimit.value,
  });
};

const parseAmount = (amount: string): BigNumber => {
  return !amount ? new BigNumber(0) : new BigNumber(amount);
};
const hasAnyBalance = computed<boolean>(
  () =>
    balances.value.assets.length &&
    balances.value.assets.some((x: any) => parseAmount(x.amount ?? "0").isPositive() && stkdSecretInfo.value?.price && swapLimit.value)
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
const queryPrice = useStkdSecretPrice();

const arbPercent = computed(() => {
  if (fsm.value && queryPrice.value) {
    const stakeOnlyReceive = BigNumber((fsm.value?.context.tasks.stake as any)?.amount)
      .dividedBy(BigNumber(stkdSecretInfo?.value?.price).dividedBy(10 ** 6))
      .times(1 - 0.2 / 100);
    const actualReceive = (fsm.value?.context.tasks.stake as any)?.wait.amount;
    const diff = BigNumber(actualReceive).minus(stakeOnlyReceive);
    return {
      percent: +diff.dividedBy(stakeOnlyReceive).times(100).toFixed(4),
      stkdSCRT: +diff.toFixed(6),
      usd: +diff.times(queryPrice.value).toFixed(2),
    };
  }
  return {
    stkdSCRT: 0,
    percent: 0,
    usd: 0,
  };
});
</script>
