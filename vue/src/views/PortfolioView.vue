<template>
  <div>
    <div class="container mx-auto">
      <div class="grid grid-cols-2">
        <div>
          <IgntAssets
            :key="selectedAddress"
            class="px-2.5 mb-10"
            :display-limit="10"
          />
          <!--          <IgntTransactions :key="address" class="px-2.5" /> Commenting this to avoid constant api calls-->
        </div>
        <IgntTransfer class="px-2.5 w-4/6 mx-auto" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IgntAssets from "../components/IgntAssets.vue";
import IgntTransactions from "../components/IgntTransactions.vue";
import IgntTransfer from "../components/IgntTransfer.vue";
import { useWalletStore } from "@/stores/useWalletStore";
import { storeToRefs } from "pinia";

const { selectedAddress } = storeToRefs(useWalletStore());
</script>
