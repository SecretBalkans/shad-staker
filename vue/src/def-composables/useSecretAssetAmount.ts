import { useViewingKey } from "@/def-composables/useViewingKey";
import useSecretQueryBalance from "@/composables/custom/useQuerySecretBalance";
import { effectScope, ref } from "vue";
const secretAssets: any = {};
export function useSecretAssetAmount(contractAddress: string, secretAddress: any, client: any) {
  const key = `${contractAddress}_${secretAddress}`;
  if (secretAssets[key]) {
    return secretAssets[key];
  } else {
    secretAssets[key] = useSecretAssetAmountInstance(contractAddress, secretAddress, client);
    return secretAssets[key];
  }
}
function useSecretAssetAmountInstance(contractAddress: string, secretAddress: any, client: any) {
  const scope = effectScope();
  const val = ref();
  scope.run(() => {
    const vk = useViewingKey(contractAddress);
    vk.updateViewingKey();
    const { QuerySecretBalance } = useSecretQueryBalance();

    val.value = QuerySecretBalance(secretAddress, contractAddress, client, {
      enabled: vk.hasViewingKey,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });
  });
  return {
    scope,
    value: val,
  };
}
