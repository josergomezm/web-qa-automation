<template>
  <div id="app" class="min-h-screen bg-cream">
    <nav class="bg-surface border-b border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="font-serif text-xl text-heading">QA Automation</h1>
          </div>
          <div class="flex items-center space-x-8">
            <router-link to="/" class="nav-link">Dashboard</router-link>
            <router-link to="/tests" class="nav-link">Tests</router-link>
            <router-link to="/groups" class="nav-link">Groups</router-link>
            <router-link to="/config" class="nav-link">Configuration</router-link>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.nav-link {
  @apply font-sans text-[11px] uppercase tracking-[1.5px] font-semibold text-secondary transition-colors duration-200 border-b-2 border-transparent py-5;
}

.nav-link:hover {
  @apply text-heading;
}

.nav-link.router-link-active {
  @apply text-primary border-primary;
}
</style>
