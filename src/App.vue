<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav style="padding: 1em; background: #f5f5f5;">
    <RouterLink to="/" style="margin-right: 1em;">Inicio</RouterLink>
    <RouterLink to="/buys">Compras</RouterLink>
  </nav>
  <RouterView />
</template>
