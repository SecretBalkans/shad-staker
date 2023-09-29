<template>
  <div>
    <div class="px-0 mx-auto" style="display: flex; justify-content: center; align-items: center">
      <div class="grid grid-cols-9">
        <div class="col-span-4">
          <IgntAssets class="px-2.5 w-12/12 mb-3" :display-limit="100" />
          <stake-route-history />
        </div>
        <div class="col-span-1"></div>
        <IgntTransfer class="mx-auto col-span-4" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IgntAssets from "../components/IgntAssets.vue";
import IgntTransfer from "../components/IgntTransfer.vue";
import StakeRouteHistory from "@/components/StakeRouteHistory.vue";
</script>
