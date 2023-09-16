import useCosmosBaseTendermintV1Beta1 from "@/composables/useCosmosBaseTendermintV1Beta1";
import { envSecret } from "@/env";
import { computed, ref } from "vue";
import type { useClient } from "@/composables/useClient";

export const useConnectionStatus = (client: any) => {
  const query = useCosmosBaseTendermintV1Beta1(client);
  const nodeInfo = query.ServiceGetNodeInfo();
  const apiConnected = computed(() => !nodeInfo.error.value);
  const rpcConnected = ref(false);
  const rpcCheck = async () => {
    try {
      await fetch(envSecret.rpcURL);
      rpcConnected.value = true;
    } catch (e) {
      console.error(e);
      rpcConnected.value = false;
    } finally {
      setTimeout(rpcCheck, 10000);
    }
  };
  const wsConnected = computed(() => rpcConnected.value);
  rpcCheck();
  return { apiConnected, rpcConnected, wsConnected };
};
