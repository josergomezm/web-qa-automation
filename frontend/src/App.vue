<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">QA Automation Tool</h1>
          </div>
          <div class="flex space-x-8">
            <router-link to="/" class="nav-link">Dashboard</router-link>
            <router-link to="/tests" class="nav-link">Tests</router-link>
            <router-link to="/config" class="nav-link">Configuration</router-link>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.nav-link {
  @apply inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent transition-colors;
}

.nav-link.router-link-active {
  @apply text-blue-600 border-blue-500;
}
</style>