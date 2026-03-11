<template>
  <div class="space-y-8">
    <div>
      <h2 class="font-serif text-3xl text-heading">Dashboard</h2>
      <p class="text-secondary mt-2">Create and manage your automated web tests.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface p-6 rounded-card shadow-card border border-border">
        <p class="section-label mb-2">Total Tests</p>
        <p class="text-3xl font-bold text-heading">{{ testStore.tests.length }}</p>
      </div>

      <div class="bg-surface p-6 rounded-card shadow-card border border-border">
        <p class="section-label mb-2">Passed Results</p>
        <p class="text-3xl font-bold text-success">{{ passedTests }}</p>
      </div>

      <div class="bg-surface p-6 rounded-card shadow-card border border-border">
        <p class="section-label mb-2">Failed Results</p>
        <p class="text-3xl font-bold text-danger">{{ failedTests }}</p>
      </div>
    </div>

    <div class="flex items-center space-x-4">
      <button
        @click="showCreateModal = true"
        class="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-button hover:bg-primary-hover transition-colors duration-200"
      >
        Create New Test
      </button>

      <router-link
        to="/tests"
        class="px-6 py-3 bg-surface border border-border text-heading text-sm font-medium rounded-button hover:border-border-hover transition-colors duration-200"
      >
        View Tests
      </router-link>
    </div>

    <CreateTestModal
      :is-open="showCreateModal"
      @close="showCreateModal = false"
      @test-created="handleTestCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { useResultStore } from '@/stores/results'
import { useConfigStore } from '@/stores/config'
import CreateTestModal from '@/components/CreateTestModal.vue'

const router = useRouter()
const testStore = useTestStore()
const resultStore = useResultStore()
const configStore = useConfigStore()

const showCreateModal = ref(false)

const passedTests = computed(() =>
  resultStore.results.filter(r => r.status === 'passed').length
)

const failedTests = computed(() =>
  resultStore.results.filter(r => r.status === 'failed').length
)

const handleTestCreated = (testId: string) => {
  router.push(`/tests/${testId}/results`)
}

onMounted(() => {
  configStore.loadConfig()
  resultStore.fetchResults()
  testStore.fetchTests()
})
</script>
