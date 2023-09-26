import { useQuery } from "@tanstack/vue-query";

export default function useOracle() {
  const QuerySecretPrice = (options: any) => {
    const key = { type: "QuerySecretPrice" };
    return useQuery(
      [key],
      () => {
        return fetch("https://api.coingecko.com/api/v3/coins/stkd-scrt", {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((data) => {
            return data?.market_data?.current_price?.usd;
          })
          .catch((error) => {
            console.error("Fetch error:", error);
          });
      },
      options
    );
  };

  return { QueryStkdSecretPrice: QuerySecretPrice };
}
