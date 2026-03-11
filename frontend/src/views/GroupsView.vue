<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="font-serif text-2xl text-heading">Test Groups</h2>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-button transition-colors duration-200"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Group
      </button>
    </div>

    <!-- Error Banner -->
    <div v-if="groupStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
      <span>{{ groupStore.error }}</span>
      <button @click="groupStore.clearError()" class="text-red-500 hover:text-red-700 ml-4">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="groupStore.fetchingGroups" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Empty State -->
    <div v-else-if="groupStore.groups.length === 0" class="text-center py-16 text-secondary">
      <svg class="w-12 h-12 mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p class="text-lg font-medium text-heading mb-1">No groups yet</p>
      <p class="text-sm">Create a group to run multiple tests together.</p>
    </div>

    <!-- Group Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="group in groupStore.groups"
        :key="group.id"
        class="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-3"
      >
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-heading truncate">{{ group.name }}</h3>
            <p v-if="group.description" class="text-sm text-secondary mt-0.5 line-clamp-2">{{ group.description }}</p>
          </div>
          <!-- Test Count Badge -->
          <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full whitespace-nowrap shrink-0">
            {{ group.testIds.length }} test{{ group.testIds.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="group.tags.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in group.tags"
            :key="tag"
            class="inline-flex items-center px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full"
          >
            {{ tag }}
          </span>
        </div>

        <!-- Max Parallel -->
        <div class="text-xs text-secondary">
          Max parallel: <span class="font-semibold text-heading">{{ group.maxParallel }}</span>
        </div>

        <!-- First 3 Tests -->
        <div class="space-y-1">
          <div
            v-for="testId in group.testIds.slice(0, 3)"
            :key="testId"
            class="text-xs text-secondary truncate flex items-center gap-1"
          >
            <svg class="w-3 h-3 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ getTestName(testId) }}
          </div>
          <div v-if="group.testIds.length > 3" class="text-xs text-muted pl-4">
            +{{ group.testIds.length - 3 }} more
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-2 pt-1 mt-auto border-t border-border">
          <button
            @click="runGroup(group)"
            :disabled="groupStore.executingGroupId === group.id"
            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
          >
            <svg v-if="groupStore.executingGroupId !== group.id" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ groupStore.executingGroupId === group.id ? 'Running...' : 'Run Group' }}
          </button>

          <router-link
            :to="`/groups/${group.id}/runs`"
            class="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border text-secondary hover:text-heading hover:border-border-hover rounded-lg transition-colors duration-200"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Runs
          </router-link>

          <button
            @click="editingGroup = group"
            class="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border text-secondary hover:text-heading hover:border-border-hover rounded-lg transition-colors duration-200"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          <button
            @click="confirmDelete(group)"
            class="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Runs Section -->
    <div v-if="recentRuns.length > 0" class="space-y-4">
      <h3 class="font-serif text-xl text-heading">Recent Runs</h3>
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div
          v-for="(run, idx) in recentRuns"
          :key="run.id"
          :class="['border-border', idx < recentRuns.length - 1 ? 'border-b' : '']"
        >
          <router-link
            :to="`/groups/${run.groupId}/runs/${run.id}`"
            class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- Status Badge -->
              <span :class="['inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full shrink-0', statusClass(run.status)]">
                {{ run.status }}
              </span>
              <!-- Group Name -->
              <span class="font-medium text-sm text-heading truncate">{{ getGroupName(run.groupId) }}</span>
              <!-- Timestamp -->
              <span class="text-xs text-muted shrink-0 hidden sm:inline">{{ formatDate(run.startedAt) }}</span>
            </div>

            <div class="flex items-center gap-4 shrink-0 ml-3">
              <!-- Pass/Fail counts -->
              <div class="flex items-center gap-2 text-xs">
                <span class="text-green-600 dark:text-green-400 font-medium">{{ run.summary.passed }} passed</span>
                <span v-if="run.summary.failed > 0" class="text-red-600 dark:text-red-400 font-medium">{{ run.summary.failed }} failed</span>
                <span v-if="run.summary.running > 0" class="text-yellow-600 dark:text-yellow-400 font-medium">{{ run.summary.running }} running</span>
              </div>
              <svg class="w-4 h-4 text-muted group-hover:text-heading transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CreateGroupModal
      :isOpen="showCreateModal"
      @close="showCreateModal = false"
      @created="onGroupCreated"
    />

    <EditGroupModal
      v-if="editingGroup"
      :isOpen="!!editingGroup"
      :group="editingGroup"
      @close="editingGroup = null"
      @updated="onGroupUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/groups'
import { useTestStore } from '@/stores/tests'
import { useConfigStore } from '@/stores/config'
import CreateGroupModal from '@/components/CreateGroupModal.vue'
import EditGroupModal from '@/components/EditGroupModal.vue'
import type { TestGroup } from '@shared/types'

const router = useRouter()
const groupStore = useGroupStore()
const testStore = useTestStore()
const configStore = useConfigStore()

const showCreateModal = ref(false)
const editingGroup = ref<TestGroup | null>(null)

// Computed: 10 most recent group runs across all groups
const recentRuns = computed(() => {
  return [...groupStore.groupRuns]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10)
})

function getTestName(testId: string): string {
  const test = testStore.findTest(testId)
  return test ? (test.name || test.description || testId) : testId
}

function getGroupName(groupId: string): string {
  const group = groupStore.findGroup(groupId)
  return group ? group.name : groupId
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(status: string): string {
  switch (status) {
    case 'passed':
      return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
    case 'partial':
      return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
    case 'running':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
    case 'cancelled':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
  }
}

async function runGroup(group: TestGroup) {
  const aiConfig = configStore.aiConfig
  if (!aiConfig || !aiConfig.apiKey) {
    alert('Please configure an AI provider in the Configuration page before running tests.')
    return
  }
  const run = await groupStore.executeGroup(group.id, aiConfig)
  if (run) {
    router.push(`/groups/${group.id}/runs/${run.id}`)
  }
}

async function confirmDelete(group: TestGroup) {
  if (!window.confirm(`Delete group "${group.name}"? This cannot be undone.`)) return
  await groupStore.deleteGroup(group.id)
}

function onGroupCreated() {
  // Groups list updated by store; also refresh runs for new group
  groupStore.fetchGroups()
}

function onGroupUpdated() {
  groupStore.fetchGroups()
}

onMounted(async () => {
  configStore.loadConfig()
  await Promise.all([testStore.fetchTests(), groupStore.fetchGroups()])
  // Fetch runs for all groups in parallel
  await Promise.all(groupStore.groups.map(g => groupStore.fetchGroupRuns(g.id)))
})
</script>
