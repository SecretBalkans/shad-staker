import { computed, onBeforeUnmount, onBeforeUpdate } from "vue";
import useCosmosBankV1Beta1 from "@/composables/useCosmosBankV1Beta1";
import { useDenom } from "./useDenom";
import { useWalletStore } from "@/stores/useWalletStore";
import type { Amount, BalanceAmount } from "@/utils/interfaces";
import { envOsmosis, envSecret } from "@/env";
import { useSecretAssetAmount } from "./useSecretAssetAmount";
import BigNumber from "bignumber.js";
import { sSCRTContractAddress, stkdSCRTContractAddress, scrtDenomOsmosis } from "@/utils/const";
let assets: any;
export const useAssets = () => {
  if (assets) {
    return assets;
  } else {
    assets = useAssetsInstance();
    return assets;
  }
};

const useAssetsInstance = () => {
  // composables
  const walletStore = useWalletStore();
  const secretClient = walletStore.secretClient;
  const osmoClient = walletStore.osmoClient;

  const { QueryBalance } = useCosmosBankV1Beta1(secretClient);
  const { QueryBalance: oQueryBalance } = useCosmosBankV1Beta1(osmoClient);
  const secretAddress = computed(() => walletStore.addresses[envSecret.chainId]);
  const osmoAddress = computed(() => walletStore.addresses[envOsmosis.chainId]);
  const enabled = computed(() => !!osmoAddress.value && !!secretAddress.value); // if useAssets is called with no wallet connected/no address actual query will be registered but never ran
  const secretQuery = computed(
    () =>
      secretAddress.value &&
      QueryBalance(
        secretAddress.value,
        {
          denom: "uscrt",
        },
        {
          enabled: enabled.value,
          staleTime: 12000,
          refetchInterval: 12000,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: true,
        }
      )
  );
  const osmoQuery = computed(
    () =>
      osmoAddress.value &&
      oQueryBalance(
        osmoAddress.value,
        { denom: "uosmo" },
        {
          enabled: enabled.value,
          staleTime: 12000,
          refetchInterval: 12000,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: true,
        }
      )
  );
  const osmoSecretQuery = computed(
    () =>
      osmoAddress.value &&
      oQueryBalance(
        osmoAddress.value,
        { denom: scrtDenomOsmosis },
        {
          enabled: enabled.value,
          staleTime: 12000,
          refetchInterval: 12000,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: true,
        }
      )
  );
  const balancesSecret = computed(() => {
    return secretQuery.value?.data?.value?.balance && [secretQuery.value.data?.value?.balance];
  });
  const balancesOsmo = computed(() => {
    return osmoQuery.value?.data?.value?.balance && [osmoQuery.value.data?.value?.balance];
  });
  const balancesOsmoSCRT = computed(() => {
    return osmoSecretQuery.value?.data?.value?.balance && [osmoSecretQuery.value.data?.value?.balance];
  });

  const stkdSCRTAssetAmount = computed(() =>
    !!secretAddress.value && !!walletStore.secretJsClient
      ? useSecretAssetAmount(stkdSCRTContractAddress, secretAddress.value, walletStore.secretJsClient)
      : null
  );
  const sSCRTAssetAmount = computed(() =>
    !!secretAddress.value && !!walletStore.secretJsClient
      ? useSecretAssetAmount(sSCRTContractAddress, secretAddress.value, walletStore.secretJsClient)
      : null
  );
  onBeforeUnmount(() => {
    stkdSCRTAssetAmount.value?.scope?.stop();
    sSCRTAssetAmount.value?.scope?.stop();
  });
  const balances = computed(() => {
    function parseAmount(amount: string) {
      return BigNumber(amount)
        .dividedBy(10 ** 6)
        .toString();
    }

    return {
      assets: (
        ((balancesSecret.value as Amount[]) ?? []).map((x) => ({
          denom: x.denom,
          amount: x.amount,
          chainId: envSecret.chainId,
          stakable: true,
        })) as BalanceAmount[]
      )
        .concat(
          ((balancesOsmoSCRT.value as Amount[]) ?? []).map((x) => ({
            denom: x.denom,
            amount: x.amount,
            chainId: envOsmosis.chainId,
            stakable: true,
          })) as BalanceAmount[]
        )
        .concat([
          {
            denom: "stkd-SCRT",
            amount: stkdSCRTAssetAmount.value?.value?.value?.data,
            secretAddress: stkdSCRTContractAddress,
            chainId: envSecret.chainId,
            unstakable: true,
          },
          {
            denom: "sSCRT",
            amount: sSCRTAssetAmount.value?.value?.value?.data,
            chainId: envSecret.chainId,
            secretAddress: sSCRTContractAddress,
            stakable: true,
          },
        ] as BalanceAmount[])
        .concat(
          ((balancesOsmo.value as Amount[]) ?? []).map((x) => ({
            denom: x.denom,
            amount: x.amount,
            chainId: envOsmosis.chainId,
            gas: true,
          })) as BalanceAmount[]
        )
        .map((d) => ({
          ...d,
          amount: parseAmount(d.amount),
        })),
      isLoading: isLoading.value,
    };
  });
  const isLoading = computed(() => {
    return (
      secretQuery.value?.isLoading?.value ||
      osmoQuery.value?.isLoading?.value ||
      osmoSecretQuery.value?.isLoading?.value ||
      stkdSCRTAssetAmount.value?.value?.value?.isLoading?.value ||
      sSCRTAssetAmount.value?.value?.value?.isLoading?.value
    );
  });

  onBeforeUpdate(() => {
    if (balancesSecret.value && balancesSecret.value.length > 0) {
      balancesSecret.value.forEach((x: any) => {
        if (x.denom && !x.secretAddress) useDenom(x.denom, envSecret.chainId);
      });
    }
    if (balancesOsmo.value && balancesOsmo.value.length > 0) {
      balancesOsmo.value.forEach((x: any) => {
        if (x.denom && !x.secretAddress) useDenom(x.denom, envOsmosis.chainId);
      });
    }
    if (balancesOsmoSCRT.value && balancesOsmoSCRT.value.length > 0) {
      balancesOsmoSCRT.value.forEach((x: any) => {
        if (x.denom && !x.secretAddress) useDenom(x.denom, envOsmosis.chainId);
      });
    }
  });

  /*const clientOsmosis = useClientGeneric(envOsmosis);
  const { address: addressOsmosis } = useAddressGeneric(clientOsmosis);
  const { QueryAllBalances: Query2 } = useQueryBalances();
  const query2 = Query2(
    clientOsmosis,
    addressOsmosis.value,
    {},
    { enabled: !!addressOsmosis.value },
    perPage
  );
  const balancesOsmoRaw = computed(() => {
    return query2.data?.value?.pages.reduce((bals, page) => {
      if (page.balances) {
        return bals.concat(page.balances);
      } else {
        return bals;
      }
    }, [] as HelperBalances);
  });
  console.log(
    "Balances Osmosis raw: ",
    balancesOsmoRaw.value,
    !!addressOsmosis.value
  );*/

  return {
    balances,
    isLoading,
  };
};
