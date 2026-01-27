<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal"></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Edit Test Settings
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Error display -->
          <div v-if="testStore.error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p class="text-red-800">{{ testStore.error }}</p>
          </div>

          <div v-if="test" class="space-y-6">
            <!-- Test Info (Read-only) -->
            <div class="bg-gray-50 p-4 rounded-md">
              <h4 class="font-medium text-gray-900 mb-2">{{ test.name || `Test #${test.id.slice(-8)}` }}</h4>
              <p class="text-sm text-gray-600">{{ test.description }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ test.baseUrl }}</p>
            </div>

            <!-- Test Name -->
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                Test Name (Optional)
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Custom Test Name"
              />
            </div>

            <!-- Reusable Setting -->
            <div>
              <label class="flex items-center space-x-3">
                <input type="checkbox" v-model="form.isReusable"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <span class="text-sm font-medium text-gray-700">Mark as reusable</span>
                  <p class="text-xs text-gray-500">Allow this test to be used as a prerequisite for other tests</p>
                </div>
              </label>
            </div>

            <!-- Tags -->
            <div>
              <label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input id="tags" v-model="tagsText" type="text" placeholder="login, setup, navigation"
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              <p class="text-xs text-gray-500 mt-1">Comma-separated tags for categorizing this test</p>

              <!-- Current tags display -->
              <div v-if="currentTags.length > 0" class="mt-2">
                <p class="text-xs text-gray-600 mb-1">Current tags:</p>
                <div class="flex flex-wrap gap-1">
                  <span v-for="tag in currentTags" :key="tag"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {{ tag }}
                  </span>
                </div>
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
                  <input id="globalWait" v-model.number="form.globalWaitTime" type="number" min="0" max="10000"
                    step="100" placeholder="1000"
                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  <p class="text-xs text-gray-500 mt-1">Default wait time between each step</p>
                </div>
                <div>
                  <label for="maxRetries" class="block text-sm font-medium text-gray-700">
                    Max Retries
                  </label>
                  <input id="maxRetries" v-model.number="form.maxRetries" type="number" min="0" max="5"
                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  <p class="text-xs text-gray-500 mt-1">Retry attempts with AI refinement</p>
                </div>
                <div>
                  <label class="flex items-center space-x-2 mt-6">
                    <input type="checkbox" v-model="form.waitForElements"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span class="text-sm font-medium text-gray-700">Smart element waiting</span>
                  </label>
                  <p class="text-xs text-gray-500 mt-1">Automatically wait for elements to be visible/clickable</p>
                </div>
              </div>
            </div>

            <!-- Prerequisites (Read-only for now) -->
            <div v-if="test.prerequisiteTests && test.prerequisiteTests.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Current Prerequisites
              </label>
              <div class="bg-gray-50 p-3 rounded-md">
                <div v-for="prereqId in test.prerequisiteTests" :key="prereqId"
                  class="flex items-center space-x-2 text-sm text-gray-600">
                  <span class="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>{{ getTestDescription(prereqId) || `Test #${prereqId.slice(-8)}` }}</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Note: Prerequisites can only be changed when creating a new test
                </p>
              </div>
            </div>

            <!-- Test Stats -->
            <div class="bg-blue-50 p-3 rounded-md">
              <h4 class="text-sm font-medium text-blue-900 mb-2">Test Information</h4>
              <div class="grid grid-cols-2 gap-4 text-xs text-blue-800">
                <div>
                  <span class="font-medium">Created:</span> {{ formatDate(test.createdAt) }}
                </div>
                <div>
                  <span class="font-medium">AI Model:</span> {{ test.aiModel }}
                </div>
                <div>
                  <span class="font-medium">Has Cached Steps:</span>
                  {{ test.cachedSteps && test.cachedSteps.length > 0 ? 'Yes' : 'No' }}
                </div>
                <div v-if="test.lastSuccessfulRun">
                  <span class="font-medium">Last Success:</span> {{ formatDate(test.lastSuccessfulRun) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button @click="handleSave" :disabled="loading"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>
          <button @click="closeModal" type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
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

interface Props {
  isOpen: boolean
  test: any | null
}

interface Emits {
  (e: 'close'): void
  (e: 'testUpdated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const testStore = useTestStore()

const form = ref({
  name: '',
  isReusable: false,
  globalWaitTime: 1000,
  maxRetries: 0,
  waitForElements: true
})

const tagsText = ref('')
const loading = ref(false)

const currentTags = computed(() => {
  return tagsText.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
})

const getTestDescription = (testId: string) => {
  const test = testStore.tests.find(t => t.id === testId)
  return test?.description
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleString()
}

const closeModal = () => {
  emit('close')
}

const resetForm = () => {
  if (props.test) {
    form.value.name = props.test.name || ''
    form.value.isReusable = props.test.isReusable || false
    form.value.globalWaitTime = props.test.globalWaitTime || 1000
    form.value.maxRetries = props.test.maxRetries || 0
    form.value.waitForElements = props.test.waitForElements !== false
    tagsText.value = props.test.tags ? props.test.tags.join(', ') : ''
  }
}

const handleSave = async () => {
  if (!props.test) {
    console.warn('No test provided, aborting save')
    return
  }

  loading.value = true
  try {
    const tags = tagsText.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const updateData = {
      name: form.value.name || undefined,
      isReusable: form.value.isReusable,
      tags: tags.length > 0 ? tags : undefined,
      globalWaitTime: form.value.globalWaitTime || undefined,
      maxRetries: form.value.maxRetries || 0,
      waitForElements: form.value.waitForElements
    }

    emit('close')
    testStore.updateTest(props.test.id, updateData)

  } catch (error) {
  } finally {
    loading.value = false
  }
}

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.test) {
    resetForm()
  }
})
</script>