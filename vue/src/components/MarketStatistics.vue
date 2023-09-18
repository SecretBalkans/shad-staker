<template>
  <div>
    <div>Market Data</div>
    <div>
      {{marketData}}
    </div>
  </div>
</template>
<script setup lang="ts">
import useStkdSecretInfo from "@/composables/custom/useStkdSecretInfo";
import { useWalletStore } from "@/stores/useWalletStore";
import {computed} from "vue";

const walletStore = useWalletStore();

const computedSecretBalances = computed(() => useStkdSecretInfo(walletStore.secretJsClient)); //later pass the secret client from the wallet provider
const enabled = computed(() => !!walletStore.secretJsClient);
const stkdSecretInfoQuery = computed(() =>
  computedSecretBalances.value?.QueryStkdSecretInfo(
    {
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    }
  )
);

const marketData = computed(() => {
  const marketData = stkdSecretInfoQuery?.value?.data?.value?.["staking_info"]
  console.log("Market info: ", marketData)
  return marketData
})

</script>
