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
        'bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow',
        test.archived ? 'opacity-75' : ''
      ]">
        <div class="px-6 py-4">
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3 flex-1">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <h3 class="text-lg font-medium text-gray-900">
                    Test #{{ test.id.slice(-8) }}
                  </h3>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ test.aiModel }}
                  </span>
                  <span v-if="test.isReusable"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                      </path>
                    </svg>
                    Reusable
                  </span>
                  <span v-if="test.prerequisiteTests && test.prerequisiteTests.length > 0"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1">
                      </path>
                    </svg>
                    Has Prerequisites ({{ test.prerequisiteTests.length }})
                  </span>
                  <span v-if="test.cachedSteps && test.cachedSteps.length > 0"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    title="This test has cached steps from a previous successful run">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Cached
                  </span>
                </div>

                <div class="mb-3 text-sm text-gray-500">
                  {{ formatDate(test.createdAt) }}
                </div>

                <div class="mb-3">
                  <p class="text-sm text-gray-600 mb-1">
                    <span class="font-medium">Base URL:</span> {{ test.baseUrl }}
                  </p>
                  <p class="text-gray-700">{{ test.description }}</p>
                </div>

                <div v-if="test.credentials" class="mb-3">
                  <p class="text-sm text-gray-600">
                    <span class="font-medium">Credentials:</span> {{ test.credentials.username }}
                  </p>
                </div>

                <div v-if="test.formInputs && Object.keys(test.formInputs).length > 0" class="mb-3">
                  <p class="text-sm text-gray-600 font-medium">Form Data:</p>
                  <div class="text-sm text-gray-600 ml-2">
                    <div v-for="(value, key) in test.formInputs" :key="key">
                      {{ key }}: {{ value }}
                    </div>
                  </div>
                </div>

                <div v-if="test.tags && test.tags.length > 0" class="mb-3">
                  <p class="text-sm text-gray-600 font-medium">Tags:</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-for="tag in test.tags" :key="tag"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {{ tag }}
                    </span>
                    <button @click="editTest(test)"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      title="Edit tags">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                        </path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div v-else class="mb-3">
                  <div class="flex items-center space-x-2">
                    <p class="text-sm text-gray-500">No tags</p>
                    <button @click="editTest(test)"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      title="Add tags">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                      Add tags
                    </button>
                  </div>
                </div>

                <div v-if="test.prerequisiteTests && test.prerequisiteTests.length > 0" class="mb-3">
                  <p class="text-sm text-gray-600 font-medium">Prerequisites:</p>
                  <div class="text-sm text-gray-600 ml-2">
                    <div v-for="prereqId in test.prerequisiteTests" :key="prereqId" class="flex items-center space-x-2">
                      <span class="w-2 h-2 bg-purple-400 rounded-full"></span>
                      <span>{{ getTestDescription(prereqId) || `Test #${prereqId.slice(-8)}` }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="test.expectedOutcomes && test.expectedOutcomes.length > 0" class="mb-3">
                  <p class="text-sm text-gray-600 font-medium">Expected Outcomes:</p>
                  <ul class="text-sm text-gray-600 ml-2 list-disc list-inside">
                    <li v-for="outcome in test.expectedOutcomes" :key="outcome">
                      {{ outcome }}
                    </li>
                  </ul>
                </div>
              </div>

              <div class="flex flex-col items-end space-y-2 ml-4">
                

                <div class="flex space-x-2">
                  <button v-if="!test.archived" @click="runTest(test.id)" :disabled="testStore.loading"
                    class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z">
                      </path>
                    </svg>
                    Run Test
                  </button>

                  <button @click="viewResults(test.id)"
                    class="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                      </path>
                    </svg>
                    View Results
                  </button>

                  <button v-if="!test.archived && test.cachedSteps && test.cachedSteps.length > 0"
                    @click="clearCache(test.id)" :disabled="testStore.loading"
                    class="inline-flex items-center px-3 py-1 border border-purple-300 text-sm font-medium rounded text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50"
                    title="Clear cached steps to force AI regeneration on next run">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                      </path>
                    </svg>
                    Clear Cache
                  </button>

                  <button @click="editTest(test)" :disabled="testStore.loading"
                    class="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                      </path>
                    </svg>
                    Edit
                  </button>

                  <button @click="test.archived ? unarchiveTest(test.id) : archiveTest(test.id)"
                    :disabled="testStore.loading" :class="[
                      'inline-flex items-center px-3 py-1 border text-sm font-medium rounded disabled:opacity-50',
                      test.archived
                        ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                        : 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100'
                    ]">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path v-if="test.archived" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5 8l6 6m0 0l6-6m-6 6V3"></path>
                    </svg>
                    {{ test.archived ? 'Unarchive' : 'Archive' }}
                  </button>

                  <button @click="confirmDeleteTest(test)" :disabled="testStore.loading"
                    class="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                      </path>
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
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