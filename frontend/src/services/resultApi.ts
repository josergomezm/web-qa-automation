import api from './api'
import type { TestResult } from '@shared/types'

export const resultApi = {
  getAll() {
    return api.get<TestResult[]>('/api/results')
  },

  getActive() {
    return api.get<TestResult[]>('/api/results/active/list')
  },

  getArchived() {
    return api.get<TestResult[]>('/api/results/archived/list')
  },

  getById(resultId: string) {
    return api.get<TestResult>(`/api/results/${resultId}`)
  },

  getByTestId(testId: string) {
    return api.get<TestResult[]>(`/api/results/test/${testId}`)
  },

  delete(resultId: string) {
    return api.delete(`/api/results/${resultId}`)
  },

  archive(resultId: string) {
    return api.patch(`/api/results/${resultId}/archive`)
  },

  unarchive(resultId: string) {
    return api.patch(`/api/results/${resultId}/unarchive`)
  }
}
