<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Create Test Group" @click.self="emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-serif text-xl text-heading">Create Test Group</h3>
        <button @click="emit('close')" class="text-muted hover:text-heading transition-colors duration-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Name -->
        <div>
          <label for="group-name" class="block text-sm font-medium text-heading mb-1">
            Name <span class="text-red-500">*</span>
          </label>
          <input
            id="group-name"
            v-model="form.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder="My Test Group"
            required
          />
        </div>

        <!-- Description -->
        <div>
          <label for="group-description" class="block text-sm font-medium text-heading mb-1">
            Description <span class="text-secondary text-xs">(optional)</span>
          </label>
          <textarea
            id="group-description"
            v-model="form.description"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
            placeholder="Describe what this group of tests covers..."
          />
        </div>

        <!-- Test Picker -->
        <div>
          <label class="block text-sm font-medium text-heading mb-1">
            Tests <span class="text-red-500">*</span>
            <span class="ml-1 text-xs text-secondary font-normal">({{ selectedTestIds.length }} selected)</span>
          </label>
          <input
            v-model="testSearch"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none mb-2"
            placeholder="Search tests..."
          />
          <div class="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
            <div v-if="filteredTests.length === 0" class="px-3 py-4 text-sm text-secondary text-center">
              {{ testStore.tests.length === 0 ? 'No tests available.' : 'No tests match your search.' }}
            </div>
            <label
              v-for="test in filteredTests"
              :key="test.id"
              class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <input
                type="checkbox"
                :value="test.id"
                v-model="selectedTestIds"
                class="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary-500"
              />
              <span class="text-sm text-heading flex-1 truncate">{{ test.name || test.description }}</span>
            </label>
          </div>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-heading mb-1">
            Tags <span class="text-secondary text-xs">(optional)</span>
          </label>
          <div class="flex flex-wrap gap-1.5 mb-2" v-if="form.tags.length > 0">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="inline-flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full"
            >
              {{ tag }}
              <button type="button" @click="removeTag(tag)" class="hover:text-primary-900 dark:hover:text-primary-100 leading-none">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
          <input
            v-model="tagInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder="Add a tag and press Enter"
            @keydown.enter.prevent="addTag"
          />
        </div>

        <!-- Max Parallel -->
        <div>
          <label class="block text-sm font-medium text-heading mb-1">
            Max Parallel: <span class="text-primary font-semibold">{{ form.maxParallel }}</span>
          </label>
          <input
            v-model.number="form.maxParallel"
            type="range"
            min="1"
            max="10"
            step="1"
            class="w-full accent-primary"
          />
          <div class="flex justify-between text-xs text-secondary mt-1">
            <span>1 (sequential)</span>
            <span>10</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm border border-border rounded-lg text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!canSubmit || groupStore.creatingGroup"
            class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {{ groupStore.creatingGroup ? 'Creating...' : 'Create Group' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGroupStore } from '@/stores/groups'
import { useTestStore } from '@/stores/tests'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'created'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const groupStore = useGroupStore()
const testStore = useTestStore()

const form = ref({
  name: '',
  description: '',
  tags: [] as string[],
  maxParallel: 1,
})

const selectedTestIds = ref<string[]>([])
const testSearch = ref('')
const tagInput = ref('')

const filteredTests = computed(() => {
  const query = testSearch.value.trim().toLowerCase()
  if (!query) return testStore.tests
  return testStore.tests.filter(t => {
    const label = (t.name || t.description || '').toLowerCase()
    return label.includes(query)
  })
})

const canSubmit = computed(() => {
  return form.value.name.trim().length > 0 && selectedTestIds.value.length > 0
})

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

function resetForm() {
  form.value = { name: '', description: '', tags: [], maxParallel: 1 }
  selectedTestIds.value = []
  testSearch.value = ''
  tagInput.value = ''
}

async function handleSubmit() {
  if (!canSubmit.value) return
  const result = await groupStore.createGroup({
    name: form.value.name.trim(),
    description: form.value.description.trim() || undefined,
    testIds: selectedTestIds.value,
    tags: form.value.tags,
    maxParallel: form.value.maxParallel,
  })
  if (result) {
    emit('created')
    emit('close')
    resetForm()
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    testStore.fetchTests()
  } else {
    resetForm()
  }
})
</script>
