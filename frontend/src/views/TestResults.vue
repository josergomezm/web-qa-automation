<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <!-- Navigation and Refresh Button Row -->
      <div class="flex justify-between items-center">
        <router-link to="/tests" class="text-primary hover:text-primary-hover transition-colors duration-200">
          <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to Tests
        </router-link>
        <button @click="refreshResults" :disabled="resultStore.fetchingResults"
          class="px-4 py-2 bg-primary text-white rounded-button hover:bg-primary-hover transition-colors duration-200 disabled:opacity-50">
          {{ resultStore.fetchingResults ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <!-- Title Row -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="font-serif text-2xl text-heading">Test Results</h2>
          <p v-if="currentTest" class="text-secondary mt-1">
            {{ currentTest.description }}
          </p>
        </div>

        <!-- Filter Buttons Row -->
        <div class="flex justify-center">
          <div class="flex rounded-md shadow-sm">
            <button @click="viewMode = 'active'" :class="[
              'px-4 py-2 text-sm font-medium border',
              viewMode === 'active'
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-secondary border-border hover:text-heading hover:border-border-hover'
            ]" class="rounded-l-button">
              Active ({{ activeResultsCount }})
            </button>
            <button @click="viewMode = 'archived'" :class="[
              'px-4 py-2 text-sm font-medium border-t border-b border-r',
              viewMode === 'archived'
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-secondary border-border hover:text-heading hover:border-border-hover'
            ]" class="rounded-r-button">
              Archived ({{ archivedResultsCount }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="resultStore.error" class="bg-danger-bg border border-danger/20 rounded-md p-4">
      <p class="text-danger">{{ resultStore.error }}</p>
    </div>

    <div v-if="displayedResults.length === 0 && !resultStore.fetchingResults" class="text-center py-12">
      <p class="text-secondary">No {{ viewMode }} test results found for this test.</p>
      <router-link to="/tests" class="text-primary hover:text-primary-hover">
        Back to Tests
      </router-link>
    </div>

    <div class="grid gap-6">
      <div v-for="result in displayedResults" :key="result.id" :class="[
        'bg-surface shadow-card rounded-card border border-border card-hover',
        result.archived ? 'opacity-75' : ''
      ]">
        <div class="px-6 py-4 border-b border-border">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div :class="[
                'w-3 h-3 rounded-full',
                result.status === 'passed' ? 'bg-green-500' :
                  result.status === 'failed' ? 'bg-red-500' :
                    result.status === 'running' ? 'bg-yellow-500' : 'bg-gray-500'
              ]" />
              <h3 class="text-lg font-medium text-heading">
                Test {{ result.status }}
              </h3>
              <span v-if="result.archived"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Archived
              </span>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-sm text-muted">
                {{ formatDate(result.executedAt) }}
              </div>
              <router-link :to="`/results/${result.id}`"
                class="inline-flex items-center px-2 py-1 border border-primary/30 text-xs font-medium rounded-button text-primary bg-primary-light hover:bg-primary/10 transition-colors duration-200">
                View Details
              </router-link>
              <button @click="result.archived ? unarchiveResult(result.id) : archiveResult(result.id)"
                :disabled="archivingId === result.id" :class="[
                  'inline-flex items-center px-2 py-1 border text-xs font-medium rounded disabled:opacity-50',
                  result.archived
                    ? 'border-primary/30 text-primary bg-primary-light hover:bg-primary/10'
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
              <div class="text-2xl font-bold text-primary">
                {{ result.performance.totalTestTime }}ms
              </div>
              <div class="section-label">Total Time</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">
                {{ result.performance.clickCount }}
              </div>
              <div class="section-label">Clicks</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">
                {{ result.performance.networkRequests }}
              </div>
              <div class="section-label">Requests</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">
                ${{ result.cost.toFixed(4) }}
              </div>
              <div class="section-label">Cost</div>
            </div>
          </div>

          <div v-if="result.error" class="mb-4 p-3 bg-danger-bg border border-danger/20 rounded">
            <p class="text-danger text-sm">{{ result.error }}</p>
          </div>

          <div class="space-y-4">
            <!-- Prerequisite Steps Section -->
            <div v-if="getPrerequisiteSteps(result).length > 0" class="space-y-2">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
                <h4 class="font-medium text-heading">Prerequisite Steps:</h4>
                <span class="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  {{ getUniquePrerequisiteTests(result).length }} prerequisite test(s)
                </span>
              </div>

              <!-- Group prerequisite steps by test -->
              <div v-for="prereqTest in getUniquePrerequisiteTests(result)" :key="prereqTest.id" class="ml-4 border-l-2 border-purple-200 pl-4 space-y-1">
                <div class="text-xs font-medium text-purple-700 mb-2">
                  {{ prereqTest.description }}
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
                  <span class="text-xs text-muted">
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
                <h4 class="font-medium text-heading">Main Test Steps:</h4>
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
                  <span class="text-xs text-muted">
                    {{ formatTime(step.timestamp) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Fallback for tests without step categorization -->
            <div v-if="getPrerequisiteSteps(result).length === 0 && getMainTestSteps(result).length === 0" class="space-y-2">
              <h4 class="font-medium text-heading">Test Steps:</h4>
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
                  <span class="text-xs text-muted">
                    {{ formatTime(step.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="result.performance.consoleErrors.length > 0" class="mt-4">
            <h4 class="font-medium text-heading mb-2">Console Errors:</h4>
            <div class="bg-danger-bg border border-danger/20 rounded p-3">
              <div v-for="(error, index) in result.performance.consoleErrors" :key="index"
                class="text-sm text-danger font-mono">
                {{ error }}
              </div>
            </div>
          </div>

          <div v-if="result.screenshots.length > 0" class="mt-4">
            <h4 class="font-medium text-heading mb-2">Screenshots:</h4>
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

    <!-- Screenshot Modal -->
    <div v-if="screenshotModal" class="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      role="dialog" aria-modal="true" aria-label="Screenshot preview" @click="closeScreenshot">
      <div class="relative max-w-full max-h-full p-4" @click.stop>
        <button @click="closeScreenshot"
          class="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white rounded-full p-2 hover:bg-opacity-90"
          title="Close">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <img :src="`data:image/png;base64,${screenshotModal}`" alt="Screenshot"
          class="max-w-full max-h-[90vh] object-contain rounded" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { useResultStore } from '@/stores/results'
import type { TestResult, TestRequest, TestStep } from '@shared/types'

const route = useRoute()
const testStore = useTestStore()
const resultStore = useResultStore()

const viewMode = ref<'active' | 'archived'>('active')
const testResults = ref<TestResult[]>([])
const currentTest = ref<TestRequest | null>(null)
const archivingId = ref<string | null>(null)

const testId = computed(() => route.params.id as string)

const displayedResults = computed(() => {
  if (viewMode.value === 'active') {
    return testResults.value.filter(result => !result.archived)
  }
  return testResults.value.filter(result => result.archived)
})

const activeResultsCount = computed(() =>
  testResults.value.filter(result => !result.archived).length
)

const archivedResultsCount = computed(() =>
  testResults.value.filter(result => result.archived).length
)

const refreshResults = async () => {
  try {
    testResults.value = await resultStore.fetchResultsByTestId(testId.value)
    currentTest.value = await testStore.fetchTest(testId.value)
  } catch (error) {
    console.error('Failed to refresh results:', error)
  }
}

const archiveResult = async (resultId: string) => {
  archivingId.value = resultId
  try {
    await resultStore.archiveResult(resultId)
    await refreshResults()
  } catch (error) {
    console.error('Failed to archive result:', error)
  } finally {
    archivingId.value = null
  }
}

const unarchiveResult = async (resultId: string) => {
  archivingId.value = resultId
  try {
    await resultStore.unarchiveResult(resultId)
    await refreshResults()
  } catch (error) {
    console.error('Failed to unarchive result:', error)
  } finally {
    archivingId.value = null
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString()
}

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString()
}

const getPrerequisiteSteps = (result: TestResult): TestStep[] => {
  return result.steps?.filter((step) => step.isPrerequisite) || []
}

const getMainTestSteps = (result: TestResult): TestStep[] => {
  return result.steps?.filter((step) => step.isMainTest || (!step.isPrerequisite && !step.isMainTest)) || []
}

const getUniquePrerequisiteTests = (result: TestResult) => {
  const prereqSteps = getPrerequisiteSteps(result)
  const uniqueTests = new Map<string, { id: string; description: string }>()
  prereqSteps.forEach((step) => {
    if (step.prerequisiteTestId && !uniqueTests.has(step.prerequisiteTestId)) {
      uniqueTests.set(step.prerequisiteTestId, {
        id: step.prerequisiteTestId,
        description: step.prerequisiteTestDescription || `Prerequisite Test ${step.prerequisiteTestId.slice(-8)}`
      })
    }
  })
  return Array.from(uniqueTests.values())
}

const getStepsForPrerequisite = (result: TestResult, prereqTestId: string): TestStep[] => {
  return getPrerequisiteSteps(result).filter((step) => step.prerequisiteTestId === prereqTestId)
}

const screenshotModal = ref<string | null>(null)

const openScreenshot = (screenshot: string) => {
  screenshotModal.value = screenshot
}

const closeScreenshot = () => {
  screenshotModal.value = null
}

onMounted(() => {
  refreshResults()
})
</script>
