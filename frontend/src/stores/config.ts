import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AIConfig } from '@shared/types'

export const useConfigStore = defineStore('config', () => {
  const aiConfig = ref<AIConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    endpoint: ''
  })

  const backendUrl = ref(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080')

  const saveConfig = () => {
    localStorage.setItem('qa-automation-config', JSON.stringify({
      aiConfig: aiConfig.value,
      backendUrl: backendUrl.value
    }))
  }

  const loadConfig = () => {
    const saved = localStorage.getItem('qa-automation-config')
    if (saved) {
      const config = JSON.parse(saved)
      aiConfig.value = config.aiConfig || aiConfig.value
      backendUrl.value = config.backendUrl || backendUrl.value
    }
  }

  return {
    aiConfig,
    backendUrl,
    saveConfig,
    loadConfig
  }
})