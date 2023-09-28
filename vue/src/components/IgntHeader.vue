<template>
  <header class="flex px-5 pt-2">
    <img src="ShadShade.png" width="80" alt="Logo" />
    <nav class="flex flex-1 justify-between">
      <ul class="flex items-center">
        <!-- <li class="text-3 px-4 font-normal" v-for="item in navItems" :key="item.label">
          <IgntLink :item="item"></IgntLink>
        </li> -->
      </ul>
      <div>
        <IgntAcc />
      </div>
    </nav>
  </header>
</template>
<script setup lang="ts">
import { ref, type PropType } from "vue";
import IgntAcc from "@/components/IgntAcc.vue";

type MenuItem = {
  label: string;
  to?: string;
  href?: string;
};
const props = defineProps({
  navItems: {
    type: Array as PropType<Array<MenuItem>>,
    required: true,
  },
});
const navItems = ref(props.navItems);
</script>
