<script setup>
import { computed } from 'vue'
import { NButton, NIcon } from 'naive-ui'

const props = defineProps({
  text: String,
  icon: [Function, Object],
  bgColor: String,
  textColor: {
    type: String,
    default: '#000'
  },
  iconColor: String,
  size: {
    type: String,
    default: 'small'
  },
  iconOnly: {
    type: Boolean,
    default: false
  }
})

const mergedIconColor = computed(() => {
  return props.iconColor || props.textColor
})

const buttonStyle = computed(() => ({
  backgroundColor: props.bgColor,
  color: props.textColor,
  border: 'none',
  width: props.iconOnly ? '28px' : undefined,
  minWidth: props.iconOnly ? '28px' : undefined,
  padding: props.iconOnly ? '0' : undefined
}))
</script>

<template>
  <n-button
    :size="size"
    class="pill-btn"
    :style="buttonStyle"
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
  padding: 0 6px;
}

.pill-icon :deep(svg) {
  fill: currentColor;
  stroke: currentColor;
  font-size: 14px;
}

.pill-text {
  white-space: nowrap;
}
</style>
