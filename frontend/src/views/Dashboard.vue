<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="border-4 border-dashed border-gray-200 rounded-lg p-8">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">QA Automation Dashboard</h2>
        <p class="text-gray-600 mb-8">Create and manage your automated web tests with natural language descriptions.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Total Tests</h3>
            <p class="text-3xl font-bold text-blue-600">{{ testStore.tests.length }}</p>
          </div>
          
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Passed Tests</h3>
            <p class="text-3xl font-bold text-green-600">{{ passedTests }}</p>
          </div>
          
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Failed Tests</h3>
            <p class="text-3xl font-bold text-red-600">{{ failedTests }}</p>
          </div>
        </div>
        
        <div class="space-x-4">
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create New Test
          </button>
          
          <router-link 
            to="/tests" 
            class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            View Tests
          </router-link>
        </div>
      </div>
    </div>

    <!-- Create Test Modal -->
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
import { useConfigStore } from '@/stores/config'
import CreateTestModal from '@/components/CreateTestModal.vue'

const router = useRouter()
const testStore = useTestStore()
const configStore = useConfigStore()

const showCreateModal = ref(false)

const passedTests = computed(() => 
  testStore.results.filter(r => r.status === 'passed').length
)

const failedTests = computed(() => 
  testStore.results.filter(r => r.status === 'failed').length
)

const handleTestCreated = (testId: string) => {
  router.push(`/tests/${testId}/results`)
}

onMounted(() => {
  configStore.loadConfig()
  testStore.getTestResults()
  testStore.getAllTests()
})
</script>