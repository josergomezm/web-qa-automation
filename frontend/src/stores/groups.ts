import { ref } from 'vue'
import { defineStore } from 'pinia'
import { groupApi } from '../services/groupApi'
import type { TestGroup, GroupRun } from '@shared/types'

export const useGroupStore = defineStore('groups', () => {
  const groups = ref<TestGroup[]>([])
  const groupRuns = ref<GroupRun[]>([])

  // Per-action loading flags
  const fetchingGroups = ref(false)
  const creatingGroup = ref(false)
  const executingGroupId = ref<string | null>(null)
  const fetchingRuns = ref(false)

  const error = ref<string | null>(null)

  function clearError() {
    error.value = null
  }

  function findGroup(id: string): TestGroup | undefined {
    return groups.value.find(g => g.id === id)
  }

  async function fetchGroups() {
    fetchingGroups.value = true
    error.value = null
    try {
      groups.value = await groupApi.getAll()
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch groups'
    } finally {
      fetchingGroups.value = false
    }
  }

  async function createGroup(data: {
    name: string
    description?: string
    testIds: string[]
    tags: string[]
    maxParallel: number
  }): Promise<TestGroup | null> {
    creatingGroup.value = true
    error.value = null
    try {
      const group = await groupApi.create(data)
      groups.value.push(group)
      return group
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to create group'
      return null
    } finally {
      creatingGroup.value = false
    }
  }

  async function updateGroup(id: string, data: Partial<TestGroup>): Promise<TestGroup | null> {
    error.value = null
    try {
      const updated = await groupApi.update(id, data)
      const index = groups.value.findIndex(g => g.id === id)
      if (index >= 0) groups.value[index] = updated
      return updated
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to update group'
      return null
    }
  }

  async function deleteGroup(id: string): Promise<boolean> {
    error.value = null
    try {
      await groupApi.remove(id)
      groups.value = groups.value.filter(g => g.id !== id)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to delete group'
      return false
    }
  }

  async function executeGroup(id: string, aiConfig: any): Promise<GroupRun | null> {
    executingGroupId.value = id
    error.value = null
    try {
      const run = await groupApi.execute(id, aiConfig)
      groupRuns.value.push(run)
      return run
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to execute group'
      return null
    } finally {
      executingGroupId.value = null
    }
  }

  async function fetchGroupRuns(groupId: string) {
    fetchingRuns.value = true
    error.value = null
    try {
      const runs = await groupApi.getRuns(groupId)
      // Merge: remove old runs for this group, add fresh ones
      groupRuns.value = [
        ...groupRuns.value.filter(r => r.groupId !== groupId),
        ...runs,
      ]
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch group runs'
    } finally {
      fetchingRuns.value = false
    }
  }

  async function fetchGroupRun(runId: string): Promise<GroupRun | null> {
    try {
      return await groupApi.getRun(runId)
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch group run'
      return null
    }
  }

  return {
    // State
    groups,
    groupRuns,
    fetchingGroups,
    creatingGroup,
    executingGroupId,
    fetchingRuns,
    error,
    // Actions
    clearError,
    findGroup,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    executeGroup,
    fetchGroupRuns,
    fetchGroupRun,
  }
})
