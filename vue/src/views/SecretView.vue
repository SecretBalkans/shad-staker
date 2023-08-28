<template>
    <div>
      <div class="container mx-auto">
        <div class="grid grid-cols-2">
          <div>
            SCRT Balances & Amounts
          </div>
          <div>
            <div>
                Execution plan
            </div>
            <div>
                Plan transaction history
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useAddress } from "@/def-composables/useAddress";
  const { address } = useAddress();
  </script>
  