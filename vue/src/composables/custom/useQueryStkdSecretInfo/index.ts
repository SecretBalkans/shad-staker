import { useQuery } from "@tanstack/vue-query";

export default function useQueryStkdSecretInfo(client: any) {
  const QueryStkdSecretInfo = (options: any) => {
    const key = { type: "QueryStkdSecretInfo" };
    return useQuery(
      [key],
      () => {
        return client?.getSktdSecretInfo().then((res: any) => res["staking_info"]);
      },
      options
    );
  };

  const QueryStakingFees = (options: any) => {
    const key = { type: "QueryStakingFees" };
    return useQuery(
      [key],
      () => {
        return client?.getStakingFees().then((res: any) => res["fee_info"]);
      },
      options
    );
  };

  const QueryUnbonding = (options: any) => {
    const key = { type: "QueryUnbonding" };
    return useQuery(
      [key],
      () => {
        return client?.getUnbonding().then((res: any) => res.unbonding);
      },
      options
    );
  };

  return { QueryStkdSecretInfo, QueryStakingFees, QueryUnbonding };
}
