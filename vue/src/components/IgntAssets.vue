<template>
  <section>
    <header class="flex items-center justify-between">
      <h2 class="text-3xl text-black font-semibold p-0 m-0 mb-2.5 flex-1">Assets</h2>
      <div v-if="isConnected && balances.assets.length && !balances.isLoading" class="flex items-center justify-end mb-2.5">
        <div class="z-50">
          <IgntSearchIcon />
        </div>
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Search assets"
          class="w-48 -ml-8 pl-10 pr-10 leading-12 h-12 appearance-none outline-none border-none rounded-xl focus:shadow-outline"
          @input="(evt: Event) => {
            resetDisplayLimit();
            return evt;
          }"
        />
        <div v-if="searchQuery" class="z-50 absolute mr-4" @click.prevent="resetSearch">
          <IgntClearIcon />
        </div>
      </div>
    </header>
    <table class="table-auto w-full" v-if="isConnected && !balances.isLoading && balances.assets.length">
      <thead v-if="balances.assets.length">
        <tr>
          <td class="text-left text-xs text-black opacity-70">Asset</td>
          <td></td>
          <td class="text-right text-xs text-black opacity-70">Available balance</td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="balance in filteredBalanceList.slice(0, displayLimit)"
          :key="balance?.denom"
          :style="{
            borderTop: `${balance?.gas ? 'solid lightgray 0.5px' : ''}`,
          }"
          :class="`py-2 ${balance?.gas ? 'text-gray-600' : 'text-black'}`"
        >
          <td class="flex items-center py-5 font-semibold">
            <IgntDenom
              :icon="balance?.icon"
              :denom="balance?.denom ?? ''"
              :chain-id="balance?.chainId"
              modifier="avatar"
              class="mr-6"
              :key="balance?.denom"
            />
            <IgntDenom
              :chain-id="balance?.chainId"
              :denom="balance?.denom ?? ''"
              :key="balance?.denom"
              :is-secret="!!balance?.secretAddress"
            />
            <div v-if="balance?.gas" class="ml-2" :title="`Only used for gas`">
              <IgntWarningIcon />
            </div>
          </td>
          <td>
            <IgntDenom
              :chain-id="balance?.chainId"
              :denom="balance?.denom ?? ''"
              modifier="path"
              class="text-normal opacity-70"
              :key="balance?.denom"
              :shorten="false"
            />
          </td>
          <td :class="`text-right font-bold py-5 text-lg`">
            <span v-if="balance?.secretAddress">
              <SecretAmount :secret-address="balance?.secretAddress" :amount="balance?.amount" />
            </span>
            <span v-else>
              {{ balance?.amount }}
            </span>
          </td>
        </tr>
        <tr v-if="noSearchResults">
          <td class="text-center text-black text-md font-bold py-10" colspan="3">
            <h4>No results for '{{ searchQuery }}'</h4>
            <p class="text-sm font-normal">Try again with another search</p>
          </td>
        </tr>
      </tbody>
    </table>
    <template v-if="isConnected && (balances.isLoading || !balances.assets.length)">
      <div role="status" class="w-100 animate-pulse flex flex-col">
        <div class="flex flex-row justify-between py-7 items-center flex-1" v-for="n in 5" :key="'loading-skel-' + n">
          <div class="flex flex-1 items-center">
            <div class="w-8 h-8 mr-4 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            <div class="h-6 bg-gray-200 rounded-lg dark:bg-gray-700 w-20"></div>
          </div>
          <div class="h-6 bg-gray-200 rounded-lg dark:bg-gray-700 w-40 -mr-2"></div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>
    </template>
    <div
      v-if="isConnected && !balances.isLoading && !balances.assets.length"
      class="text-left text-black opacity-75 text-md font-normal py-8"
    >
      You have no assets
    </div>
    <div v-if="!isConnected" class="text-left text-black opacity-75 text-md font-normal py-8">You need to connect</div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRefs } from "vue";

import { useAssets } from "@/def-composables/useAssets";
import { useDenom } from "@/def-composables/useDenom";
import IgntDenom from "./IgntDenom.vue";
import { IgntSearchIcon, IgntWarningIcon } from "@ignt/vue-library";
import { IgntClearIcon } from "@ignt/vue-library";
import { useWalletStore } from "@/stores/useWalletStore";
import { envOsmosis, envSecret } from "@/env";
import SecretAmount from "@/components/SecretAmount.vue";

const walletStore = useWalletStore();
const props = defineProps({
  displayLimit: {
    type: Number,
    default: 100,
    required: false,
  },
});
const isConnected = computed(() => walletStore.addresses[envSecret.chainId] && walletStore.addresses[envOsmosis.chainId]);
// state
const state = ref({
  searchQuery: "",
  balanceList: [],
  displayLimit: props.displayLimit,
  searchInput: ref<null | { focus: () => null }>(null),
});

// composables
let { balances } = useAssets();

const filteredBalanceList = computed(() => {
  if (!state.value.searchQuery) {
    return balances.value.assets.slice(0, state.value.displayLimit);
  }

  return balances.value.assets.filter((item) => {
    if (item.denom) {
      // Ugly as all hell hack.
      // This only works because function is called on user input and we're 99.999999% certain
      // useDenom for that denom has already been called on the root level through onUpdated in useAssets()
      // Will only fail if a component calls useAssets() but does not display anything related to the balances/does not redraw when balances are ready
      const base_denom = item.secretAddress ? item.denom : useDenom(item.denom, item.chainId).normalized.value;
      return base_denom.toLowerCase().includes(state.value.searchQuery.toLowerCase());
    } else {
      return false;
    }
  });
});

const noSearchResults = computed(() => {
  return !filteredBalanceList.value.length && state.value.searchQuery.length && !balances.value.isLoading;
});

const resetDisplayLimit = () => {
  state.value.displayLimit = props.displayLimit;
};

const resetSearch = () => {
  state.value.searchQuery = "";
  nextTick(() => state.value.searchInput?.focus());
};
const { searchQuery, displayLimit, searchInput } = toRefs(state.value);
</script>

<style lang="scss" scoped>
input[type="search"] {
  &::-webkit-search-decoration,
  &::-webkit-search-cancel-button,
  &::-webkit-search-results-button,
  &::-webkit-search-results-decoration {
    display: none;
    -webkit-appearance: none;
  }
}
</style>
