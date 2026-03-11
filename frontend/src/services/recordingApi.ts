import api from './api'
import type { AIConfig } from '@shared/types'

export const recordingApi = {
  start(url: string, aiConfig: AIConfig) {
    return api.post<{ steps: any[]; analysis?: any }>('/api/recording/start', { url, aiConfig })
  }
}
