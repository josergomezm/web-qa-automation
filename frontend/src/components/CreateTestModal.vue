<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Create New Test
            </h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Test Name (Optional) -->
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">
                Test Name (Optional)
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Custom Test Name"
              />
            </div>

            <!-- Test Description -->
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700">
                Test Description
              </label>
              <p class="text-sm text-gray-500 mb-2">
                Describe what you want to test in natural language. Be specific about the steps and expected outcomes.
              </p>
              <textarea
                id="description"
                v-model="form.description"
                rows="4"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: Login to the website using the provided credentials, navigate to the dashboard, fill out the contact form with the given information, and verify that a success message appears."
                required
              />
            </div>

            <!-- Credentials Section -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Login Credentials (if needed)
              </label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    v-model="form.credentials.username"
                    type="text"
                    placeholder="Username or Email"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <input
                    v-model="form.credentials.password"
                    type="password"
                    placeholder="Password"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- Form Inputs Section -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Form Data (if needed)
              </label>
              <div class="space-y-2">
                <div v-for="(input, index) in formInputs" :key="index" class="flex gap-2">
                  <input
                    v-model="input.key"
                    type="text"
                    placeholder="Field name"
                    class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    v-model="input.value"
                    type="text"
                    placeholder="Value"
                    class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    @click="removeFormInput(index)"
                    class="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <button
                  type="button"
                  @click="addFormInput"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Form Field
                </button>
              </div>
            </div>

            <!-- Prerequisite Tests -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Prerequisite Tests (optional)
              </label>
              <p class="text-sm text-gray-500 mb-2">
                Select tests that should run before this test (e.g., login, setup steps).
              </p>
              <div class="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                <div v-if="availableReusableTests.length === 0" class="text-sm text-gray-500 p-2">
                  No reusable tests available. Mark existing tests as reusable to use them here.
                  <br><small>Total tests loaded: {{ testStore.tests.length }}</small>
                  <br><small>Reusable tests count: {{ availableReusableTests.length }}</small>
                </div>
                <label v-for="test in availableReusableTests" :key="test.id" class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    :value="test.id"
                    v-model="selectedPrerequisites"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">{{ test.name ? `${test.name} - ` : '' }}{{ test.description }}</span>
                  <span class="text-xs text-gray-500">({{ test.tags?.join(', ') || 'No tags' }})</span>
                </label>
              </div>
            </div>

            <!-- Test Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="form.isReusable"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm font-medium text-gray-700">Mark as reusable</span>
                </label>
                <p class="text-xs text-gray-500 mt-1">Allow this test to be used as a prerequisite for other tests</p>
              </div>
              <div>
                <label for="tags" class="block text-sm font-medium text-gray-700">
                  Tags (optional)
                </label>
                <input
                  id="tags"
                  v-model="tagsText"
                  type="text"
                  placeholder="login, setup, navigation"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">Comma-separated tags for categorizing this test</p>
              </div>
            </div>

            <!-- Wait Configuration -->
            <div class="bg-gray-50 p-4 rounded-md">
              <h4 class="text-sm font-medium text-gray-900 mb-3">Wait & Timing Settings</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="globalWait" class="block text-sm font-medium text-gray-700">
                    Global wait time (ms)
                  </label>
                  <input
                    id="globalWait"
                    v-model.number="form.globalWaitTime"
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    placeholder="1000"
                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">Default wait time between each step</p>
                </div>
                <div>
                  <label for="maxRetries" class="block text-sm font-medium text-gray-700">
                    Max Retries
                  </label>
                  <input
                    id="maxRetries"
                    v-model.number="form.maxRetries"
                    type="number"
                    min="0"
                    max="5"
                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">Retry attempts with AI refinement</p>
                </div>
                <div>
                  <label class="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      v-model="form.waitForElements"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-gray-700">Smart element waiting</span>
                  </label>
                  <p class="text-xs text-gray-500 mt-1">Automatically wait for elements to be visible/clickable</p>
                </div>
              </div>
            </div>

            <!-- Expected Outcomes -->
            <div>
              <label for="outcomes" class="block text-sm font-medium text-gray-700">
                Expected Outcomes (optional)
              </label>
              <p class="text-sm text-gray-500 mb-2">
                List specific things you expect to see or happen during the test.
              </p>
              <textarea
                id="outcomes"
                v-model="expectedOutcomesText"
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: Success message should appear, User should be redirected to dashboard, Form should be submitted without errors"
              />
            </div>

            <!-- Base URL -->
            <div>
              <label for="baseUrl" class="block text-sm font-medium text-gray-700">
                Base URL
              </label>
              <input
                id="baseUrl"
                v-model="form.baseUrl"
                type="url"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
                required
              />
              <p class="text-sm text-gray-500 mt-1">
                The website URL where the test should start
                <span v-if="suggestedBaseUrl" class="block text-blue-600 text-xs mt-1">
                  💡 Suggested from prerequisites: {{ suggestedBaseUrl }}
                  <button type="button" @click="form.baseUrl = suggestedBaseUrl" class="ml-1 text-blue-700 underline">Use this</button>
                </span>
              </p>
            </div>
          </form>
        </div>

        <!-- Modal footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="handleSubmit"
            :disabled="testStore.loading"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {{ testStore.loading ? 'Creating...' : 'Create & Run Test' }}
          </button>
          <button
            @click="closeModal"
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTestStore } from '@/stores/tests'
import { useConfigStore } from '@/stores/config'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'testCreated', testId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const testStore = useTestStore()
const configStore = useConfigStore()

const form = ref({
  name: '',
  baseUrl: '',
  description: '',
  credentials: {
    username: '',
    password: ''
  },
  isReusable: false,
  globalWaitTime: 1000,
  maxRetries: 0,
  waitForElements: true
})

const formInputs = ref<Array<{ key: string; value: string }>>([])
const expectedOutcomesText = ref('')
const selectedPrerequisites = ref<string[]>([])
const tagsText = ref('')
// Computed property that directly filters from the store
const availableReusableTests = computed(() => {
  const filtered = testStore.tests.filter(test => test.isReusable && !test.archived)
  console.log('Computing available reusable tests:', filtered)
  return filtered
})

// Computed property to suggest base URL from selected prerequisites
const suggestedBaseUrl = computed(() => {
  if (selectedPrerequisites.value.length === 0) return null
  
  // Get the base URLs from selected prerequisite tests
  const prerequisiteTests = selectedPrerequisites.value
    .map(id => testStore.tests.find(t => t.id === id))
    .filter(test => test && test.baseUrl)
  
  if (prerequisiteTests.length === 0) return null
  
  // If all prerequisites use the same base URL, suggest it
  const baseUrls = [...new Set(prerequisiteTests.map(test => test.baseUrl))]
  if (baseUrls.length === 1) {
    return baseUrls[0]
  }
  
  // If multiple base URLs, suggest the most common one
  const urlCounts = prerequisiteTests.reduce((acc, test) => {
    acc[test.baseUrl] = (acc[test.baseUrl] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostCommonUrl = Object.entries(urlCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0]
  
  return mostCommonUrl || null
})

const addFormInput = () => {
  formInputs.value.push({ key: '', value: '' })
}

const removeFormInput = (index: number) => {
  formInputs.value.splice(index, 1)
}

const closeModal = () => {
  emit('close')
}

const resetForm = () => {
  form.value = {
    name: '',
    baseUrl: '',
    description: '',
    credentials: {
      username: '',
      password: ''
    },
    isReusable: false,
    globalWaitTime: 1000,
    maxRetries: 0,
    waitForElements: true
  }
  formInputs.value = []
  expectedOutcomesText.value = ''
  selectedPrerequisites.value = []
  tagsText.value = ''
}

const loadReusableTests = async () => {
  try {
    await testStore.getAllTests()
  } catch (error) {
    console.error('Failed to load reusable tests:', error)
  }
}

const handleSubmit = async () => {
  try {
    // Check if API key is configured
    if (!configStore.aiConfig.apiKey) {
      alert('Please configure your AI API key in the Configuration page before creating tests.')
      return
    }

    // Convert form inputs to object
    const formData = formInputs.value.reduce((acc, input) => {
      if (input.key && input.value) {
        acc[input.key] = input.value
      }
      return acc
    }, {} as Record<string, any>)

    // Convert expected outcomes to array
    const expectedOutcomes = expectedOutcomesText.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // Convert tags to array
    const tags = tagsText.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const testData = {
      name: form.value.name || undefined,
      baseUrl: form.value.baseUrl,
      description: form.value.description,
      credentials: form.value.credentials.username ? form.value.credentials : undefined,
      formInputs: Object.keys(formData).length > 0 ? formData : undefined,
      expectedOutcomes: expectedOutcomes.length > 0 ? expectedOutcomes : undefined,
      prerequisiteTests: selectedPrerequisites.value.length > 0 ? selectedPrerequisites.value : undefined,
      isReusable: form.value.isReusable,
      tags: tags.length > 0 ? tags : undefined,
      globalWaitTime: form.value.globalWaitTime || undefined,
      maxRetries: form.value.maxRetries || 0,
      waitForElements: form.value.waitForElements,
      aiModel: configStore.aiConfig.model
    }

    emit('close')
    const test = await testStore.createTest(testData)
    await testStore.executeTest(test.id)
    emit('testCreated', test.id)
    resetForm()
  } catch (error) {
    console.error('Failed to create test:', error)
  }
}

// Reset form when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadReusableTests()
  } else {
    resetForm()
  }
})

// Auto-populate base URL when prerequisites change (if base URL is empty)
watch(suggestedBaseUrl, (newUrl) => {
  if (newUrl && !form.value.baseUrl) {
    form.value.baseUrl = newUrl
  }
})
</script>