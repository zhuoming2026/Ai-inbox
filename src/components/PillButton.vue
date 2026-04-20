<script setup>
import { computed } from 'vue'
import { NButton, NIcon } from 'naive-ui'

const props = defineProps({
  text: String,
  icon: Function,
  bgColor: String,
  textColor: {
    type: String,
    default: '#fff'
  },
  iconColor: String,
  size: {
    type: String,
    default: 'small'
  }
})

const mergedIconColor = computed(() => {
  return props.iconColor || props.textColor
})
</script>

<template>
  <n-button
    :size="size"
    class="pill-btn"
    :style="{
      backgroundColor: bgColor,
      color: textColor,
      border: 'none'
    }"
  >
    <span v-if="text" class="pill-text">
      {{ text }}
    </span>

    <n-icon
      v-if="icon"
      class="pill-icon"
      :style="{ color: mergedIconColor }"
    >
      <component :is="icon" />
    </n-icon>
  </n-button>
</template>

<style scoped>
.pill-btn {
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
}

.pill-icon :deep(svg) {
  fill: currentColor;
  stroke: currentColor;
}

.pill-text {
  white-space: nowrap;
}
</style>
