import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TestResult } from '@shared/types'
import { resultApi } from '@/services/resultApi'

export const useResultStore = defineStore('results', () => {
  const results = ref<TestResult[]>([])
  const fetchingResults = ref(false)
  const error = ref<string | null>(null)

  function clearError() {
    error.value = null
  }

  async function fetchResults() {
    fetchingResults.value = true
    error.value = null
    try {
      results.value = await resultApi.getAll()
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch results'
    } finally {
      fetchingResults.value = false
    }
  }

  async function fetchResult(resultId: string): Promise<TestResult> {
    try {
      return await resultApi.getById(resultId)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch result'
      throw err
    }
  }

  async function fetchResultsByTestId(testId: string): Promise<TestResult[]> {
    fetchingResults.value = true
    error.value = null
    try {
      const data = await resultApi.getByTestId(testId)
      results.value = data
      return data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch test results'
      throw err
    } finally {
      fetchingResults.value = false
    }
  }

  async function deleteResult(resultId: string) {
    error.value = null
    try {
      await resultApi.delete(resultId)
      results.value = results.value.filter(r => r.id !== resultId)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete result'
      throw err
    }
  }

  async function archiveResult(resultId: string) {
    error.value = null
    try {
      await resultApi.archive(resultId)
      const index = results.value.findIndex(r => r.id === resultId)
      if (index >= 0) {
        results.value[index].archived = true
        results.value[index].archivedAt = new Date()
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to archive result'
      throw err
    }
  }

  async function unarchiveResult(resultId: string) {
    error.value = null
    try {
      await resultApi.unarchive(resultId)
      const index = results.value.findIndex(r => r.id === resultId)
      if (index >= 0) {
        results.value[index].archived = false
        delete results.value[index].archivedAt
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to unarchive result'
      throw err
    }
  }

  return {
    // State
    results,
    fetchingResults,
    error,

    // Actions
    clearError,
    fetchResults,
    fetchResult,
    fetchResultsByTestId,
    deleteResult,
    archiveResult,
    unarchiveResult
  }
})
