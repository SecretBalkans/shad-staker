import { defineStore } from "pinia";
import { useClient } from "@/composables/useClient";
import { envOsmosis, envSecret } from "@/env";
import { IgniteClient } from "example-client-ts/client";

export const useWalletStore = defineStore("wallet", {
  state: () => {
    const secretClient = useClient(envSecret);
    const osmoClient = useClient(envOsmosis);
    //secret client
    return {
      /*wallets:
              (JSON.parse(
                window.localStorage.getItem("wallets") ?? "null"
              ) as Array<EncodedWallet>) || ([] as Array<EncodedWallet>),
            */
      // activeWallet: null as Nullable<Wallet>,
      // activeClient: null as Nullable<ReturnType<typeof useClient>>,
      // selectedAddress: "",
      authorized: false,
      backupState: true,
      // secretAddress: "" as string, // because of IDE issue included here to avoid TS errors
      // shortSecretAddress: "" as string, // because of IDE issue included here to avoid TS errors
      secretClient: secretClient,
      osmoClient: osmoClient,
      // gasPrice: "0.025uscrt",
      // wallets: null as Nullable<Record<string, Wallet>>,
      activeClients: {
        [envSecret.chainId]: secretClient,
        [envOsmosis.chainId]: osmoClient
      } as Record<string, ReturnType<typeof useClient>>,
      addresses: {
        [envSecret.chainId]: "",
        [envOsmosis.chainId]: ""
      } as Record<string, string>
    };
  },
  getters: {
    secretAddress(state): string | undefined {
      return state.addresses[envSecret.chainId];
    },
    shortSecretAddress(state) {
      // @ts-ignore because of IDE issue included here to avoid TS errors
      return `${state.secretAddress?.substring(
        0,
        10
        // @ts-ignore because of IDE issue included here to avoid TS errors
      )}...${state.secretAddress?.slice(-4)}`;
    }
    // getClient: (state) => state.activeClient,
    // getGasPrice: (state) => state.gasPrice,
    // getWallet: (state) => state.activeWallet,
    /*getPath: (state) => {
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
        },*/
    /*getNameAvailable: (state) => (name: string) => {
          return state.wallets.findIndex((x) => x.name == name) == -1;
        },*/
    /*getLastWallet: (state) => {
          if (state.activeWallet) {
            return state.activeWallet.name;
          } else {
            return window.localStorage.getItem("lastWallet");
          }
        },*/
    // getLoggedIn: (state) => state.activeClient !== null,
    /*getSigner: (state) => {
          if (state.activeClient) {
            return state.activeClient.signer;
          } else {
            return null;
          }
        },*/
  },
  actions: {
    signOut() {
      // this.selectedAddress = "";
      // this.activeClient?.removeSigner();
      // this.activeClient = null;
      // this.activeWallet = null;
      this.authorized = false;

      Object.keys(this.activeClients).forEach((chainId) =>
        this.activeClients[chainId].removeSigner()
      );
      Object.keys(this.addresses).forEach(
        (chainId) => (this.addresses[chainId] = "")
      );
    },
    async connectWithKeplr() {
      try {
        // const wallet: Wallet = {
        //   name: "Keplr Integration",
        //   mnemonic: null,
        //   HDpath: null,
        //   password: null,
        //   prefix: client.env.prefix,
        //   pathIncrement: null,
        //   accounts: [],
        // };
        await IgniteClient.enableKeplr(
          [envSecret, envOsmosis].map(({ chainId }) => chainId)
        );
        const setAddresses = async () => {
          await Promise.all(
            Object.keys(this.activeClients).map((chainId) =>
              (async () => {
                const client = this.activeClients[chainId];
                await client.useKeplr();
                if (client.signer) {
                  const [{ address: rawAddress }] =
                    await client.signer.getAccounts();
                  this.addresses[chainId] = rawAddress;
                  console.log(`Connected ${chainId}`)
                  // wallet.accounts.push({ address: rawAddress, pathIncrement: null });
                  // this.selectedAddress = rawAddress;
                } else {
                  this.addresses[chainId] = "";
                  // this.selectedAddress = "";
                }
              })()
            )
          );
        };

        await setAddresses();

        this.activeClients[envSecret.chainId].on("signer-changed", () => {
          setAddresses();
        });

        window.addEventListener("keplr_keystorechange", () => {
          setAddresses();
        });

        /* this.activeWallet = wallet;
        
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
                }*/

      } catch (e) {
        console.error(e);
      }
      this.storeWallets();
    },

    storeWallets() {
      // window.localStorage.setItem("wallets", JSON.stringify(this.wallets));
      this.backupState = false;
    }
  }
});
