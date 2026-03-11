import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TestRequest } from '@shared/types'
import { useConfigStore } from './config'
import { testApi } from '@/services/testApi'
import { recordingApi } from '@/services/recordingApi'

export const useTestStore = defineStore('tests', () => {
  const tests = ref<TestRequest[]>([])

  // Per-action loading flags
  const fetchingTests = ref(false)
  const creatingTest = ref(false)
  const executingTestId = ref<string | null>(null)

  const error = ref<string | null>(null)

  function clearError() {
    error.value = null
  }

  function findTest(testId: string) {
    return tests.value.find(t => t.id === testId)
  }

  async function fetchTests() {
    fetchingTests.value = true
    error.value = null
    try {
      tests.value = await testApi.getAll()
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch tests'
    } finally {
      fetchingTests.value = false
    }
  }

  async function fetchTest(testId: string): Promise<TestRequest> {
    try {
      return await testApi.getById(testId)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch test'
      throw err
    }
  }

  async function createTest(testData: Record<string, any>): Promise<TestRequest> {
    const configStore = useConfigStore()
    creatingTest.value = true
    error.value = null
    try {
      const newTest = await testApi.create(testData, configStore.aiConfig)
      tests.value.push(newTest)
      return newTest
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create test'
      throw err
    } finally {
      creatingTest.value = false
    }
  }

  async function executeTest(testId: string) {
    const configStore = useConfigStore()
    executingTestId.value = testId
    error.value = null
    try {
      const result = await testApi.execute(testId, configStore.aiConfig)
      return result
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to execute test'
      throw err
    } finally {
      executingTestId.value = null
    }
  }

  async function updateTest(testId: string, data: Partial<TestRequest>) {
    error.value = null
    try {
      const updated = await testApi.update(testId, data)
      const index = tests.value.findIndex(t => t.id === testId)
      if (index >= 0) {
        tests.value[index] = { ...tests.value[index], ...updated }
      }
      return updated
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update test'
      throw err
    }
  }

  async function deleteTest(testId: string) {
    error.value = null
    try {
      await testApi.delete(testId)
      tests.value = tests.value.filter(t => t.id !== testId)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete test'
      throw err
    }
  }

  async function archiveTest(testId: string) {
    error.value = null
    try {
      await testApi.archive(testId)
      const index = tests.value.findIndex(t => t.id === testId)
      if (index >= 0) {
        tests.value[index].archived = true
        tests.value[index].archivedAt = new Date()
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to archive test'
      throw err
    }
  }

  async function unarchiveTest(testId: string) {
    error.value = null
    try {
      await testApi.unarchive(testId)
      const index = tests.value.findIndex(t => t.id === testId)
      if (index >= 0) {
        tests.value[index].archived = false
        delete tests.value[index].archivedAt
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to unarchive test'
      throw err
    }
  }

  async function clearCachedSteps(testId: string) {
    error.value = null
    try {
      await testApi.clearCache(testId)
      const index = tests.value.findIndex(t => t.id === testId)
      if (index >= 0) {
        tests.value[index].cachedSteps = []
        delete tests.value[index].lastSuccessfulRun
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to clear cached steps'
      throw err
    }
  }

  async function recordTest(url: string, device?: string) {
    const configStore = useConfigStore()
    error.value = null
    try {
      return await recordingApi.start(url, configStore.aiConfig, device)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to record test'
      throw err
    }
  }

  return {
    // State
    tests,
    fetchingTests,
    creatingTest,
    executingTestId,
    error,

    // Actions
    clearError,
    findTest,
    fetchTests,
    fetchTest,
    createTest,
    executeTest,
    updateTest,
    deleteTest,
    archiveTest,
    unarchiveTest,
    clearCachedSteps,
    recordTest
  }
})
