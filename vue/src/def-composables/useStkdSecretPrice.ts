import useOracle from "@/composables/custom/useOracle";
let query: any;
export const useStkdSecretPrice = () => {
  if (!query) {
    const priceOracle = useOracle();
    query = priceOracle.QueryStkdSecretPrice({
      enabled: true,
      staleTime: 12000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });
  }

  return query.data;
};
