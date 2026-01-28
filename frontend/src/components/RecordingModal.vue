<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="text-center">

            <!-- State: Instructions (Pre-recording) -->
            <div v-if="status === 'instructions'" class="py-4">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">
                Start Recording
              </h3>
              <p class="text-sm text-gray-500 mb-6">
                We are about to launch a browser to record your actions.
              </p>

              <div class="bg-blue-50 border border-blue-200 rounded-md p-4 text-left mb-6">
                <h4 class="text-sm font-semibold text-blue-800 mb-2">Important Instructions:</h4>
                <ul class="text-sm text-blue-700 list-disc list-inside space-y-2">
                  <li><strong>Two windows will open:</strong> A new Browser window and a Playwright Inspector window.
                  </li>
                  <li><strong>Interactions:</strong> Perform your actions in the <span class="font-bold">Browser
                      window</span>.</li>
                  <li><strong>Do NOT close the Inspector:</strong> Keep the inspector window open during recording.</li>
                  <li><strong>To Finish:</strong> Simply <span class="font-bold text-red-600">close the Browser
                      window</span> when you are done.</li>
                </ul>
              </div>

              <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <button @click="close"
                  class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm">
                  Cancel
                </button>
                <button @click="startRecording"
                  class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm">
                  Start Recording
                </button>
              </div>
            </div>

            <!-- State: Connecting / Recording -->
            <div v-if="status === 'connecting' || status === 'recording'" class="py-6">
              <div
                class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 animate-pulse">
                <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
                  <circle cx="12" cy="12" r="4" fill="currentColor" class="animate-ping"></circle>
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">
                Recording in Progress
              </h3>
              <p class="text-sm text-gray-500 mb-6">
                Interacting with the browser...
              </p>

              <div class="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
                <p class="text-sm text-gray-700 font-medium">
                  Close the specific Browser window to finish recording.
                </p>
              </div>
            </div>

            <!-- State: Processing -->
            <div v-if="status === 'processing'" class="py-6">
              <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <svg class="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Processing Recording...
              </h3>
              <p class="text-sm text-gray-500 mt-2">
                Parsing your actions into test steps.
              </p>
            </div>

            <!-- State: Error -->
            <div v-if="status === 'error'" class="py-6">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Recording Failed
              </h3>
              <p class="text-sm text-gray-500 mt-2 mb-4">
                {{ errorMessage || 'An unexpected error occurred.' }}
              </p>
              <button @click="close"
                class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm">
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTestStore } from '@/stores/tests'

interface Props {
  isOpen: boolean
  url: string
}

interface Emits {
  (e: 'close'): void
  (e: 'completed', steps: any[], analysis?: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const testStore = useTestStore()
const status = ref<'instructions' | 'connecting' | 'recording' | 'processing' | 'error'>('instructions')
const errorMessage = ref('')

const startRecording = async () => {
  status.value = 'connecting'
  errorMessage.value = ''

  try {
    // This awaits until the backend process finishes (user closes browser)
    const result = await testStore.recordTest(props.url)
    const { steps, analysis } = result

    status.value = 'processing'

    if (steps && steps.length >= 0) {
      emit('completed', steps, analysis)
    } else {
      throw new Error('No steps were recorded.')
    }
  } catch (err: any) {
    console.error('Recording failed:', err)
    status.value = 'error'
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to record session'
  }
}

const close = () => {
  emit('close')
}

// Reset state when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    status.value = 'instructions'
    errorMessage.value = ''
  }
})

</script>
