import api from './api'
import type { TestGroup, GroupRun } from '@shared/types'

export const groupApi = {
  getAll() {
    return api.get<TestGroup[]>('/api/groups')
  },

  getById(id: string) {
    return api.get<TestGroup>(`/api/groups/${id}`)
  },

  create(data: { name: string; description?: string; testIds: string[]; tags: string[]; maxParallel: number }) {
    return api.post<TestGroup>('/api/groups', data)
  },

  update(id: string, data: Partial<TestGroup>) {
    return api.patch<TestGroup>(`/api/groups/${id}`, data)
  },

  remove(id: string) {
    return api.delete(`/api/groups/${id}`)
  },

  execute(id: string, aiConfig: any) {
    return api.post<GroupRun>(`/api/groups/${id}/execute`, { aiConfig })
  },

  getRuns(groupId: string) {
    return api.get<GroupRun[]>(`/api/groups/${groupId}/runs`)
  },

  getRun(runId: string) {
    return api.get<GroupRun>(`/api/group-runs/${runId}`)
  },
}
