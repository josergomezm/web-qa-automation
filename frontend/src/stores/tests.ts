import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { TestRequest, TestResult } from '@shared/types'
import { useConfigStore } from './config'

export const useTestStore = defineStore('tests', () => {
  const tests = ref<TestRequest[]>([])
  const results = ref<TestResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const configStore = useConfigStore()

  const createTest = async (testData: Omit<TestRequest, 'id' | 'createdAt'>) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('Creating test with AI config:', {
        provider: configStore.aiConfig.provider,
        hasApiKey: !!configStore.aiConfig.apiKey,
        model: configStore.aiConfig.model
      })

      const response = await axios.post(`${configStore.backendUrl}/api/tests`, {
        ...testData,
        aiConfig: configStore.aiConfig
      })
      
      const newTest = response.data
      tests.value.push(newTest)
      return newTest
    } catch (err: any) {
      console.error('Create test error:', err.response?.data)
      error.value = err.response?.data?.message || 'Failed to create test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const executeTest = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('Executing test with AI config:', {
        provider: configStore.aiConfig.provider,
        hasApiKey: !!configStore.aiConfig.apiKey,
        model: configStore.aiConfig.model
      })

      const response = await axios.post(`${configStore.backendUrl}/api/tests/${testId}/execute`, {
        aiConfig: configStore.aiConfig
      })
      const result = response.data
      results.value.push(result)
      return result
    } catch (err: any) {
      console.error('Execute test error:', err.response?.data)
      error.value = err.response?.data?.message || 'Failed to execute test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAllTests = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/tests`)
      tests.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch tests'
    } finally {
      loading.value = false
    }
  }

  const getTestResults = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/results`)
      results.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch results'
    } finally {
      loading.value = false
    }
  }

  const archiveTest = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.patch(`${configStore.backendUrl}/api/tests/${testId}/archive`)
      // Update local state
      const testIndex = tests.value.findIndex(t => t.id === testId)
      if (testIndex >= 0) {
        tests.value[testIndex].archived = true
        tests.value[testIndex].archivedAt = new Date()
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to archive test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const unarchiveTest = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.patch(`${configStore.backendUrl}/api/tests/${testId}/unarchive`)
      // Update local state
      const testIndex = tests.value.findIndex(t => t.id === testId)
      if (testIndex >= 0) {
        tests.value[testIndex].archived = false
        delete tests.value[testIndex].archivedAt
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to unarchive test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const archiveResult = async (resultId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.patch(`${configStore.backendUrl}/api/results/${resultId}/archive`)
      // Update local state
      const resultIndex = results.value.findIndex(r => r.id === resultId)
      if (resultIndex >= 0) {
        results.value[resultIndex].archived = true
        results.value[resultIndex].archivedAt = new Date()
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to archive result'
      throw err
    } finally {
      loading.value = false
    }
  }

  const unarchiveResult = async (resultId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.patch(`${configStore.backendUrl}/api/results/${resultId}/unarchive`)
      // Update local state
      const resultIndex = results.value.findIndex(r => r.id === resultId)
      if (resultIndex >= 0) {
        results.value[resultIndex].archived = false
        delete results.value[resultIndex].archivedAt
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to unarchive result'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getActiveTests = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/tests/active/list`)
      tests.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch active tests'
    } finally {
      loading.value = false
    }
  }

  const getArchivedTests = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/tests/archived/list`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch archived tests'
      return []
    } finally {
      loading.value = false
    }
  }

  const getActiveResults = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/results/active/list`)
      results.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch active results'
    } finally {
      loading.value = false
    }
  }

  const getArchivedResults = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/results/archived/list`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch archived results'
      return []
    } finally {
      loading.value = false
    }
  }

  const getResult = async (resultId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/results/${resultId}`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch result'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getResultsByTestId = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/results/test/${testId}`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch test results'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getTest = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${configStore.backendUrl}/api/tests/${testId}`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTest = async (testId: string, updateData: Partial<TestRequest>) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.patch(`${configStore.backendUrl}/api/tests/${testId}`, updateData)
      
      // Update local state
      const testIndex = tests.value.findIndex(t => t.id === testId)
      if (testIndex >= 0) {
        tests.value[testIndex] = { ...tests.value[testIndex], ...response.data }
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearCachedSteps = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.delete(`${configStore.backendUrl}/api/tests/${testId}/cache`)
      // Update local state
      const testIndex = tests.value.findIndex(t => t.id === testId)
      if (testIndex >= 0) {
        tests.value[testIndex].cachedSteps = []
        delete tests.value[testIndex].lastSuccessfulRun
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to clear cached steps'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTest = async (testId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.delete(`${configStore.backendUrl}/api/tests/${testId}`)
      // Remove from local state
      tests.value = tests.value.filter(t => t.id !== testId)
      // Also remove any results for this test
      results.value = results.value.filter(r => r.testRequestId !== testId)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete test'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteResult = async (resultId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await axios.delete(`${configStore.backendUrl}/api/results/${resultId}`)
      // Remove from local state
      results.value = results.value.filter(r => r.id !== resultId)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete result'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    tests,
    results,
    loading,
    error,
    createTest,
    executeTest,
    getAllTests,
    getTestResults,
    archiveTest,
    unarchiveTest,
    archiveResult,
    unarchiveResult,
    getActiveTests,
    getArchivedTests,
    getActiveResults,
    getArchivedResults,
    getResult,
    getResultsByTestId,
    getTest,
    updateTest,
    clearCachedSteps,
    deleteTest,
    deleteResult
  }
})