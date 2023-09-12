import { useWalletStore } from "@/stores/useWalletStore";
import { computed } from "vue";

export default function () {
  const walletStore = useWalletStore();

  const connectToKeplr = async (
    onSuccessCb: () => void,
    onErrorCb: () => void
  ) => {
    try {
      walletStore
        .connectWithKeplr()
        .then(() => {
          onSuccessCb();
        })
        .catch(onErrorCb);
    } catch (e) {
      console.error(e);
      onErrorCb();
    }
  };

  const isKeplrAvailable = computed<boolean>(() => {
    return !!window.keplr;
  });

  const getOfflineSigner = (chainId: string) =>
    window.keplr.getOfflineSigner(chainId);

  const getKeplrAccParams = async (chainId: string) =>
    await window.keplr.getKey(chainId);

  const listenToAccChange = (cb: EventListener) => {
    window.addEventListener("keplr_keystorechange", (evt) => {
      cb(evt);
    });
  };

  return {
    connectToKeplr,
    isKeplrAvailable,
    getOfflineSigner,
    getKeplrAccParams,
    listenToAccChange,
  };
}
