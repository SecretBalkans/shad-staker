<template>
  <span v-if="hasViewingKey">
    {{ new Intl.NumberFormat("en-GB").format(Number(amount)) }}
  </span>
  <ignt-button v-if="!hasViewingKey" @click="setViewingKey()">Viewing key</ignt-button>
</template>

<script lang="ts" setup>
import { IgntButton } from "@ignt/vue-library";
import { useWalletStore } from "@/stores/useWalletStore";
import {computed, onMounted, ref} from "vue";
import useSecretQueryBalances from "@/composables/custom/useQuerySecretBalances";
import { envSecret } from "@/env";
const props = defineProps({
  secretAddress: {
    type: String,
    default: "",
    required: true,
  },
});
const walletStore = useWalletStore();
const hasViewingKey = ref(false);
function updateViewingKey() {
  walletStore.secretJsClient?.getSecretViewingKey(props.secretAddress).then((vk) => {
    hasViewingKey.value = !!vk
  });
}
onMounted(() => {
  updateViewingKey();
});
function setViewingKey() {
  window.keplr.suggestToken(envSecret.chainId, props.secretAddress).then(updateViewingKey);
}
const enabled = computed(() => !!hasViewingKey.value); // if useAssets is called with no wallet connected/no address actual query will be registered but never ran
const computedSecretBalances = computed(() => useSecretQueryBalances(walletStore.secretJsClient)); //later pass the secret client from the wallet provider
const secretAddress = computed(() => walletStore.addresses[envSecret.chainId]);

const secretBalancesQuery = computed(() =>
  computedSecretBalances.value?.QuerySecretBalances(secretAddress.value, props.secretAddress, {
    enabled: enabled.value,
    staleTime: 12000,
    refetchInterval: 12000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
);
const amount = computed(() => {
  return secretBalancesQuery?.value?.data.value;
});
</script>
