<template>
  <IgntTabs
    :tabHeaderClasses="['text-2xl', 'font-semibold', 'p-0', 'm-0', 'mb-2.5', 'flex-1']"
    :tabLinkClasses="['pr-4']"
    :inactiveLinkClasses="['text-gray-400']"
    :activeLinkClasses="['text-black']"
  >
    <div class="" tabTitle="Stake">
      <IgntSend v-if="isEnabled" />
      <MarketStatistics v-if="isEnabled" />
    </div>
    <div class="" tabTitle="Withdraw">
      <IgntWithdraw v-if="isEnabled" />
    </div>
  </IgntTabs>
</template>
<script setup lang="ts">
import { IgntTabs } from "@ignt/vue-library";
import { IgntQRCode } from "@ignt/vue-library";
import { IgntCard } from "@ignt/vue-library";
import { IgntClipboard } from "@ignt/vue-library";
import IgntSend from "./IgntSend.vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";
import MarketStatistics from "./MarketStatistics.vue";
import StakingInfo from "./StakingInfo.vue";
import UnbondingsInfo from "./UnbondingsInfo.vue";
import IgntWithdraw from "./IgntWithdraw.vue";

const walletProvider = useWalletStore();
const isEnabled = computed(
  () => !!walletProvider.secretAddress && !!walletProvider.secretJsClient && !!walletProvider.osmoClient && !!walletProvider.secretClient
);
</script>
