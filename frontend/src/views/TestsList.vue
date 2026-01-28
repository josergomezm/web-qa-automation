<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <h2 class="text-2xl font-bold text-gray-900">Tests</h2>
        <div class="flex rounded-md shadow-sm">
          <button @click="viewMode = 'active'" :class="[
            'px-4 py-2 text-sm font-medium border',
            viewMode === 'active'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]" class="rounded-l-md">
            Active ({{ activeTestsCount }})
          </button>
          <button @click="viewMode = 'archived'" :class="[
            'px-4 py-2 text-sm font-medium border-t border-b border-r',
            viewMode === 'archived'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]" class="rounded-r-md">
            Archived ({{ archivedTestsCount }})
          </button>
        </div>
      </div>
      <button @click="showCreateModal = true"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Create New Test
      </button>
    </div>

    <div v-if="testStore.error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">{{ testStore.error }}</p>
    </div>

    <div v-if="testStore.loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading tests...</p>
    </div>

    <div v-else-if="displayedTests.length === 0" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
        </path>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No {{ viewMode }} tests found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ viewMode === 'active' ? 'Get started by creating your first test.' : 'No archived tests yet.' }}
      </p>
      <div v-if="viewMode === 'active'" class="mt-6">
        <button @click="showCreateModal = true"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Create Test
        </button>
      </div>
    </div>

    <div v-else class="grid gap-6">
      <div v-for="test in displayedTests" :key="test.id" :class="[
        'bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col',
        test.archived ? 'opacity-75' : ''
      ]">
        <!-- Card Body -->
        <div class="px-6 py-5 flex-1">
          <!-- Header: Title and Date -->
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-bold text-gray-900 leading-tight">
              {{ test.name || `Test #${test.id.slice(-8)}` }}
            </h3>
            <span class="text-xs text-gray-500 whitespace-nowrap ml-4">
              {{ formatDate(test.createdAt) }}
            </span>
          </div>

          <!-- Metadata Pills Row -->
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              {{ test.aiModel }}
            </span>
            <span v-if="test.isReusable"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
              </svg>
              Reusable
            </span>
            <span v-if="test.prerequisiteTests && test.prerequisiteTests.length > 0"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1">
                </path>
              </svg>
              Prerequisites: {{ test.prerequisiteTests.length }}
            </span>
            <span v-if="test.cachedSteps && test.cachedSteps.length > 0"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200"
              title="This test has cached steps">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z">
                </path>
              </svg>
              Cached
            </span>
            <span class="text-xs text-gray-400">|</span>
            <span class="text-xs text-gray-600 truncate max-w-xs" :title="test.baseUrl">
              {{ test.baseUrl }}
            </span>
          </div>

          <!-- Description -->
          <p class="text-sm text-gray-700 mb-4">{{ test.description }}</p>

          <!-- Details Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 rounded-md p-3 border border-gray-100">
            <div v-if="test.credentials">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Credentials</span>
              <span class="text-gray-800">{{ test.credentials.username }}</span>
            </div>
            <div v-if="test.formInputs && Object.keys(test.formInputs).length > 0">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Form Data</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <div v-for="(value, key) in test.formInputs" :key="key" class="text-gray-600">
                  <span class="font-medium text-gray-700">{{ key }}:</span> {{ value }}
                </div>
              </div>
            </div>
            <div v-if="test.prerequisiteTests && test.prerequisiteTests.length > 0" class="col-span-full">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Prerequisite
                Tests</span>
              <div class="flex flex-wrap gap-2">
                <div v-for="prereqId in test.prerequisiteTests" :key="prereqId"
                  class="flex items-center space-x-1 text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                  <span class="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  <span>{{ getTestDescription(prereqId) || `#${prereqId.slice(-8)}` }}</span>
                </div>
              </div>
            </div>
            <div v-if="test.expectedOutcomes && test.expectedOutcomes.length > 0" class="col-span-full">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Expected
                Outcomes</span>
              <ul class="list-disc list-inside text-gray-600 space-y-0.5">
                <li v-for="outcome in test.expectedOutcomes" :key="outcome">{{ outcome }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Footer: Tags and Actions -->
        <div
          class="bg-gray-50 px-6 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <!-- Tags -->
          <div class="flex flex-wrap gap-1 w-full sm:w-auto">
            <template v-if="test.tags && test.tags.length > 0">
              <span v-for="tag in test.tags" :key="tag"
                class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                {{ tag }}
              </span>
              <button @click="editTest(test)"
                class="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                title="Edit tags">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                  </path>
                </svg>
              </button>
            </template>
            <button v-else @click="editTest(test)"
              class="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors border border-dashed border-gray-300">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add tags
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <!-- Primary Actions -->
            <button v-if="!test.archived" @click="runTest(test.id)" :disabled="testStore.loading"
              class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z">
                </path>
              </svg>
              Run
            </button>

            <button @click="viewResults(test.id)"
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                </path>
              </svg>
              Results
            </button>

            <!-- Secondary Actions (Icon Only) -->
            <div class="h-6 w-px bg-gray-300 mx-1"></div>

            <button v-if="!test.archived && test.cachedSteps && test.cachedSteps.length > 0"
              @click="clearCache(test.id)" :disabled="testStore.loading"
              class="p-1.5 border border-transparent text-purple-600 hover:bg-purple-50 rounded disabled:opacity-50 transition-colors"
              title="Clear cached steps">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
              </svg>
            </button>

            <button @click="editTest(test)" :disabled="testStore.loading"
              class="p-1.5 border border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
              title="Edit Test">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                </path>
              </svg>
            </button>

            <button @click="test.archived ? unarchiveTest(test.id) : archiveTest(test.id)" :disabled="testStore.loading"
              :class="[
                'p-1.5 border border-transparent rounded disabled:opacity-50 transition-colors',
                test.archived ? 'text-blue-600 hover:bg-blue-50' : 'text-orange-600 hover:bg-orange-50'
              ]" :title="test.archived ? 'Unarchive' : 'Archive'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="test.archived" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 8l6 6m0 0l6-6m-6 6V3"></path>
              </svg>
            </button>

            <button @click="confirmDeleteTest(test)" :disabled="testStore.loading"
              class="p-1.5 border border-transparent text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
              title="Delete Test">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Create Test Modal -->
      <CreateTestModal :is-open="showCreateModal" @close="showCreateModal = false" @test-created="handleTestCreated" />

      <!-- Edit Test Modal -->
      <EditTestModal :is-open="showEditModal" :test="selectedTest" @close="handleModalClose" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { useConfigStore } from '@/stores/config'
import CreateTestModal from '@/components/CreateTestModal.vue'
import EditTestModal from '@/components/EditTestModal.vue'

const router = useRouter()
const testStore = useTestStore()
const configStore = useConfigStore()

const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedTestId = ref<string | null>(null)

// Computed property to get the current test object from the store
const selectedTest = computed(() => {
  if (!selectedTestId.value) return null
  return testStore.tests.find(t => t.id === selectedTestId.value) || null
})

const viewMode = ref<'active' | 'archived'>('active')
const archivedTests = ref<any[]>([])

const displayedTests = computed(() => {
  if (viewMode.value === 'active') {
    return testStore.tests.filter(test => !test.archived)
  } else {
    return archivedTests.value
  }
})

const activeTestsCount = computed(() =>
  testStore.tests.filter(test => !test.archived).length
)

const archivedTestsCount = computed(() =>
  archivedTests.value.length
)

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString()
}

const runTest = async (testId: string) => {
  try {
    // Make sure config is loaded
    configStore.loadConfig()

    // Check if API key is configured
    if (!configStore.aiConfig.apiKey) {
      alert('Please configure your AI API key in the Configuration page before running tests.')
      router.push('/config')
      return
    }

    await testStore.executeTest(testId)
    router.push(`/tests/${testId}/results`)
  } catch (error) {
    console.error('Failed to run test:', error)
  }
}

const viewResults = (testId: string) => {
  router.push(`/tests/${testId}/results`)
}

const archiveTest = async (testId: string) => {
  try {
    await testStore.archiveTest(testId)
    await loadTests() // Refresh the lists
  } catch (error) {
    console.error('Failed to archive test:', error)
  }
}

const unarchiveTest = async (testId: string) => {
  try {
    await testStore.unarchiveTest(testId)
    await loadTests() // Refresh the lists
  } catch (error) {
    console.error('Failed to unarchive test:', error)
  }
}

const clearCache = async (testId: string) => {
  try {
    await testStore.clearCachedSteps(testId)
    await loadTests() // Refresh the lists to update the UI
  } catch (error) {
    console.error('Failed to clear cached steps:', error)
  }
}

const editTest = (test: any) => {
  selectedTestId.value = test.id
  showEditModal.value = true
}

const handleTestCreated = (testId: string) => {
  loadTests()
  router.push(`/tests/${testId}/results`)
}

const handleModalClose = () => {
  // Close the modal
  showEditModal.value = false
  selectedTestId.value = null

  // No need to reload data since the store is already updated by the updateTest call
}

const confirmDeleteTest = (test: any) => {
  const confirmMessage = `Are you sure you want to delete "${test.description}"?\n\nThis will permanently delete:\n- The test configuration\n- All test results\n- All screenshots\n\nThis action cannot be undone.`

  if (confirm(confirmMessage)) {
    deleteTest(test.id)
  }
}

const deleteTest = async (testId: string) => {
  try {
    await testStore.deleteTest(testId)
    await loadTests() // Refresh the lists
  } catch (error) {
    console.error('Failed to delete test:', error)
    alert('Failed to delete test. Please try again.')
  }
}

const getTestDescription = (testId: string) => {
  const test = testStore.tests.find(t => t.id === testId)
  return test?.description
}

const loadTests = async () => {
  try {
    // Load all tests
    await testStore.getAllTests()
    // Filter archived tests locally
    archivedTests.value = testStore.tests.filter(test => test.archived)
  } catch (error) {
    console.error('Failed to load tests:', error)
  }
}

// Watch for view mode changes
watch(viewMode, () => {
  loadTests()
})

onMounted(() => {
  configStore.loadConfig()
  loadTests()
})
</script>