<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <nav class="elegant-nav">
      <div class="nav-container">
        <RouterLink to="/" class="nav-link">
          <span class="link-icon">🏠</span>
          <span class="link-text">Inicio</span>
        </RouterLink>
        <RouterLink to="/buys" class="nav-link">
          <span class="link-icon">🛒</span>
          <span class="link-text">Compras</span>
        </RouterLink>
        <RouterLink to="/drive" class="nav-link">
          <span class="link-icon">☁️</span>
          <span class="link-text">Google Drive</span>
        </RouterLink>
      </div>
    </nav>

    <main class="content-wrapper">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.elegant-nav {
  background: linear-gradient(135deg, #2c3e50 0%, #4a6491 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-2px);
}

.nav-link.router-link-exact-active {
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
}

.nav-link.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 50%;
  height: 2px;
  background-color: #42b983;
  border-radius: 2px;
}

.link-icon {
  font-size: 1.1em;
}

.link-text {
  position: relative;
  top: 1px;
}

.content-wrapper {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 2rem;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 1rem;
    gap: 0.5rem;
    justify-content: space-around;
  }

  .nav-link {
    padding: 0.5rem;
    font-size: 0.9rem;
    flex-direction: column;
    gap: 0.2rem;
  }

  .nav-link.router-link-exact-active::after {
    bottom: -4px;
  }

  .link-icon {
    font-size: 1.2em;
  }

  .link-text {
    font-size: 0.7rem;
    top: 0;
  }

  .content-wrapper {
    padding: 0 1rem;
    margin: 1rem auto;
  }
}
</style>
