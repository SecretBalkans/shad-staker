<script setup lang="ts">
import { RouterView } from "vue-router";
import IgntHeader from "./components/IgntHeader.vue";

const items = [
  {
    label: "Portfolio",
    to: "/",
  },
];
</script>

<template>
  <IgntHeader :nav-items="items"></IgntHeader>
  <RouterView />
</template>
