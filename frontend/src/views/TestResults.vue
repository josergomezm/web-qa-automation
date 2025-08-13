<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <!-- Navigation and Refresh Button Row -->
      <div class="flex justify-between items-center">
        <router-link to="/tests" class="text-blue-600 hover:text-blue-800">
          <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to Tests
        </router-link>
        <button @click="refreshResults" :disabled="testStore.loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {{ testStore.loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
      
      <!-- Title Row -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Test Results</h2>
          <p v-if="currentTest" class="text-lg text-gray-600 mt-1">
            {{ currentTest.description }}
          </p>
        </div>
        

        <!-- Filter Buttons Row -->
        <div class="flex justify-center">
          <div class="flex rounded-md shadow-sm">
            <button @click="viewMode = 'active'" :class="[
              'px-4 py-2 text-sm font-medium border',
              viewMode === 'active'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            ]" class="rounded-l-md">
              Active ({{ activeResultsCount }})
            </button>
            <button @click="viewMode = 'archived'" :class="[
              'px-4 py-2 text-sm font-medium border-t border-b border-r',
              viewMode === 'archived'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            ]" class="rounded-r-md">
              Archived ({{ archivedResultsCount }})
            </button>
          </div>
        </div>

      </div>

    </div>

    <div v-if="testStore.error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">{{ testStore.error }}</p>
    </div>

    <div v-if="displayedResults.length === 0 && !testStore.loading" class="text-center py-12">
      <p class="text-gray-500">No {{ viewMode }} test results found for this test.</p>
      <router-link to="/tests" class="text-blue-600 hover:text-blue-800">
        Back to Tests
      </router-link>
    </div>

    <div class="grid gap-6">
      <div v-for="result in displayedResults" :key="result.id" :class="[
        'bg-white shadow rounded-lg overflow-hidden',
        result.archived ? 'opacity-75' : ''
      ]">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div :class="[
                'w-3 h-3 rounded-full',
                result.status === 'passed' ? 'bg-green-500' :
                  result.status === 'failed' ? 'bg-red-500' :
                    result.status === 'running' ? 'bg-yellow-500' : 'bg-gray-500'
              ]" />
              <h3 class="text-lg font-medium text-gray-900">
                Test {{ result.status }}
              </h3>
              <span v-if="result.archived"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Archived
              </span>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-sm text-gray-500">
                {{ formatDate(result.executedAt) }}
              </div>
              <router-link :to="`/results/${result.id}`"
                class="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100">
                View Details
              </router-link>
              <button @click="result.archived ? unarchiveResult(result.id) : archiveResult(result.id)"
                :disabled="testStore.loading" :class="[
                  'inline-flex items-center px-2 py-1 border text-xs font-medium rounded disabled:opacity-50',
                  result.archived
                    ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100'
                ]">
                {{ result.archived ? 'Unarchive' : 'Archive' }}
              </button>
            </div>
          </div>
        </div>

        <div class="px-6 py-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">
                {{ result.performance.totalTestTime }}ms
              </div>
              <div class="text-sm text-gray-500">Total Time</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">
                {{ result.performance.clickCount }}
              </div>
              <div class="text-sm text-gray-500">Clicks</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">
                {{ result.performance.networkRequests }}
              </div>
              <div class="text-sm text-gray-500">Requests</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">
                ${{ result.cost.toFixed(4) }}
              </div>
              <div class="text-sm text-gray-500">Cost</div>
            </div>
          </div>

          <div v-if="result.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p class="text-red-800 text-sm">{{ result.error }}</p>
          </div>

          <div class="space-y-4">
            <!-- Prerequisite Steps Section -->
            <div v-if="getPrerequisiteSteps(result).length > 0" class="space-y-2">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
                <h4 class="font-medium text-gray-900">Prerequisite Steps:</h4>
                <span class="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  {{ getUniquePrerequisiteTests(result).length }} prerequisite test(s)
                </span>
              </div>
              
              <!-- Group prerequisite steps by test -->
              <div v-for="prereqTest in getUniquePrerequisiteTests(result)" :key="prereqTest.id" class="ml-4 border-l-2 border-purple-200 pl-4 space-y-1">
                <div class="text-xs font-medium text-purple-700 mb-2">
                  📋 {{ prereqTest.description }}
                </div>
                <div v-for="(step, index) in getStepsForPrerequisite(result, prereqTest.id)" :key="index" :class="[
                  'flex items-center space-x-2 text-sm p-2 rounded border-l-2',
                  step.success ? 'bg-purple-50 text-purple-800 border-purple-300' : 'bg-red-50 text-red-800 border-red-300'
                ]">
                  <div :class="[
                    'w-2 h-2 rounded-full',
                    step.success ? 'bg-purple-500' : 'bg-red-500'
                  ]" />
                  <span class="flex-1">{{ step.action }} {{ step.element }}</span>
                  <span class="text-xs text-gray-500">
                    {{ formatTime(step.timestamp) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Main Test Steps Section -->
            <div v-if="getMainTestSteps(result).length > 0" class="space-y-2">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h4 class="font-medium text-gray-900">Main Test Steps:</h4>
              </div>
              <div class="space-y-1">
                <div v-for="(step, index) in getMainTestSteps(result)" :key="index" :class="[
                  'flex items-center space-x-2 text-sm p-2 rounded',
                  step.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                ]">
                  <div :class="[
                    'w-2 h-2 rounded-full',
                    step.success ? 'bg-green-500' : 'bg-red-500'
                  ]" />
                  <span class="flex-1">{{ step.action }} {{ step.element }}</span>
                  <span class="text-xs text-gray-500">
                    {{ formatTime(step.timestamp) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Fallback for tests without step categorization -->
            <div v-if="getPrerequisiteSteps(result).length === 0 && getMainTestSteps(result).length === 0" class="space-y-2">
              <h4 class="font-medium text-gray-900">Test Steps:</h4>
              <div class="space-y-1">
                <div v-for="(step, index) in result.steps" :key="index" :class="[
                  'flex items-center space-x-2 text-sm p-2 rounded',
                  step.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                ]">
                  <div :class="[
                    'w-2 h-2 rounded-full',
                    step.success ? 'bg-green-500' : 'bg-red-500'
                  ]" />
                  <span class="flex-1">{{ step.action }} {{ step.element }}</span>
                  <span class="text-xs text-gray-500">
                    {{ formatTime(step.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="result.performance.consoleErrors.length > 0" class="mt-4">
            <h4 class="font-medium text-gray-900 mb-2">Console Errors:</h4>
            <div class="bg-red-50 border border-red-200 rounded p-3">
              <div v-for="(error, index) in result.performance.consoleErrors" :key="index"
                class="text-sm text-red-800 font-mono">
                {{ error }}
              </div>
            </div>
          </div>

          <div v-if="result.screenshots.length > 0" class="mt-4">
            <h4 class="font-medium text-gray-900 mb-2">Screenshots:</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <img v-for="(screenshot, index) in result.screenshots" :key="index"
                :src="`data:image/png;base64,${screenshot}`" :alt="`Screenshot ${index + 1}`"
                class="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-75"
                @click="openScreenshot(screenshot)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTestStore } from '@/stores/tests'

const route = useRoute()
const testStore = useTestStore()

const viewMode = ref<'active' | 'archived'>('active')
const testResults = ref<any[]>([])
const currentTest = ref<any>(null)

const testId = computed(() => route.params.id as string)

const displayedResults = computed(() => {
  if (viewMode.value === 'active') {
    return testResults.value.filter(result => !result.archived)
  } else {
    return testResults.value.filter(result => result.archived)
  }
})

const activeResultsCount = computed(() =>
  testResults.value.filter(result => !result.archived).length
)

const archivedResultsCount = computed(() =>
  testResults.value.filter(result => result.archived).length
)

const refreshResults = async () => {
  try {
    // Load results for this specific test
    testResults.value = await testStore.getResultsByTestId(testId.value)

    // Also load the test details
    currentTest.value = await testStore.getTest(testId.value)
  } catch (error) {
    console.error('Failed to refresh results:', error)
  }
}

const archiveResult = async (resultId: string) => {
  try {
    await testStore.archiveResult(resultId)
    await refreshResults() // Refresh the results
  } catch (error) {
    console.error('Failed to archive result:', error)
  }
}

const unarchiveResult = async (resultId: string) => {
  try {
    await testStore.unarchiveResult(resultId)
    await refreshResults() // Refresh the results
  } catch (error) {
    console.error('Failed to unarchive result:', error)
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString()
}

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString()
}

// Helper methods for step categorization
const getPrerequisiteSteps = (result: any) => {
  return result.steps?.filter((step: any) => step.isPrerequisite) || []
}

const getMainTestSteps = (result: any) => {
  return result.steps?.filter((step: any) => step.isMainTest || (!step.isPrerequisite && !step.isMainTest)) || []
}

const getUniquePrerequisiteTests = (result: any) => {
  const prereqSteps = getPrerequisiteSteps(result)
  const uniqueTests = new Map()
  
  prereqSteps.forEach((step: any) => {
    if (step.prerequisiteTestId && !uniqueTests.has(step.prerequisiteTestId)) {
      uniqueTests.set(step.prerequisiteTestId, {
        id: step.prerequisiteTestId,
        description: step.prerequisiteTestDescription || `Prerequisite Test ${step.prerequisiteTestId.slice(-8)}`
      })
    }
  })
  
  return Array.from(uniqueTests.values())
}

const getStepsForPrerequisite = (result: any, prereqTestId: string) => {
  return getPrerequisiteSteps(result).filter((step: any) => step.prerequisiteTestId === prereqTestId)
}

const openScreenshot = (screenshot: string) => {
  const newWindow = window.open()
  if (newWindow) {
    newWindow.document.write(`<img src="data:image/png;base64,${screenshot}" style="max-width: 100%; height: auto;" />`)
  }
}

// Watch for view mode changes
watch(viewMode, () => {
  refreshResults()
})

onMounted(() => {
  refreshResults()
})
</script>