import { computed, ref } from "vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { envSecret } from "@/env";

const byAddress = {} as Record<string, any>;
export const useViewingKey = (contractAddress: string): { hasViewingKey: any; updateViewingKey: () => any; setViewingKey: () => any } => {
  if (byAddress[contractAddress]) {
    return byAddress[contractAddress];
  }
  const hasViewingKey = ref(false);
  const walletStore = useWalletStore();
  byAddress[contractAddress] = {
    hasViewingKey: computed(() => hasViewingKey.value),
    updateViewingKey() {
      walletStore.secretJsClient
        ?.getSecretViewingKey(contractAddress)
        .then((vk) => {
          hasViewingKey.value = !!vk;
        })
        .catch(() => {});
    },
    setViewingKey() {
      window.keplr.suggestToken(envSecret.chainId, contractAddress).then(this.updateViewingKey);
    },
  };
  return byAddress[contractAddress];
};
