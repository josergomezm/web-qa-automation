<template>
  <div class="max-w-4xl mx-auto">
    <div class="bg-surface shadow-card rounded-card border border-border">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="font-serif text-2xl text-heading mb-4">
          Create New Test
        </h3>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Base URL -->
          <div>
            <label for="baseUrl" class="block text-sm font-medium text-heading">
              Base URL
            </label>
            <input id="baseUrl" v-model="form.baseUrl" type="url"
              class="mt-1 block w-full border border-border rounded-button focus:ring-primary/20 focus:border-primary"
              placeholder="https://example.com" required />
            <p class="text-sm text-secondary mt-1">The website URL where the test should start.</p>
          </div>

          <!-- Test Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-heading">
              Test Description
            </label>
            <p class="text-sm text-secondary mb-2">
              Describe what you want to test in natural language. Be specific about the steps and expected outcomes.
            </p>
            <textarea
              id="description"
              v-model="form.description"
              rows="4"
              class="mt-1 block w-full border border-border rounded-button focus:ring-primary/20 focus:border-primary"
              placeholder="Example: Login to the website using the provided credentials, navigate to the dashboard, fill out the contact form with the given information, and verify that a success message appears."
              required
            />
          </div>

          <!-- Credentials Section -->
          <div>
            <label class="block text-sm font-medium text-heading mb-2">
              Login Credentials (if needed)
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  v-model="form.credentials.username"
                  type="text"
                  placeholder="Username or Email"
                  class="block w-full border border-border rounded-button focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <input
                  v-model="form.credentials.password"
                  type="password"
                  placeholder="Password"
                  class="block w-full border border-border rounded-button focus:ring-primary/20 focus:border-primary"
                />
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
                <input
                  v-model="input.key"
                  type="text"
                  placeholder="Field name"
                  class="flex-1 border border-border rounded-button focus:ring-primary/20 focus:border-primary"
                />
                <input
                  v-model="input.value"
                  type="text"
                  placeholder="Value"
                  class="flex-1 border border-border rounded-button focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  @click="removeFormInput(index)"
                  class="px-3 py-2 text-danger hover:text-danger/80 transition-colors duration-200"
                >
                  Remove
                </button>
              </div>
              <button
                type="button"
                @click="addFormInput"
                class="text-primary hover:text-primary-hover text-sm font-medium transition-colors duration-200"
              >
                + Add Form Field
              </button>
            </div>
          </div>

          <!-- Expected Outcomes -->
          <div>
            <label for="outcomes" class="block text-sm font-medium text-heading">
              Expected Outcomes (optional)
            </label>
            <p class="text-sm text-secondary mb-2">
              List specific things you expect to see or happen during the test.
            </p>
            <textarea
              id="outcomes"
              v-model="expectedOutcomesText"
              rows="3"
              class="mt-1 block w-full border border-border rounded-button focus:ring-primary/20 focus:border-primary"
              placeholder="Example: Success message should appear, User should be redirected to dashboard, Form should be submitted without errors"
            />
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="$router.push('/')"
              class="px-4 py-2 border border-border rounded-button text-sm font-medium text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="testStore.creatingTest"
              class="px-4 py-2 bg-primary text-white rounded-button text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors duration-200"
            >
              {{ testStore.creatingTest ? 'Creating...' : 'Create & Run Test' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { useConfigStore } from '@/stores/config'

const router = useRouter()
const testStore = useTestStore()
const configStore = useConfigStore()

const form = ref({
  baseUrl: '',
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

    const testData = {
      baseUrl: form.value.baseUrl,
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
