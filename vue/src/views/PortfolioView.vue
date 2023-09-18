<template>
  <div>
    <div class="container mx-auto">
      <div class="grid grid-cols-2">
        <div>
          <IgntAssets class="px-2.5 mb-10" :display-limit="100" />
          <!--          <IgntTransactions :key="address" class="px-2.5" /> Commenting this to avoid constant api calls-->
        </div>
        <IgntTransfer class="px-1.5 w-6/6 mx-auto" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IgntAssets from "../components/IgntAssets.vue";
import IgntTransfer from "../components/IgntTransfer.vue";
</script>
