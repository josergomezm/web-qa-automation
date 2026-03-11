<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Edit Test Settings">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-heading/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-surface rounded-modal text-left overflow-hidden shadow-card-hover transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-serif text-xl text-heading">
              Edit Test Settings
            </h3>
            <button @click="closeModal" class="text-muted hover:text-heading transition-colors duration-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Error display -->
          <div v-if="testStore.error" class="bg-danger-bg border border-danger/20 rounded-md p-4 mb-4">
            <p class="text-danger">{{ testStore.error }}</p>
          </div>

          <div v-if="test" class="space-y-6">
            <!-- Test Info (Read-only) -->
            <div class="bg-cream p-4 rounded-card border border-border">
              <h4 class="font-medium text-heading mb-2">{{ test.name || `Test #${test.id.slice(-8)}` }}</h4>
              <p class="text-sm text-secondary">{{ test.description }}</p>
              <p class="text-xs text-secondary mt-1">{{ test.baseUrl }}</p>
            </div>

            <!-- Test Name -->
            <div>
              <label for="name" class="block text-sm font-medium text-heading mb-2">
                Test Name (Optional)
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary"
                placeholder="My Custom Test Name"
              />
            </div>

            <!-- Reusable Setting -->
            <div>
              <label class="flex items-center space-x-3">
                <input type="checkbox" v-model="form.isReusable"
                  class="rounded border-border text-primary focus:ring-primary/20" />
                <div>
                  <span class="text-sm font-medium text-heading">Mark as reusable</span>
                  <p class="text-xs text-secondary">Allow this test to be used as a prerequisite for other tests</p>
                </div>
              </label>
            </div>

            <!-- Tags -->
            <div>
              <label for="tags" class="block text-sm font-medium text-heading mb-2">
                Tags
              </label>
              <input id="tags" v-model="tagsText" type="text" placeholder="login, setup, navigation"
                class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary" />
              <p class="text-xs text-secondary mt-1">Comma-separated tags for categorizing this test</p>

              <!-- Current tags display -->
              <div v-if="currentTags.length > 0" class="mt-2">
                <p class="text-xs text-secondary mb-1">Current tags:</p>
                <div class="flex flex-wrap gap-1">
                  <span v-for="tag in currentTags" :key="tag"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-light text-primary">
                    {{ tag }}
                  </span>
                </div>
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

            <!-- Prerequisites (Read-only for now) -->
            <div v-if="test.prerequisiteTests && test.prerequisiteTests.length > 0">
              <label class="block text-sm font-medium text-heading mb-2">
                Current Prerequisites
              </label>
              <div class="bg-cream p-3 rounded-card border border-border">
                <div v-for="prereqId in test.prerequisiteTests" :key="prereqId"
                  class="flex items-center space-x-2 text-sm text-secondary">
                  <span class="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>{{ getTestDescription(prereqId) || `Test #${prereqId.slice(-8)}` }}</span>
                </div>
                <p class="text-xs text-secondary mt-2">
                  Note: Prerequisites can only be changed when creating a new test
                </p>
              </div>
            </div>

            <!-- Test Stats -->
            <div class="bg-primary-light p-3 rounded-card border border-primary/10">
              <h4 class="text-sm font-semibold text-primary mb-2">Test Information</h4>
              <div class="grid grid-cols-2 gap-4 text-xs text-primary">
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
        <div class="bg-cream/50 px-4 py-3 border-t border-border sm:px-6 sm:flex sm:flex-row-reverse">
          <button @click="handleSave" :disabled="saving"
            class="w-full inline-flex justify-center rounded-button border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-semibold text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
          <button @click="closeModal" type="button"
            class="mt-3 w-full inline-flex justify-center rounded-button border border-border shadow-sm px-4 py-2 bg-surface text-base font-medium text-secondary hover:text-heading hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
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
import type { TestRequest } from '@shared/types'

interface Props {
  isOpen: boolean
  test: TestRequest | null
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
const saving = ref(false)

const currentTags = computed(() => {
  return tagsText.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
})

const getTestDescription = (testId: string) => {
  return testStore.findTest(testId)?.description
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
  if (!props.test) return

  saving.value = true
  try {
    const tags = tagsText.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    await testStore.updateTest(props.test.id, {
      name: form.value.name || undefined,
      isReusable: form.value.isReusable,
      tags: tags.length > 0 ? tags : undefined,
      globalWaitTime: form.value.globalWaitTime || undefined,
      maxRetries: form.value.maxRetries || 0,
      waitForElements: form.value.waitForElements
    })

    emit('close')
  } catch (error) {
    console.error('Failed to save test:', error)
  } finally {
    saving.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.test) {
    resetForm()
  }
})
</script>
