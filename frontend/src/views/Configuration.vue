<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
          Configuration
        </h3>

        <form @submit.prevent="saveConfiguration" class="space-y-6">
          <!-- Backend URL -->
          <div>
            <label for="backend-url" class="block text-sm font-medium text-gray-700">
              Backend URL
            </label>
            <input id="backend-url" v-model="configStore.backendUrl" type="url"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://your-backend-url.com" />
          </div>

          <!-- AI Provider -->
          <div>
            <label for="ai-provider" class="block text-sm font-medium text-gray-700">
              AI Provider
            </label>
            <select id="ai-provider" v-model="configStore.aiConfig.provider"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <!-- API Key -->
          <div>
            <label for="api-key" class="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <input id="api-key" v-model="configStore.aiConfig.apiKey" type="password"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your API key" required />
            <p class="mt-1 text-sm text-gray-500">
              Your API key is stored locally and sent securely to the backend. This is required to generate test steps
              from your natural language descriptions.
            </p>
            <div v-if="!configStore.aiConfig.apiKey" class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p class="text-sm text-yellow-800">
                ⚠️ API key is required to create and run tests. Get your API key from:
              </p>
              <ul class="text-sm text-yellow-800 mt-1 ml-4 list-disc">
                <li v-if="configStore.aiConfig.provider === 'openai'">
                  <a href="https://platform.openai.com/api-keys" target="_blank" class="underline">OpenAI Platform</a>
                </li>
                <li v-else-if="configStore.aiConfig.provider === 'anthropic'">
                  <a href="https://console.anthropic.com/" target="_blank" class="underline">Anthropic Console</a>
                </li>
                <li v-else-if="configStore.aiConfig.provider === 'google'">
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline">Google AI
                    Studio</a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Model -->
          <div>
            <label for="model" class="block text-sm font-medium text-gray-700">
              Model
            </label>
            <select id="model" v-model="configStore.aiConfig.model"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <template v-if="configStore.aiConfig.provider === 'openai'">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </template>
              <template v-else-if="configStore.aiConfig.provider === 'anthropic'">
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
              </template>
              <template v-else-if="configStore.aiConfig.provider === 'google'">
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite
                </option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite Preview</option>
                <option value="gemini-2.0-flash-001">Gemini 2.0 Flash
                </option>
              </template>
              <template v-else>
                <option value="custom-model">Custom Model</option>
              </template>
            </select>
          </div>

          <!-- Custom Endpoint (for custom provider) -->
          <div v-if="configStore.aiConfig.provider === 'custom'">
            <label for="endpoint" class="block text-sm font-medium text-gray-700">
              Custom Endpoint
            </label>
            <input id="endpoint" v-model="configStore.aiConfig.endpoint" type="url"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://your-custom-endpoint.com/api" />
          </div>

          <!-- Test Connection -->
          <div class="border-t pt-4">
            <button type="button" @click="testConnection" :disabled="testing"
              class="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </button>

            <div v-if="connectionStatus" class="mt-2">
              <div :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                connectionStatus.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              ]">
                {{ connectionStatus.message }}
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end space-x-3">
            <button type="button" @click="$router.push('/')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import axios from 'axios'

const router = useRouter()
const configStore = useConfigStore()

const testing = ref(false)
const connectionStatus = ref<{ success: boolean; message: string } | null>(null)

const saveConfiguration = () => {
  configStore.saveConfig()
  router.push('/')
}

const testConnection = async () => {
  testing.value = true
  connectionStatus.value = null

  try {
    // Test backend connection
    const response = await axios.get(`${configStore.backendUrl}/health`)

    if (response.status === 200) {
      connectionStatus.value = {
        success: true,
        message: 'Connection successful!'
      }
    } else {
      throw new Error('Backend not responding')
    }
  } catch (error) {
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
})
</script>