<template>
  <span v-if="vk.hasViewingKey.value">
    <span v-if="Number.isNaN(Number(amount))" class="text-sm"> Loading... </span>
    <span v-else>
      {{ amount }}
    </span>
  </span>
  <ignt-button
    style="padding: 0.35rem !important; height: 2rem !important"
    class="text-xs min-w-fit"
    v-if="!vk.hasViewingKey.value"
    @click="vk.setViewingKey()"
    >View balance</ignt-button
  >
</template>

<script lang="ts" setup>
import { IgntButton } from "@ignt/vue-library";
import { computed } from "vue";
import { useViewingKey } from "@/def-composables/useViewingKey";

const props = defineProps({
  secretAddress: {
    type: String,
    default: "",
    required: true,
  },
  amount: {
    type: String,
    default: "NaN",
    required: true,
  },
});
const vk = computed(() => {
  const vk = useViewingKey(props.secretAddress);
  vk.updateViewingKey();
  return vk;
});
</script>
