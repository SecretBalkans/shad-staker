<template>
    <div>
      <div class="container mx-auto">
        <div class="mb-2">
          <span class="rounded bg-gray-400 p-2 text-white-1000 text-xl">Plan and Transaction</span>
        </div>
        <div class="grid grid-cols-2 border-2 border-black rounded">
          <div class="bg-gray-200 border-black border-2 rounded m-4">
            <div class="m-2">
              <span class="rounded bg-black p-2 text-white-1000 text-xl">SCRT Balances & Amounts</span>
            </div>
            <div class="">
              <div v-for="(item, index) in items" :key="index" class="grid grid-cols-3 mb-2 m-2">
                <div>{{ item.chain }}</div>
                <div>{{ item.amount }} SCRT</div>
                <div><input type="number" class="w-full"></div>
              </div>
            </div>
          </div>
          <div class="m-4">
            <div class="bg-black text-white-1000 p-2">
              <div class="text-xl">
                Execution plan
              </div>
              <div>
                Part A): 1. SN: Wrap 90 SCRT (10sec) -> 2. Swap 140 sSCRT for 99.571 stkdSCRT (10sec) <br/> <br/>
                Part B):  Osmosis: 1. 800 SCRT IBC to Secret Network (30sec) -> 
                SN: 2. Stake 700 SCRT for 568.18 stkdSCRT (10sec) 
                   -> 3. Wrap 100 SCRT (10sec) -> 4. Swap 100 SCRT for 71.119494 stkdSCRT (10sec)
              </div>
            </div>
            <div class="flex justify-center m-2">
              <button class="bg-red-600 rounded p-1 text-white-1000">
                Start plan
              </button>
            </div>
            <div class="bg-black text-white-1000 p-2">
              <div>
                Plan transaction history
              </div>
              <div>
                A) 
                  SN
                  1. Wrap 90 SCRT 8s
                  2. Swap 140 SCRT for 99.571 stkdSCRT 9s
                B)
                  3. Stake 700 SCRT for 568.18 stkdSCRT (...) 
                  4. Wrap 100 SCRT
                  5. Swap 100 SCRT for 71.119494 stkdSCRT
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useAddress } from "@/def-composables/useAddress";
  const { address } = useAddress();

  const items: any = [
    {
      chain: "Osmosis",
      amount: 1000,
    },
    {
      chain: "Secret",
      amount: 100,
    },
  ]

  </script>
  