<template>
  <svg class="icon" :class="[`icon--${size}`, `icon--${color}`, { 'icon--spin': spin }]" :style="{
    width: computedSize,
    height: computedSize,
    transform: `rotate(${rotate}deg) ${flipTransform}`,
    fill: customColor,
  }" :viewBox="viewBox" v-html="iconPath" />
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

interface Props {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  color?: string
  rotate?: number
  spin?: boolean
  flip?: 'horizontal' | 'vertical' | 'both'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'currentColor',
  rotate: 0,
  spin: false,
  flip: undefined,
})

// Tamaños predefinidos
const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

// Diccionario de iconos MDI
const mdiIcons = ref<any>({})

// Cargar iconos dinámicamente
onMounted(async () => {
  try {
    // Cargar solo los iconos necesarios
    const icons = await import('@mdi/js')
    // @ts-ignore
    mdiIcons.value = icons
  } catch (error) {
    console.error('Error loading MDI icons:', error)
  }
})

// Computed properties
const computedSize = computed(() => {
  return typeof props.size === 'number' ? `${props.size}px` : `${sizeMap[props.size]}px`
})

const flipTransform = computed(() => {
  if (!props.flip) return ''
  const transforms = {
    horizontal: 'scaleX(-1)',
    vertical: 'scaleY(-1)',
    both: 'scale(-1)',
  }
  return transforms[props.flip]
})

const iconPath = computed(() => {
  const iconName = props.name.replace(/^mdi-/, '').replace(/-([a-z])/g, (m, p1) => p1.toUpperCase())
  const mdiName = 'mdi' + iconName.charAt(0).toUpperCase() + iconName.slice(1)
  const iconData = mdiIcons.value[mdiName]
  return iconData ? `<path d="${iconData}"/>` : ''
})

const viewBox = computed(() => {
  // MDI icons use 24x24 viewBox
  return '0 0 24 24'
})

const customColor = computed(() => {
  // Mapear nombres de colores a variables CSS
  const colorMap: Record<string, string> = {
    primary: 'var(--primary)',
    secondary: 'var(--secondary)',
    success: 'var(--success)',
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--info)',
    light: 'var(--text-secondary)',
    dark: 'var(--text-primary)',
  }

  return colorMap[props.color] || props.color
})
</script>

<style scoped>
.icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  fill: currentColor;
  transition: all 0.2s ease;

  &.icon--spin {
    animation: spin 1s linear infinite;
  }

  &:not([fill]) {
    fill: currentColor;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
