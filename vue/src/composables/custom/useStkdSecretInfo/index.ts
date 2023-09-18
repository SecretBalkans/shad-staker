import { useQuery } from "@tanstack/vue-query";

export default function useStkdSecretInfo(client: any) {
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
  
    return { QueryStkdSecretInfo };
}
  