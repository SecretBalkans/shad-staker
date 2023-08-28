import { useInfiniteQuery } from '@tanstack/vue-query';

export default function useQuerySecretBalances() {
    const QueryAllBalances = (client: any, address: string, query: any, options: any, perPage: number) => {
        const key = { type: 'QueryAllBalances',  address, query };    
        return useInfiniteQuery([key], ({pageParam = 1}: { pageParam?: number}) => {
            const { address,query } = key
            query['pagination.limit']=perPage;
            query['pagination.offset']= (pageParam-1)*perPage;
            query['pagination.count_total']= true;
            return  client.CosmosBankV1Beta1.query.queryAllBalances(address, query ?? undefined).then( (res: any) => ({...res.data,pageParam}) );
            }, {
                ...options,
                getNextPageParam: (lastPage, allPages) => { if ((lastPage.pagination?.total ?? 0) >((lastPage.pageParam ?? 0) * perPage)) {return lastPage.pageParam+1 } else {return undefined}},
                getPreviousPageParam: (firstPage, allPages) => { if (firstPage.pageParam==1) { return undefined } else { return firstPage.pageParam-1}}
            }
        );
    }

    return {QueryAllBalances}
}