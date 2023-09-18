import { computed, onBeforeUpdate } from "vue";
import useCosmosBankV1Beta1 from "@/composables/useCosmosBankV1Beta1";
import { useDenom } from "./useDenom";
import { useWalletStore } from "@/stores/useWalletStore";
import type { Amount, BalanceAmount } from "@/utils/interfaces";
import { envOsmosis, envSecret } from "@/env";
import { useSecretAssetAmount } from "./useSecretAssetAmount";
import BigNumber from "bignumber.js";

export const useAssets = () => {
  // composables
  const walletStore = useWalletStore();
  const secretClient = walletStore.secretClient;
  const osmoClient = walletStore.osmoClient;
  const stkdSCRTContractAddress = "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4";
  const sSCRTContractAddress = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek";

  const { QueryBalance } = useCosmosBankV1Beta1(secretClient);
  const { QueryBalance: oQueryBalance } = useCosmosBankV1Beta1(osmoClient);
  const secretAddress = computed(() => walletStore.addresses[envSecret.chainId]);
  const osmoAddress = computed(() => walletStore.addresses[envOsmosis.chainId]);
  const enabled = computed(() => !!osmoAddress.value && !!secretAddress.value); // if useAssets is called with no wallet connected/no address actual query will be registered but never ran
  const secretQuery = computed(() =>
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
  const osmoQuery = computed(() =>
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
  const osmoSecretQuery = computed(() =>
    oQueryBalance(
      osmoAddress.value,
      { denom: "ibc/0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A" },
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
    return secretQuery.value.data?.value?.balance && [secretQuery.value.data?.value?.balance];
  });
  const balancesOsmo = computed(() => {
    return osmoQuery.value.data?.value?.balance && [osmoQuery.value.data?.value?.balance];
  });
  const balancesOsmoSCRT = computed(() => {
    return osmoSecretQuery.value.data?.value?.balance && [osmoSecretQuery.value.data?.value?.balance];
  });

  const stkdSCRTAssetAmount = useSecretAssetAmount(stkdSCRTContractAddress);
  const sSCRTAssetAmount = useSecretAssetAmount(sSCRTContractAddress);

  const balances = computed(() => {
    function parseAmount(amount: string) {
      return BigNumber(amount).dividedBy(10**6).toString();
    }

    return {
      assets: (
        ((balancesSecret.value as Amount[]) ?? []).map((x) => ({
          denom: x.denom,
          amount: x.amount,
          chainId: envSecret.chainId,
          isSecret: false,
          stakable: true,
        })) as BalanceAmount[]
      )
        .concat(
          ((balancesOsmoSCRT.value as Amount[]) ?? []).map((x) => ({
            denom: x.denom,
            amount: x.amount,
            chainId: envOsmosis.chainId,
            isSecret: false,
            stakable: true,
          })) as BalanceAmount[]
        )
        .concat([
          {
            denom: "stkd-SCRT",
            amount: stkdSCRTAssetAmount.amount.value,
            secretAddress: stkdSCRTContractAddress,
            chainId: envSecret.chainId,
            unstakable: true,
          },
          {
            denom: "sSCRT",
            amount: sSCRTAssetAmount.amount.value,
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
            isSecret: false,
            gas: true,
          })) as BalanceAmount[]
        ).map(d => ({
          ...d,
          amount: parseAmount(d.amount)
        })),
      isLoading: isLoading.value,
    };
  });
  const isLoading = computed(() => {
    return (
      secretQuery.value.isLoading.value ||
      osmoQuery.value.isLoading.value ||
      osmoSecretQuery.value.isLoading.value ||
      stkdSCRTAssetAmount.isLoading.value ||
      sSCRTAssetAmount.isLoading.value
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
