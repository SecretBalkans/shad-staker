import { computed, onBeforeUpdate } from "vue";
import useCosmosBankV1Beta1 from "@/composables/useCosmosBankV1Beta1";
import { useDenom } from "./useDenom";
import { useWalletStore } from "@/stores/useWalletStore";
import type {Amount} from "@/utils/interfaces";

export const useAssets = (perPage: number) => {
  // composables
  const walletStore = useWalletStore();
  const { QueryAllBalances } = useCosmosBankV1Beta1();
  const enabled = computed(() => walletStore.selectedAddress != ""); // if useAssets is called with no wallet connected/no address actual query will be registered but never ran
  const query = QueryAllBalances(
    walletStore.selectedAddress,
    {},
    {
      enabled: enabled.value,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: true,
    },
    perPage
  );
  type HelperBalances = NonNullable<
    NonNullable<
      Required<typeof query.value.data>["value"]
    >["pages"][0]["balances"]
  >;
  const balancesRaw = computed(() => {
    return query.data?.value?.pages.reduce((bals, page) => {
      if (page.balances) {
        return bals.concat(page.balances);
      } else {
        return bals;
      }
    }, [] as HelperBalances);
  });
  const balances = computed(() => {
    return {
      assets: balancesRaw.value as Amount[] ?? [],
      isLoading: query.isLoading.value,
    };
  });
  const isLoading = computed(() => {
    return query.isLoading.value;
  });

  console.log(
    "Balances Secret(default) raw: ",
    balances?.value?.assets,
    enabled
  );
  onBeforeUpdate(() => {
    if (balancesRaw.value && balancesRaw.value.length > 0) {
      balancesRaw.value.forEach((x: any) => {
        if (x.denom) useDenom(x.denom);
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
    balancesRaw,
    balances,
    isLoading,
    fetch: query.fetchNextPage,
    hasMore: query.hasNextPage,
  };
};
