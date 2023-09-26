<template>
  <div class="flex flex-col">
    <IgntAmountInputRow
      v-for="(x, i) in selected"
      :key="`${x.denom}_${i}`"
      :amount="x"
      :auto-focus="true"
      class="flex justify-between items-center my-1 py-3 rounded-xl relative px-4"
      @change="
        (val) => {
          handleInputChange({ denom: x.denom, chainId: x.chainId, secretAddress: x.secretAddress, amount: val });
        }
      "
      @remove="
        (val) => {
          handleTokenRemove(i);
        }
      "
    />

    <div
      v-if="ableToBeSelected?.length > 0"
      class="flex items-center text-xs font-medium text-gray-600 mt-2 px-2 cursor-pointer"
      @click="
        () => {
          state.modalOpen = true;
        }
      "
    >
      <IgntAddIcon class="text-black text-xl" />
      <div class="ml-3 mt-0.5">Add asset</div>
    </div>

    <IgntModal
      :visible="state.modalOpen"
      :close-icon="true"
      :title="'Select asset'"
      @close="
        () => {
          state.modalOpen = false;
        }
      "
    >
      <template #body>
        <div class="relative mb-4 flex items-center">
          <div class="z-50">
            <IgntSearchIcon className="ml-4" />
          </div>
          <input
            v-model="state.tokenSearch"
            class="-ml-8 pl-10 pr-10 leading-12 h-12 appearance-none w-full outline-none border-none rounded-xl focus:shadow-outline"
            placeholder="Search assets"
          />
          <div
            v-if="state.tokenSearch"
            class="z-50 absolute mr-4"
            @click.prevent="
              () => {
                state.tokenSearch = '';
              }
            "
          >
            <IgntClearIcon />
          </div>
        </div>
        <div class="relative mb-3">
          <div
            v-for="x in ableToBeSelected"
            :key="'balance_select_' + x.denom"
            class="flex justify-start w-full items-center my-1 py-3 rounded-xl hover:bg-gray-100 px-2"
            @click="
              () => {
                handleTokenSelect(x);
              }
            "
          >
            <IgntDenom :icon="x.icon" :denom="x.denom" :chain-id="x.chainId" :is-secret="!!x.secretAddress" modifier="avatar" />
            <div class="flex flex-col justify-between ml-4">
              <div class="font-semibold">
                <IgntDenom :chain-id="x?.chainId" :denom="x?.denom ?? ''" :key="x?.denom" :is-secret="!!x?.secretAddress" />
                <IgntDenom
                  :chain-id="x?.chainId"
                  :denom="x?.denom ?? ''"
                  modifier="path"
                  class="text-normal opacity-50 ml-1.5"
                  :key="x?.denom"
                  :shorten="false"
                />
              </div>

              <div class="text-xs">{{ parseAmount(x.amount) }} available</div>
            </div>
          </div>
        </div>
      </template>
    </IgntModal>
  </div>
</template>

<script setup lang="ts">
import { useDenom } from "@/def-composables/useDenom";
import type { Amount, BalanceAmount } from "@/utils/interfaces";
import BigNumber from "bignumber.js";
import { computed, type PropType, reactive } from "vue";

import IgntDenom from "./IgntDenom.vue";
import { IgntClearIcon, IgntModal } from "@ignt/vue-library";
import { IgntSearchIcon } from "@ignt/vue-library";
import { IgntAddIcon } from "@ignt/vue-library";
import IgntAmountInputRow from "./IgntAmountInputRow.vue";

export interface State {
  tokenSearch: string;
  modalOpen: boolean;
}

const initialState: State = {
  tokenSearch: "",
  modalOpen: false,
};

const emit = defineEmits(["update"]);

const props = defineProps({
  selected: {
    type: Array as PropType<Array<BalanceAmount>>,
  },
  balances: {
    type: Array as PropType<Array<BalanceAmount>>,
  },
  mode: {
    type: String,
    required: true,
  },
});

// state
let state: State = reactive(initialState);

// computed
let ableToBeSelected = computed(() => {
  const notSelected = (x: BalanceAmount) =>
    (props.selected as Array<BalanceAmount>).every((y: Amount) => {
      return x.denom?.toLowerCase() !== y.denom?.toLowerCase();
    });

  const searchFilter = (x: BalanceAmount) => {
    const base = x.secretAddress ? x.denom : useDenom(x.denom, x.chainId).normalized.value;
    if (base.toLowerCase().includes(state.tokenSearch.toLowerCase())) {
      return true;
    } else {
      return false;
    }
  };
  return (
    props.balances
      ?.filter((b) => !b.gas && ((props.mode === "stake" && b.stakable) || (props.mode === "unstake" && b.unstakable)))
      .filter(notSelected)
      .filter((b) => BigNumber(b.amount).isGreaterThan(0))
      .filter(searchFilter) ?? []
  );
});

let parseAmount = (amount: string): BigNumber => {
  return !amount ? new BigNumber(0) : new BigNumber(amount);
};

const handleInputChange = (val: BalanceAmount) => {
  const newSelected: Array<BalanceAmount> = [...(props.selected ?? [])];
  const index = newSelected.findIndex((x) => x.denom.toLowerCase() == val.denom.toLowerCase());
  newSelected[index].amount = val.amount;
  emit("update", newSelected);
};
let handleTokenSelect = (x: BalanceAmount) => {
  let newSelected: Array<BalanceAmount> = [
    ...(props.selected ?? []),
    {
      ...x,
      amount: "",
    },
  ];
  emit("update", newSelected);

  state.modalOpen = false;
};

let handleTokenRemove = (i: any) => {
  const newSelected: Array<BalanceAmount> = (props.selected ?? []).filter((d, index) => i !== index);
  emit("update", newSelected);
};
</script>
