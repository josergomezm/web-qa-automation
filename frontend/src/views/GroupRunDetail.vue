<template>
  <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p class="mt-2 text-secondary">Loading run details...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-danger-bg border border-danger/20 rounded-md p-4">
      <p class="text-danger">{{ error }}</p>
    </div>

    <div v-else-if="groupRun" class="space-y-6">
      <!-- Back link + Header -->
      <div class="flex items-center space-x-3">
        <router-link
          to="/groups"
          class="text-muted hover:text-heading transition-colors duration-200"
          title="Back to Groups"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <div>
          <h1 class="font-serif text-2xl text-heading">
            {{ groupName }} — Run Details
          </h1>
          <p class="text-sm text-muted mt-0.5">Run ID: {{ groupRun.id }}</p>
        </div>
      </div>

      <!-- Status card -->
      <div class="bg-surface shadow-card rounded-xl border border-border p-6 space-y-5">
        <!-- Status badge + timestamps -->
        <div class="flex flex-wrap items-center gap-4">
          <!-- Status badge -->
          <span :class="['inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold', statusBadgeClass]">
            <span
              v-if="groupRun.status === 'running'"
              class="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"
            />
            <span v-else class="w-2 h-2 rounded-full bg-current mr-2" />
            {{ statusLabel }}
          </span>

          <div class="text-sm text-secondary">
            <span class="font-medium text-heading">Started:</span>
            {{ formatDate(groupRun.startedAt) }}
          </div>

          <div v-if="groupRun.completedAt" class="text-sm text-secondary">
            <span class="font-medium text-heading">Completed:</span>
            {{ formatDate(groupRun.completedAt) }}
          </div>
        </div>

        <!-- Progress bar -->
        <div>
          <div class="flex h-3 rounded-full overflow-hidden bg-border">
            <!-- Passed segment -->
            <div
              v-if="passedPercent > 0"
              :style="{ width: passedPercent + '%' }"
              class="bg-green-500 transition-all duration-500"
            />
            <!-- Failed segment -->
            <div
              v-if="failedPercent > 0"
              :style="{ width: failedPercent + '%' }"
              class="bg-red-500 transition-all duration-500"
            />
            <!-- Running segment -->
            <div
              v-if="runningPercent > 0"
              :style="{ width: runningPercent + '%' }"
              class="bg-blue-400 animate-pulse transition-all duration-500"
            />
          </div>
          <div class="flex justify-between text-xs text-muted mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <!-- Summary numbers -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="text-center p-3 bg-cream rounded-lg border border-border">
            <div class="text-2xl font-bold text-heading">{{ groupRun.summary.total }}</div>
            <div class="section-label mt-1">Total</div>
          </div>
          <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div class="text-2xl font-bold text-green-600">{{ groupRun.summary.passed }}</div>
            <div class="section-label mt-1">Passed</div>
          </div>
          <div class="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div class="text-2xl font-bold text-red-600">{{ groupRun.summary.failed }}</div>
            <div class="section-label mt-1">Failed</div>
          </div>
          <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="text-2xl font-bold text-blue-500">{{ groupRun.summary.running }}</div>
            <div class="section-label mt-1">Running</div>
          </div>
        </div>
      </div>

      <!-- Individual test results list -->
      <div class="bg-surface shadow-card rounded-xl border border-border p-6">
        <h2 class="text-lg font-medium text-heading mb-4">Test Results</h2>

        <div v-if="groupRun.resultIds.length === 0" class="text-center py-8 text-muted">
          No test results yet.
        </div>

        <div v-else class="divide-y divide-border">
          <div
            v-for="resultId in groupRun.resultIds"
            :key="resultId"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div class="flex items-center space-x-3 min-w-0">
              <!-- Status dot -->
              <span :class="['w-2.5 h-2.5 rounded-full flex-shrink-0', resultStatusDot(resultId)]" />

              <div class="min-w-0">
                <p class="text-sm font-medium text-heading truncate">
                  {{ testNameForResult(resultId) }}
                </p>
                <p class="text-xs text-muted truncate">{{ resultId }}</p>
              </div>
            </div>

            <div class="flex items-center space-x-3 flex-shrink-0 ml-4">
              <!-- Status badge -->
              <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', resultBadgeClass(resultId)]">
                {{ resultStatusLabel(resultId) }}
              </span>

              <!-- Device badge -->
              <span
                v-if="getResult(resultId)?.device"
                class="inline-flex items-center px-1.5 py-0.5 text-xs bg-cream text-secondary rounded-pill border border-border"
              >
                {{ getResult(resultId)?.device }}
              </span>

              <!-- View Details link -->
              <router-link
                :to="`/results/${resultId}`"
                class="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-150"
              >
                View Details
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGroupStore } from '@/stores/groups'
import { useTestStore } from '@/stores/tests'
import { useResultStore } from '@/stores/results'
import type { GroupRun, TestResult } from '@shared/types'

const route = useRoute()
const groupStore = useGroupStore()
const testStore = useTestStore()
const resultStore = useResultStore()

const groupRun = ref<GroupRun | null>(null)
const testResults = ref<Map<string, TestResult>>(new Map())
const fetchedResultIds = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref<string | null>(null)
const pollInterval = ref<number | null>(null)

// Route params
const groupId = route.params.groupId as string
const runId = route.params.runId as string

// Derived group name
const groupName = computed(() => {
  const group = groupStore.findGroup(groupId)
  return group?.name ?? 'Group'
})

// Status helpers
const statusLabel = computed(() => {
  switch (groupRun.value?.status) {
    case 'passed': return 'Passed'
    case 'failed': return 'Failed'
    case 'partial': return 'Partial'
    case 'running': return 'Running'
    case 'cancelled': return 'Cancelled'
    default: return 'Unknown'
  }
})

const statusBadgeClass = computed(() => {
  switch (groupRun.value?.status) {
    case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'cancelled': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default: return 'bg-gray-100 text-gray-600'
  }
})

// Progress bar percentages
const passedPercent = computed(() => {
  const total = groupRun.value?.summary.total ?? 0
  if (total === 0) return 0
  return Math.round((groupRun.value!.summary.passed / total) * 100)
})

const failedPercent = computed(() => {
  const total = groupRun.value?.summary.total ?? 0
  if (total === 0) return 0
  return Math.round((groupRun.value!.summary.failed / total) * 100)
})

const runningPercent = computed(() => {
  const total = groupRun.value?.summary.total ?? 0
  if (total === 0) return 0
  return Math.round((groupRun.value!.summary.running / total) * 100)
})

// Per-result helpers
function getResult(resultId: string): TestResult | undefined {
  return testResults.value.get(resultId)
}

function resultStatusLabel(resultId: string): string {
  const r = getResult(resultId)
  if (!r) return fetchedResultIds.value.has(resultId) ? 'Not Found' : 'Loading...'
  switch (r.status) {
    case 'passed': return 'Passed'
    case 'failed': return 'Failed'
    case 'running': return 'Running'
    default: return r.status
  }
}

function resultStatusDot(resultId: string): string {
  const r = getResult(resultId)
  if (!r) return 'bg-gray-300'
  switch (r.status) {
    case 'passed': return 'bg-green-500'
    case 'failed': return 'bg-red-500'
    case 'running': return 'bg-blue-400 animate-pulse'
    default: return 'bg-gray-400'
  }
}

function resultBadgeClass(resultId: string): string {
  const r = getResult(resultId)
  if (!r) return 'bg-gray-100 text-gray-500'
  switch (r.status) {
    case 'passed': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    case 'running': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function testNameForResult(resultId: string): string {
  const r = getResult(resultId)
  if (!r) return resultId
  const test = testStore.findTest(r.testRequestId)
  return test?.name || test?.description || r.testRequestId
}

// Date formatting
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString()
}

// Data fetching
async function loadGroupRun() {
  const run = await groupStore.fetchGroupRun(runId)
  if (run) {
    groupRun.value = run
  }
}

async function loadTestResults() {
  if (!groupRun.value) return
  const fetches = groupRun.value.resultIds.map(async (resultId) => {
    try {
      const r = await resultStore.fetchResult(resultId)
      if (r) testResults.value.set(resultId, r)
    } catch {
      // Result may not exist (e.g., lost to a previous race condition)
    } finally {
      fetchedResultIds.value.add(resultId)
    }
  })
  await Promise.all(fetches)
}

async function loadAll() {
  try {
    await loadGroupRun()
    await loadTestResults()
  } catch (err: any) {
    if (!groupRun.value) {
      error.value = err?.message ?? 'Failed to load run details'
    }
  } finally {
    loading.value = false
  }
}

// Polling
function startPolling() {
  stopPolling()
  pollInterval.value = window.setInterval(async () => {
    if (groupRun.value?.status === 'running') {
      await loadGroupRun()
      await loadTestResults()
    } else {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollInterval.value !== null) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
}

onMounted(async () => {
  // Ensure groups and tests are loaded for name lookups
  if (groupStore.groups.length === 0) {
    await groupStore.fetchGroups()
  }
  if (testStore.tests.length === 0) {
    await testStore.fetchTests()
  }

  await loadAll()

  if (groupRun.value?.status === 'running') {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>
