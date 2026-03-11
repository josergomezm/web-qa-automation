<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Create Test Group">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-heading/60 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-surface rounded-modal text-left overflow-hidden shadow-card-hover transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
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
              <label for="group-name" class="block text-sm font-medium text-heading">
                Name <span class="text-danger">*</span>
              </label>
              <input
                id="group-name"
                v-model="form.name"
                type="text"
                class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary sm:text-sm"
                placeholder="My Test Group"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label for="group-description" class="block text-sm font-medium text-heading">
                Description <span class="text-secondary text-xs">(optional)</span>
              </label>
              <textarea
                id="group-description"
                v-model="form.description"
                rows="2"
                class="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary sm:text-sm resize-none"
                placeholder="Describe what this group of tests covers..."
              />
            </div>

            <!-- Test Picker -->
            <div>
              <label class="block text-sm font-medium text-heading mb-2">
                Tests <span class="text-danger">*</span>
                <span class="ml-1 text-xs text-secondary font-normal">({{ selectedTestIds.length }} selected)</span>
              </label>
              <input
                v-model="testSearch"
                type="text"
                class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary sm:text-sm mb-2"
                placeholder="Search tests..."
              />
              <div class="border border-border rounded-card max-h-40 overflow-y-auto">
                <div v-if="filteredTests.length === 0" class="px-3 py-4 text-sm text-secondary text-center">
                  {{ testStore.tests.length === 0 ? 'No tests available.' : 'No tests match your search.' }}
                </div>
                <label
                  v-for="test in filteredTests"
                  :key="test.id"
                  class="flex items-center space-x-2 px-3 py-2 hover:bg-cream cursor-pointer border-b border-border last:border-0"
                >
                  <input
                    type="checkbox"
                    :value="test.id"
                    v-model="selectedTestIds"
                    class="rounded border-border text-primary focus:ring-primary/20"
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
                  class="inline-flex items-center gap-1 text-xs bg-primary-light text-primary px-2.5 py-0.5 rounded-pill"
                >
                  {{ tag }}
                  <button type="button" @click="removeTag(tag)" class="hover:text-danger leading-none">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
              <input
                v-model="tagInput"
                type="text"
                class="block w-full border-border rounded-md shadow-sm focus:ring-primary/20 focus:border-primary sm:text-sm"
                placeholder="Add a tag and press Enter"
                @keydown.enter.prevent="addTag"
              />
            </div>

            <!-- Max Parallel -->
            <div class="bg-cream p-4 rounded-card border border-border">
              <label class="block text-sm font-medium text-heading mb-2">
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
          </form>
        </div>

        <!-- Modal footer -->
        <div class="bg-cream/50 px-4 py-3 border-t border-border sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="handleSubmit"
            :disabled="!canSubmit || groupStore.creatingGroup"
            class="w-full inline-flex justify-center rounded-button border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-semibold text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ groupStore.creatingGroup ? 'Creating...' : 'Create Group' }}
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="mt-3 w-full inline-flex justify-center rounded-button border border-border shadow-sm px-4 py-2 bg-surface text-base font-medium text-secondary hover:text-heading hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
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
  maxParallel: 3,
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
  form.value = { name: '', description: '', tags: [], maxParallel: 3 }
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
