<template>
  <span>
    <label v-show="prefix" :for="id">{{ prefix }}</label>
    <input
      type="text"
      :id="id"
      tabindex="-1"
      :title="`${text}`"
      @focus="select"
      @click="select"
      :style="{
        width: width ? width : `${Math.max(11.5, autoWidth)}px`,
        height: 'px',
        outline: 'none',
        border: 0,
        margin: 0,
        textAlign: 'center',
        padding: 0,
        background: 'none',
        boxShadow: 'none',
        borderRadius: 0,
      }"
      readonly
      :value="formatted"
    />
    <label v-show="suffix" :style="{ marginLeft: '-3px' }" :for="id">{{ suffix }}</label>
  </span>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { getAutoWidth, prettyNumber } from "@/utils/prettyNumber";

function selectFn(text: any) {
  return function (this: any, event: any) {
    if (text && "" + text !== event.target.value) {
      const originalValue = event.target.value;
      event.target.value = text;
      // eslint-disable-next-line no-inner-declarations
      function fn(event: any) {
        event.target.value = originalValue;
        event.target.onblur = null;
      }
      (event.target as HTMLInputElement).onblur = fn;
    }
    event.target.select();
  };
}
const select = computed(() => selectFn(props.text));
const props = defineProps<{
  text?: string | number;
  prettyNumber?: string | number;
  suffix?: string;
  prefix?: string;
  width?: string;
}>();
const formatted = computed(() => {
  if (props.text === undefined) {
    return "";
  }
  return props.prettyNumber ? prettyNumber(+props.text, +props.prettyNumber!) : "" + props.text;
});
// const select = ref(selectFn(props.text));
const id = ref<string>("" + crypto.randomUUID());
const autoWidth = computed(() => {
  return getAutoWidth(formatted.value);
});
</script>

<style scoped></style>
