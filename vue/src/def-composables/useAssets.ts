import { computed, onBeforeUpdate } from "vue";
import useCosmosBankV1Beta1 from "@/composables/useCosmosBankV1Beta1";
import { useDenom } from "./useDenom";
import { useWalletStore } from "@/stores/useWalletStore";
import type { Amount, BalanceAmount } from "@/utils/interfaces";
import { envOsmosis, envSecret } from "@/env";
import { getStkdSecretBalance } from "@/secret-client/SecretClient";
import useSecretQueryBalances from "@/composables/custom/useQuerySecretBalances";

export const useAssets = (
  perPage: number
) => {
  // composables
  const walletStore = useWalletStore();
  let secretClient = walletStore.secretClient;
  let osmoClient = walletStore.osmoClient;

  // let stkdSecretBalance: any
  // getStkdSecretBalance().then((res)=> {console.log("Res: ", res); stkdSecretBalance = res})
  // console.log("StkdSecretBalance: ", stkdSecretBalance)

  const { QuerySecretBalances } = useSecretQueryBalances(); //later pass the secret client from the wallet provider
  const { QueryAllBalances } = useCosmosBankV1Beta1(secretClient);
  const { QueryAllBalances: oQueryAllBalances } = useCosmosBankV1Beta1(osmoClient);
  let secretAddress = computed(() => walletStore.addresses[envSecret.chainId]);
  let osmoAddress = computed(() => walletStore.addresses[envOsmosis.chainId]);
  const enabled = computed(() => !!osmoAddress.value && !!secretAddress.value); // if useAssets is called with no wallet connected/no address actual query will be registered but never ran
  const secretBalancesQuery = computed(() => QuerySecretBalances(
    secretAddress.value,
    "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
    {
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true
    },
  ));
  const secretQuery = computed(() => QueryAllBalances(
    secretAddress.value,
    {},
    {
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true
    },
    perPage
  ));
  const osmoQuery = computed(() => oQueryAllBalances(
    osmoAddress.value,
    {},
    {
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true
    },
    perPage
  ));
  type HelperBalances = NonNullable<
    NonNullable<Required<typeof secretQuery.value.data>["value"]>["pages"][0]["balances"]
  >;
  const balancesSecret = computed(() => {
    return secretQuery.value.data?.value?.pages.reduce((bals, page) => {
      if (page.balances) {
        return bals.concat(page.balances);
      } else {
        return bals;
      }
    }, [] as HelperBalances);
  });
  const balancesOsmo = computed(() => {
    return osmoQuery.value.data?.value?.pages.reduce((bals, page) => {
      if (page.balances) {
        return bals.concat(page.balances);
      } else {
        return bals;
      }
    }, [] as HelperBalances);
  });
  const balancesStkdSecret = computed(() => {
    console.log("Secret balances: ", secretBalancesQuery.value.data.value)
    return secretBalancesQuery.value.data.value
  })
  const balances = computed(() => {
    return {
      assets: (((balancesSecret.value as Amount[]) ?? []).map((x) => ({
        denom: x.denom,
        amount: x.amount,
        chainId: envSecret.chainId,
        isSecret: false
      })) as BalanceAmount[]).concat(
        ((balancesOsmo.value as Amount[]) ?? []).map((x) => ({
          denom: x.denom,
          amount: x.amount,
          chainId: envOsmosis.chainId,
          isSecret: false
        })) as BalanceAmount[]).concat([{
          denom: "ustkdscrt",
          amount: balancesStkdSecret.value?.toString(),
          chainId: envSecret.chainId,
          isSecret: true
        }] as BalanceAmount[]),
      isLoading: isLoading.value
    };
  });
  const isLoading = computed(() => {
    return secretQuery.value.isLoading.value || osmoQuery.value.isLoading.value;
  });

  onBeforeUpdate(() => {
    if (balancesSecret.value && balancesSecret.value.length > 0) {
      balancesSecret.value.forEach((x: any) => {
        if (x.denom) useDenom(x.denom, envSecret.chainId);
      });
    }
    if (balancesOsmo.value && balancesOsmo.value.length > 0) {
      balancesOsmo.value.forEach((x: any) => {
        if (x.denom) useDenom(x.denom, envOsmosis.chainId);
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
    fetch: () => {
      if(secretQuery.value.hasNextPage) {
        secretQuery.value.fetchNextPage()
      }
      if(osmoQuery.value.hasNextPage) {
        osmoQuery.value.fetchNextPage()
      }
    },
    hasMore: secretQuery.value.hasNextPage || osmoQuery.value.hasNextPage
  };
};
