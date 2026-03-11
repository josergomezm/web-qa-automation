<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Create New Test">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-heading/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-surface rounded-modal text-left overflow-hidden shadow-card-hover transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div class="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-serif text-xl text-heading">
              Create New Test
            </h3>
            <button @click="closeModal" class="text-muted hover:text-heading transition-colors duration-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Base URL -->
            <div>
              <label for="baseUrl" class="block text-sm font-medium text-heading">
                Base URL
              </label>
              <div class="mt-1">
                <input id="baseUrl" v-model="form.baseUrl" type="url"
                  class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary sm:text-sm"
                  placeholder="https://example.com" required />
              </div>
              <p class="text-secondary text-sm mt-1">
                The website URL where the test should start.
                <span v-if="suggestedBaseUrl" class="block text-primary text-xs mt-1">
                  Suggested from prerequisites: {{ suggestedBaseUrl }}
                  <button type="button" @click="form.baseUrl = suggestedBaseUrl"
                    class="ml-1 text-primary underline">Use this</button>
                </span>
              </p>
            </div>

            <!-- Prerequisite Tests -->
            <div>
              <label class="block text-sm font-medium text-heading mb-2">
                Prerequisite Tests (optional)
              </label>
              <p class="text-secondary text-sm mb-2">
                Select tests that should run before this test (e.g., login, setup steps).
              </p>
              <div class="space-y-2 max-h-32 overflow-y-auto border border-border rounded-card p-3">
                <div v-if="availableReusableTests.length === 0" class="text-secondary text-sm p-2">
                  No reusable tests available. Mark existing tests as reusable to use them here.
                  <br><small>Total tests loaded: {{ testStore.tests.length }}</small>
                  <br><small>Reusable tests count: {{ availableReusableTests.length }}</small>
                </div>
                <label v-for="test in availableReusableTests" :key="test.id" class="flex items-center space-x-2">
                  <input type="checkbox" :value="test.id" v-model="selectedPrerequisites"
                    class="rounded border-border text-primary focus:ring-primary/20" />
                  <span class="text-sm text-heading">{{ test.name ? test.name : test.description }}</span>
                  <span class="text-xs text-secondary">({{ test.tags?.join(', ') || 'No tags' }})</span>
                </label>
              </div>
            </div>

            <!-- Test Name (Optional) -->
            <div>
              <label for="name" class="block text-sm font-medium text-heading">
                Test Name (Optional)
              </label>
              <input id="name" v-model="form.name" type="text"
                class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary"
                placeholder="My Custom Test Name" />
            </div>

            <!-- Test Description -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label for="description" class="block text-sm font-medium text-heading">
                  Test Description
                </label>
                <button type="button" @click="openRecordingModal"
                  :disabled="!form.baseUrl || selectedPrerequisites.length > 0"
                  class="inline-flex items-center px-3 py-1 border border-border rounded-button bg-surface text-xs font-medium text-heading hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  :title="selectedPrerequisites.length > 0 ? 'Recording is disabled when a prerequisite is selected' : 'Record actions in a browser'">
                  <span class="flex items-center text-red-600">
                    <svg class="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="7" />
                    </svg>
                    Record Actions
                  </span>
                </button>
              </div>
              <p v-if="selectedPrerequisites.length > 0" class="text-xs text-warning mb-2">
                <span class="font-medium">Note:</span> Recording is disabled when a prerequisite is selected because the
                starting state depends on the prerequisite's execution.
              </p>
              <p class="text-secondary text-sm mb-2">
                Describe what you want to test in natural language. Be specific about the steps and expected outcomes.
              </p>
              <textarea id="description" v-model="form.description" rows="4"
                class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary"
                placeholder="Example: Login to the website using the provided credentials, navigate to the dashboard, fill out the contact form with the given information, and verify that a success message appears."
                required />
            </div>

            <!-- Credentials Section -->
            <div>
              <label class="block text-sm font-medium text-heading mb-2">
                Login Credentials (if needed)
              </label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input v-model="form.credentials.username" type="text" placeholder="Username or Email"
                    class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <input v-model="form.credentials.password" type="password" placeholder="Password"
                    class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
            </div>

            <!-- Form Inputs Section -->
            <div>
              <label class="block text-sm font-medium text-heading mb-2">
                Form Data (if needed)
              </label>
              <div class="space-y-2">
                <div v-for="(input, index) in formInputs" :key="index" class="flex gap-2">
                  <input v-model="input.key" type="text" placeholder="Field name"
                    class="flex-1 border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                  <input v-model="input.value" type="text" placeholder="Value"
                    class="flex-1 border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                  <button type="button" @click="removeFormInput(index)"
                    class="px-3 py-2 text-danger hover:text-danger/80">
                    Remove
                  </button>
                </div>
                <button type="button" @click="addFormInput" class="text-primary hover:text-primary-hover text-sm">
                  + Add Form Field
                </button>
              </div>
            </div>

            <!-- Test Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="flex items-center space-x-2">
                  <input type="checkbox" v-model="form.isReusable"
                    class="rounded border-border text-primary focus:ring-primary/20" />
                  <span class="text-sm font-medium text-heading">Mark as reusable</span>
                </label>
                <p class="text-xs text-secondary mt-1">Allow this test to be used as a prerequisite for other tests</p>
              </div>
              <div>
                <label for="tags" class="block text-sm font-medium text-heading">
                  Tags (optional)
                </label>
                <input id="tags" v-model="tagsText" type="text" placeholder="login, setup, navigation"
                  class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                <p class="text-xs text-secondary mt-1">Comma-separated tags for categorizing this test</p>
              </div>
            </div>

            <!-- Wait Configuration -->
            <div class="bg-cream p-4 rounded-card border border-border">
              <h4 class="text-sm font-semibold text-heading mb-3">Wait & Timing Settings</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="globalWait" class="block text-sm font-medium text-heading">
                    Global wait time (ms)
                  </label>
                  <input id="globalWait" v-model.number="form.globalWaitTime" type="number" min="0" max="10000"
                    step="100" placeholder="1000"
                    class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                  <p class="text-xs text-secondary mt-1">Default wait time between each step</p>
                </div>
                <div>
                  <label for="maxRetries" class="block text-sm font-medium text-heading">
                    Max Retries
                  </label>
                  <input id="maxRetries" v-model.number="form.maxRetries" type="number" min="0" max="5"
                    class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
                  <p class="text-xs text-secondary mt-1">Retry attempts with AI refinement</p>
                </div>
                <div>
                  <label class="flex items-center space-x-2 mt-6">
                    <input type="checkbox" v-model="form.waitForElements"
                      class="rounded border-border text-primary focus:ring-primary/20" />
                    <span class="text-sm font-medium text-heading">Smart element waiting</span>
                  </label>
                  <p class="text-xs text-secondary mt-1">Automatically wait for elements to be visible/clickable</p>
                </div>
              </div>
            </div>

            <!-- Expected Outcomes -->
            <div>
              <label for="outcomes" class="block text-sm font-medium text-heading">
                Expected Outcomes (optional)
              </label>
              <p class="text-secondary text-sm mb-2">
                List specific things you expect to see or happen during the test.
              </p>
              <textarea id="outcomes" v-model="expectedOutcomesText" rows="3"
                class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary"
                placeholder="Example: Success message should appear, User should be redirected to dashboard, Form should be submitted without errors" />
            </div>

            <!-- Recorded Steps Display -->
            <div v-if="recordedSteps.length > 0" class="mt-4 bg-cream p-4 rounded-card border border-border">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-heading">Recorded Steps ({{ recordedSteps.length }})</h4>
                <button @click="clearRecording" type="button"
                  class="text-xs text-danger hover:text-danger/80">Clear</button>
              </div>
              <div class="max-h-40 overflow-y-auto text-xs font-mono bg-surface p-3 rounded-button border border-border">
                <div v-for="(step, index) in recordedSteps" :key="index"
                  class="mb-1 border-b border-border last:border-0 pb-1 last:pb-0">
                  <span class="font-bold text-primary">{{ index + 1 }}. {{ step.action }}</span>
                  <span v-if="step.element" class="text-secondary"> on {{ step.element }}</span>
                  <span v-if="step.value" class="text-success"> value="{{ step.value }}"</span>
                </div>
              </div>
              <p class="text-xs text-success mt-2 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                These steps will be used instead of AI generation.
              </p>
            </div>
          </form>
        </div>

        <!-- Modal footer -->
        <div class="bg-cream/50 px-4 py-3 border-t border-border sm:px-6 sm:flex sm:flex-row-reverse">
          <button @click="handleSubmit" :disabled="testStore.creatingTest"
            class="w-full inline-flex justify-center rounded-button border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-semibold text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
            {{ testStore.creatingTest ? 'Creating...' : 'Create & Run Test' }}
          </button>
          <button @click="closeModal" type="button"
            class="mt-3 w-full inline-flex justify-center rounded-button border border-border shadow-sm px-4 py-2 bg-surface text-base font-medium text-secondary hover:text-heading hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Recording Modal -->
  <RecordingModal :is-open="showRecordingModal" :url="form.baseUrl" @close="showRecordingModal = false"
    @completed="handleRecordingCompleted" />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTestStore } from '@/stores/tests'
import { useConfigStore } from '@/stores/config'
import RecordingModal from './RecordingModal.vue'

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
const recordedSteps = ref<any[]>([])
const showRecordingModal = ref(false)

const availableReusableTests = computed(() => {
  return testStore.tests.filter(test => test.isReusable && !test.archived)
})

const suggestedBaseUrl = computed(() => {
  if (selectedPrerequisites.value.length === 0) return null

  const prerequisiteTests = selectedPrerequisites.value
    .map(id => testStore.findTest(id))
    .filter(test => test && test.baseUrl)

  if (prerequisiteTests.length === 0) return null

  const baseUrls = [...new Set(prerequisiteTests.map(test => test!.baseUrl))]
  if (baseUrls.length === 1) return baseUrls[0]

  const urlCounts = prerequisiteTests.reduce((acc, test) => {
    acc[test!.baseUrl] = (acc[test!.baseUrl] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(urlCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null
})

const addFormInput = () => {
  formInputs.value.push({ key: '', value: '' })
}

const removeFormInput = (index: number) => {
  formInputs.value.splice(index, 1)
}

const openRecordingModal = () => {
  if (!form.value.baseUrl) {
    alert('Please enter a Base URL first')
    return
  }
  showRecordingModal.value = true
}

const recordedDevice = ref<string | undefined>(undefined)

const handleRecordingCompleted = (steps: any[], analysis?: any, device?: string) => {
  showRecordingModal.value = false
  recordedDevice.value = device
  if (steps && steps.length > 0) {
    recordedSteps.value = steps

    if (analysis) {
      form.value.description = analysis.description || `Recorded test with ${steps.length} steps on ${new Date().toLocaleString()}`

      if (analysis.credentials) {
        if (analysis.credentials.username) form.value.credentials.username = analysis.credentials.username
        if (analysis.credentials.password) form.value.credentials.password = analysis.credentials.password
      }

      if (analysis.formInputs) {
        Object.entries(analysis.formInputs).forEach(([key, value]) => {
          const exists = formInputs.value.some(i => i.key === key)
          if (!exists) {
            formInputs.value.push({ key, value: String(value) })
          }
        })
      }
    } else {
      if (!form.value.description) {
        form.value.description = `Recorded test with ${steps.length} steps on ${new Date().toLocaleString()}`
      }
    }
  }
}

const clearRecording = () => {
  recordedSteps.value = []
  recordedDevice.value = undefined
}

const closeModal = () => {
  emit('close')
}

const resetForm = () => {
  form.value = {
    name: '',
    baseUrl: '',
    description: '',
    credentials: { username: '', password: '' },
    isReusable: false,
    globalWaitTime: 1000,
    maxRetries: 0,
    waitForElements: true
  }
  formInputs.value = []
  expectedOutcomesText.value = ''
  selectedPrerequisites.value = []
  tagsText.value = ''
  recordedSteps.value = []
  showRecordingModal.value = false
}

const handleSubmit = async () => {
  try {
    if (!configStore.aiConfig.apiKey) {
      alert('Please configure your AI API key in the Configuration page before creating tests.')
      return
    }

    const formData = formInputs.value.reduce((acc, input) => {
      if (input.key && input.value) {
        acc[input.key] = input.value
      }
      return acc
    }, {} as Record<string, any>)

    const expectedOutcomes = expectedOutcomesText.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

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
      aiModel: configStore.aiConfig.model,
      cachedSteps: recordedSteps.value.length > 0 ? recordedSteps.value : undefined,
      device: recordedDevice.value || undefined
    }

    const test = await testStore.createTest(testData)
    await testStore.executeTest(test.id)
    emit('close')
    emit('testCreated', test.id)
    resetForm()
  } catch (error) {
    console.error('Failed to create test:', error)
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    testStore.fetchTests()
  } else {
    resetForm()
  }
})

watch(suggestedBaseUrl, (newUrl) => {
  if (newUrl && !form.value.baseUrl) {
    form.value.baseUrl = newUrl
  }
})
</script>
