import { useQuery } from "@tanstack/vue-query";

export default function useQueryStkdSecretInfo(client: any) {
    const QueryStkdSecretInfo = (options: any) => {
      const key = { type: "QueryStkdSecretInfo" };
      return useQuery(
        [key],
        () => {
          return client?.getSktdSecretInfo().then((res) => res);
        },
        options
      );
    };

    const QueryStakingFees = (options: any) => {
      const key = { type: "QueryStakingFees" };
      return useQuery(
        [key],
        () => {
          return client?.getStakingFees().then((res) => res);
        },
        options
      );
    };

    const QueryExchangeRate = (options: any) => {
      const key = { type: "QueryStkdSecretInfo" };
      return useQuery(
        [key],
        () => {
          return client?.getSktdSecretInfo().then((res) => res);
        },
        options
      );
    };
  
  
    return { QueryStkdSecretInfo, QueryStakingFees };
}
  