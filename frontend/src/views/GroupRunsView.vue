<template>
  <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
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
          {{ groupName }} — Runs
        </h1>
        <p class="text-sm text-muted mt-0.5">{{ runs.length }} run{{ runs.length !== 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Empty state -->
    <div v-else-if="runs.length === 0" class="text-center py-16 text-secondary">
      <svg class="w-12 h-12 mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-lg font-medium text-heading mb-1">No runs yet</p>
      <p class="text-sm">Run this group from the Groups page to see results here.</p>
    </div>

    <!-- Runs list -->
    <div v-else class="bg-surface border border-border rounded-xl overflow-hidden">
      <div
        v-for="(run, idx) in runs"
        :key="run.id"
        :class="['border-border', idx < runs.length - 1 ? 'border-b' : '']"
      >
        <router-link
          :to="`/groups/${groupId}/runs/${run.id}`"
          class="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 group"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Status Badge -->
            <span :class="['inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full shrink-0', statusClass(run.status)]">
              <span
                v-if="run.status === 'running'"
                class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"
              />
              {{ run.status }}
            </span>
            <!-- Timestamp -->
            <span class="text-sm text-heading font-medium">{{ formatDate(run.startedAt) }}</span>
          </div>

          <div class="flex items-center gap-4 shrink-0 ml-3">
            <!-- Summary counts -->
            <div class="flex items-center gap-3 text-xs">
              <span class="text-secondary">{{ run.summary.total }} total</span>
              <span class="text-green-600 dark:text-green-400 font-medium">{{ run.summary.passed }} passed</span>
              <span v-if="run.summary.failed > 0" class="text-red-600 dark:text-red-400 font-medium">{{ run.summary.failed }} failed</span>
              <span v-if="run.summary.running > 0" class="text-blue-600 dark:text-blue-400 font-medium">{{ run.summary.running }} running</span>
            </div>
            <svg class="w-4 h-4 text-muted group-hover:text-heading transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGroupStore } from '@/stores/groups'

const route = useRoute()
const groupStore = useGroupStore()

const groupId = route.params.groupId as string
const loading = ref(true)

const groupName = computed(() => {
  const group = groupStore.findGroup(groupId)
  return group?.name ?? 'Group'
})

const runs = computed(() => {
  return [...groupStore.groupRuns]
    .filter(r => r.groupId === groupId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
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

onMounted(async () => {
  if (groupStore.groups.length === 0) {
    await groupStore.fetchGroups()
  }
  await groupStore.fetchGroupRuns(groupId)
  loading.value = false
})
</script>
