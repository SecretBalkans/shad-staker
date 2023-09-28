<template>
  <h2 class="text-2xl text-black font-semibold p-0 m-0 mb-2.5 flex-1">Stake route history</h2>
  <div class="flex flex-row pt-2 w-12/12 max-w-full">
    <div role="status" class="w-100 animate-pulse flex flex-col" v-if="isLoading">
      <div class="flex flex-row justify-between py-7 items-center flex-1" v-for="n in 3" :key="'loading-skel-' + n">
        <div class="flex flex-1 items-center">
          <div class="w-8 h-8 mr-4 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div class="h-6 bg-gray-200 rounded-lg dark:bg-gray-700 w-20"></div>
        </div>
        <div class="h-6 bg-gray-200 rounded-lg dark:bg-gray-700 w-40 -mr-2"></div>
      </div>
      <span class="sr-only">Loading...</span>
    </div>
    <div v-if="!isLoading" class="max-h-80 h-full overflow-auto w-full">
      <div class="flex flex-col mt-1.5 pb-3.5" v-for="fsm in history" :key="fsm.time">
        <span
          class="text-xs pb-1 pt-1 w-fit px-4"
          style="margin: 0 auto; border-bottom: 1px solid lightgray; border-top: 1px solid lightgray"
          >{{ new Date(fsm.time).toLocaleString().replace(",", " ") }}</span
        >
        <span class="text-xs pt-1.5 flex-row justify-center items-center" style="margin: 0 auto">
          <StakeRoute :fsm="fsm.fsm" :stopped="true"></StakeRoute>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import StakeRoute from "@/components/StakeRoute.vue";
import { PERSISTENCE_HISTORY_KEY } from "@/utils/const";
import { onBeforeMount, ref } from "vue";
import { State } from "xstate";
const isLoading = ref(true);
const history = ref([]);
const loadHistory = () => {
  try {
    history.value = JSON.parse(localStorage.getItem(PERSISTENCE_HISTORY_KEY) || "[]").map((persisted: any) => {
      let machine = State.create(persisted.fsm);
      return {
        fsm: machine,
        time: persisted.time,
      };
    });
  } catch (e) {
    console.error("Error loading history", e);
  }
  setTimeout(loadHistory, 5000);
};

onBeforeMount(() => {
  setTimeout(() => {
    isLoading.value = false;
  }, Math.random() * 500 + 100);
  loadHistory();
});
</script>

<style scoped></style>
