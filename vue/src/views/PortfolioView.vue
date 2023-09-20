<template>
  <div>
    <div class="w-11/12 px-0 mx-auto">
      <div class="grid grid-cols-9">
        <div class="col-span-3">
          <IgntAssets class="px-2.5 w-12/12 mb-10" :display-limit="100" />
          <!--          <IgntTransactions :key="address" class="px-2.5" /> Commenting this to avoid constant api calls-->
        </div>
        <IgntTransfer class="px-1.5 mx-auto w-10/12 col-span-6" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IgntAssets from "../components/IgntAssets.vue";
import IgntTransfer from "../components/IgntTransfer.vue";
</script>
