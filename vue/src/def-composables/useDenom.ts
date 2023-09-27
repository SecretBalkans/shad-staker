import { computed, ref } from "vue";
import { useWalletStore } from "@/stores/useWalletStore";
import useIbcApplicationsTransferV1 from "@/composables/useIbcApplicationsTransferV1";

const useDenomInstances = {} as Record<string, ReturnType<typeof useDenomInstance>>;
const useDenomInstance = (denom: string, chainId: string) => {
  const isIBC = denom.indexOf("ibc/") == 0;
  const hash = denom.split("/")[1];
  /* let cacheKey = `denomTrace_${denom}`;
  const cached = window.localStorage.getItem(cacheKey);
  if (!!cached) {
    try {
      const parsed = JSON.parse(cached);
      const result = {
        isIBC,
        chainId,
        ...refEach(parsed)
      };
      return result;
    } catch (err) {

    }
  }*/
  const walletStore = useWalletStore();
  const { QueryDenomTrace } = useIbcApplicationsTransferV1(walletStore.activeClients[chainId]);
  const denomTrace = QueryDenomTrace(hash, {
    enabled: ref(isIBC /* && !cached*/),

    stale: Number.MAX_SAFE_INTEGER, // avoid re-fetching on redraw, focus, etc..
    cacheTime: Number.MAX_SAFE_INTEGER,
    refetchOnWindowFocus: false,
  }).data;
  const normalized = computed(() => {
    if (isIBC) {
      return denomTrace.value?.denom_trace?.base_denom /*?.toUpperCase()*/ ?? "";
    } else {
      return denom /*.toUpperCase()*/;
    }
  });
  const path = computed(() => {
    if (isIBC) {
      return denomTrace.value?.denom_trace?.path ?? "";
    } else {
      return "";
    }
  });

  const pathExtracted = computed(() => {
    if (isIBC) {
      return denomTrace.value?.denom_trace?.path?.match(/\d+/g)?.reverse() ?? "";
    } else {
      return "";
    }
  });

  const result = {
    isIBC,
    denomTrace,
    normalized,
    path,
    chainId,
    pathExtracted,
  };

  /*watch(() => result, () => {
    window.localStorage.setItem(cacheKey, JSON.stringify(unrefEach(result)));
  }, {
    deep: true
  });*/

  /*function refEach(obj: any) {
    const reffed = {};
    Object.keys(obj).forEach(key => {
      // @ts-ignore
      reffed[key] = ref(obj[key]);
    });
    return reffed;
  }

  function unrefEach(reffedObject: any) {
    const unreffed = {};
    Object.keys(reffedObject).forEach(key => {
      // @ts-ignore
      unreffed[key] = unref(reffedObject[key]);
    });
    return unreffed;
  }*/

  return result;
};
export const useDenom = (denom: string, chainId: string) => {
  if (!useDenomInstances[denom]) {
    useDenomInstances[denom] = useDenomInstance(denom, chainId);
  }
  return useDenomInstances[denom];
};
