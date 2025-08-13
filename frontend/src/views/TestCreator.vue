<template>
  <div class="max-w-4xl mx-auto">
    <div class="bg-white shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
          Create New Test
        </h3>
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
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

          <!-- Submit Button -->
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="$router.push('/')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="testStore.loading"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {{ testStore.loading ? 'Creating...' : 'Create & Run Test' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { useConfigStore } from '@/stores/config'

const router = useRouter()
const testStore = useTestStore()
const configStore = useConfigStore()

const form = ref({
  description: '',
  credentials: {
    username: '',
    password: ''
  }
})

const formInputs = ref<Array<{ key: string; value: string }>>([])
const expectedOutcomesText = ref('')

const addFormInput = () => {
  formInputs.value.push({ key: '', value: '' })
}

const removeFormInput = (index: number) => {
  formInputs.value.splice(index, 1)
}

const handleSubmit = async () => {
  try {
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

    const testData = {
      description: form.value.description,
      credentials: form.value.credentials.username ? form.value.credentials : undefined,
      formInputs: Object.keys(formData).length > 0 ? formData : undefined,
      expectedOutcomes: expectedOutcomes.length > 0 ? expectedOutcomes : undefined,
      aiModel: configStore.aiConfig.model
    }

    const test = await testStore.createTest(testData)
    await testStore.executeTest(test.id)
    
    router.push(`/tests/${test.id}/results`)
  } catch (error) {
    console.error('Failed to create test:', error)
  }
}
</script>