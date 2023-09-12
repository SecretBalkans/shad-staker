import CryptoJS from "crypto-js";
import { defineStore } from "pinia";
import { useClient } from "@/composables/useClient";
import type { Wallet, Nullable, EncodedWallet } from "@/utils/interfaces";
import { envOsmosis, envSecret } from "@/env";

export const useWalletStore = defineStore("wallet", {
  state: () => ({
    wallets:
      (JSON.parse(
        window.localStorage.getItem("wallets") ?? "null"
      ) as Array<EncodedWallet>) || ([] as Array<EncodedWallet>),
    activeWallet: null as Nullable<Wallet>,
    activeClient: null as Nullable<ReturnType<typeof useClient>>,
    selectedAddress: "",
    authorized: false,
    backupState: true,
    gasPrice: "0.025uscrt",
  }),
  getters: {
    getClient: (state) => state.activeClient,
    getGasPrice: (state) => state.gasPrice,
    getWallet: (state) => state.activeWallet,
    getAddress: (state) => state.selectedAddress,
    getShortAddress: (state) =>
      `${state.selectedAddress.substring(
        0,
        10
      )}...${state.selectedAddress.slice(-4)}`,
    getPath: (state) => {
      if (state.activeWallet && state.activeWallet.HDpath) {
        return (
          state.activeWallet.HDpath +
          state.activeWallet.accounts.find(
            (x) => x.address == state.selectedAddress
          )?.pathIncrement
        );
      } else {
        return null;
      }
    },
    getNameAvailable: (state) => (name: string) => {
      return state.wallets.findIndex((x) => x.name == name) == -1;
    },
    getLastWallet: (state) => {
      if (state.activeWallet) {
        return state.activeWallet.name;
      } else {
        return window.localStorage.getItem("lastWallet");
      }
    },
    getLoggedIn: (state) => state.activeClient !== null,
    getSigner: (state) => {
      if (state.activeClient) {
        return state.activeClient.signer;
      } else {
        return null;
      }
    },
  },
  actions: {
    signOut() {
      this.selectedAddress = "";
      this.activeClient?.removeSigner();
      this.activeClient = null;
      this.activeWallet = null;
      this.authorized = false;
    },
    async connectWithKeplr() {
      const client = useClient(envSecret);
      const oClient = useClient(envOsmosis);
      try {
        const wallet: Wallet = {
          name: "Keplr Integration",
          mnemonic: null,
          HDpath: null,
          password: null,
          prefix: client.env.prefix,
          pathIncrement: null,
          accounts: [],
        };
        console.log("Before useKeplr call: ", client);
        await client.useKeplr();

        const setAddress = async () => {
          if (client.signer) {
            const [{ address: rawAddress }] = await client.signer.getAccounts();
            wallet.accounts.push({ address: rawAddress, pathIncrement: null });
            this.selectedAddress = rawAddress;
          } else {
            this.selectedAddress = "";
          }
        };
        client.on("signer-changed", () => {
          setAddress();
        });
        window.addEventListener("keplr_keystorechange", () => {
          setAddress();
        });

        await setAddress();

        this.activeWallet = wallet;

        if (
          this.activeWallet &&
          this.activeWallet.name &&
          this.activeWallet.password
        ) {
          this.wallets.push({
            name: this.activeWallet.name,
            wallet: CryptoJS.AES.encrypt(
              JSON.stringify(this.activeWallet),
              this.activeWallet.password
            ).toString(),
          });
        }
        if (
          this.activeWallet.name == "Keplr Integration" &&
          !this.activeWallet.password
        ) {
          this.wallets.push({
            name: this.activeWallet.name,
            wallet: JSON.stringify(this.activeWallet),
          });
        }

        this.activeClient = client;
      } catch (e) {
        console.error(e);
      }
      this.storeWallets();
    },

    storeWallets() {
      window.localStorage.setItem("wallets", JSON.stringify(this.wallets));
      this.backupState = false;
    },
  },
});
