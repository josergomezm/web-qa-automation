import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AIConfig } from '@shared/types'
import { setBaseUrl } from '@/services/api'

const STORAGE_KEY = 'qa-automation-config'

export const useConfigStore = defineStore('config', () => {
  const aiConfig = ref<AIConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    endpoint: ''
  })

  const backendUrl = ref(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080')

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      aiConfig: aiConfig.value,
      backendUrl: backendUrl.value
    }))
    setBaseUrl(backendUrl.value)
  }

  function loadConfig() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.aiConfig) aiConfig.value = config.aiConfig
        if (config.backendUrl) backendUrl.value = config.backendUrl
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setBaseUrl(backendUrl.value)
  }

  return { aiConfig, backendUrl, saveConfig, loadConfig }
})
