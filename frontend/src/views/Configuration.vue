<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-surface shadow-card rounded-card border border-border">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="font-serif text-2xl text-heading mb-4">
          Configuration
        </h3>

        <form @submit.prevent="saveConfiguration" class="space-y-6">
          <!-- Backend URL -->
          <div>
            <label for="backend-url" class="block text-sm font-medium text-heading">
              Backend URL
            </label>
            <input id="backend-url" v-model="localBackendUrl" type="url"
              class="mt-1 block w-full border-border rounded-button focus:ring-primary/20 focus:border-primary"
              placeholder="https://your-backend-url.com" />
          </div>

          <!-- AI Provider -->
          <div>
            <label for="ai-provider" class="block text-sm font-medium text-heading">
              AI Provider
            </label>
            <select id="ai-provider" v-model="localAiConfig.provider"
              class="mt-1 block w-full border-border rounded-button focus:ring-primary/20 focus:border-primary">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <!-- API Key -->
          <div>
            <label for="api-key" class="block text-sm font-medium text-heading">
              API Key
            </label>
            <input id="api-key" v-model="localAiConfig.apiKey" type="password"
              class="mt-1 block w-full border-border rounded-button focus:ring-primary/20 focus:border-primary"
              placeholder="Enter your API key" required />
            <p class="mt-1 text-sm text-secondary">
              Your API key is stored locally and sent securely to the backend. This is required to generate test steps
              from your natural language descriptions.
            </p>
            <div v-if="!localAiConfig.apiKey" class="mt-2 p-3 bg-warning-bg border border-warning/20 rounded-md">
              <p class="text-sm text-warning">
                API key is required to create and run tests. Get your API key from:
              </p>
              <ul class="text-sm text-warning mt-1 ml-4 list-disc">
                <li v-if="localAiConfig.provider === 'openai'">
                  <a href="https://platform.openai.com/api-keys" target="_blank" class="underline">OpenAI Platform</a>
                </li>
                <li v-else-if="localAiConfig.provider === 'anthropic'">
                  <a href="https://console.anthropic.com/" target="_blank" class="underline">Anthropic Console</a>
                </li>
                <li v-else-if="localAiConfig.provider === 'google'">
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline">Google AI
                    Studio</a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Model -->
          <div>
            <label for="model" class="block text-sm font-medium text-heading">
              Model
            </label>
            <select id="model" v-model="localAiConfig.model"
              class="mt-1 block w-full border-border rounded-button focus:ring-primary/20 focus:border-primary">
              <template v-if="localAiConfig.provider === 'openai'">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </template>
              <template v-else-if="localAiConfig.provider === 'anthropic'">
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
              </template>
              <template v-else-if="localAiConfig.provider === 'google'">
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite Preview</option>
                <option value="gemini-2.0-flash-001">Gemini 2.0 Flash</option>
              </template>
              <template v-else>
                <option value="custom-model">Custom Model</option>
              </template>
            </select>
          </div>

          <!-- Custom Endpoint (for custom provider) -->
          <div v-if="localAiConfig.provider === 'custom'">
            <label for="endpoint" class="block text-sm font-medium text-heading">
              Custom Endpoint
            </label>
            <input id="endpoint" v-model="localAiConfig.endpoint" type="url"
              class="mt-1 block w-full border-border rounded-button focus:ring-primary/20 focus:border-primary"
              placeholder="https://your-custom-endpoint.com/api" />
          </div>

          <!-- Test Connection -->
          <div class="border-t pt-4">
            <button type="button" @click="testConnection" :disabled="testing"
              class="mr-3 px-4 py-2 border border-border rounded-button text-sm font-medium text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200 disabled:opacity-50">
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </button>

            <div v-if="connectionStatus" class="mt-2">
              <div :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                connectionStatus.success
                  ? 'bg-success-bg text-success'
                  : 'bg-danger-bg text-danger'
              ]">
                {{ connectionStatus.message }}
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end space-x-3">
            <button type="button" @click="$router.push('/')"
              class="px-4 py-2 border border-border rounded-button text-sm font-medium text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200">
              Cancel
            </button>
            <button type="submit"
              class="px-4 py-2 border border-transparent rounded-button shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-button transition-colors duration-200">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import api from '@/services/api'
import type { AIConfig } from '@shared/types'

const router = useRouter()
const configStore = useConfigStore()

const testing = ref(false)
const connectionStatus = ref<{ success: boolean; message: string } | null>(null)

const localBackendUrl = ref('')
const localAiConfig = reactive<AIConfig>({
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4',
  endpoint: ''
})

const loadLocalForm = () => {
  localBackendUrl.value = configStore.backendUrl
  localAiConfig.provider = configStore.aiConfig.provider
  localAiConfig.apiKey = configStore.aiConfig.apiKey
  localAiConfig.model = configStore.aiConfig.model
  localAiConfig.endpoint = configStore.aiConfig.endpoint || ''
}

const saveConfiguration = () => {
  configStore.backendUrl = localBackendUrl.value
  configStore.aiConfig.provider = localAiConfig.provider
  configStore.aiConfig.apiKey = localAiConfig.apiKey
  configStore.aiConfig.model = localAiConfig.model
  configStore.aiConfig.endpoint = localAiConfig.endpoint
  configStore.saveConfig()
  router.push('/')
}

const testConnection = async () => {
  testing.value = true
  connectionStatus.value = null

  try {
    await api.get('/health')
    connectionStatus.value = {
      success: true,
      message: 'Connection successful!'
    }
  } catch {
    connectionStatus.value = {
      success: false,
      message: 'Connection failed. Check your backend URL.'
    }
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  configStore.loadConfig()
  loadLocalForm()
})
</script>
