import api from './api'
import type { TestRequest, AIConfig } from '@shared/types'

export const testApi = {
  getAll() {
    return api.get<TestRequest[]>('/api/tests')
  },

  getActive() {
    return api.get<TestRequest[]>('/api/tests/active/list')
  },

  getArchived() {
    return api.get<TestRequest[]>('/api/tests/archived/list')
  },

  getById(testId: string) {
    return api.get<TestRequest>(`/api/tests/${testId}`)
  },

  create(testData: Record<string, any>, aiConfig: AIConfig) {
    return api.post<TestRequest>('/api/tests', { ...testData, aiConfig })
  },

  execute(testId: string, aiConfig: AIConfig) {
    return api.post(`/api/tests/${testId}/execute`, { aiConfig })
  },

  update(testId: string, data: Partial<TestRequest>) {
    return api.patch<TestRequest>(`/api/tests/${testId}`, data)
  },

  delete(testId: string) {
    return api.delete(`/api/tests/${testId}`)
  },

  archive(testId: string) {
    return api.patch(`/api/tests/${testId}/archive`)
  },

  unarchive(testId: string) {
    return api.patch(`/api/tests/${testId}/unarchive`)
  },

  clearCache(testId: string) {
    return api.delete(`/api/tests/${testId}/cache`)
  }
}
