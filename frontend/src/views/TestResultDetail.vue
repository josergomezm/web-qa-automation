<template>
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-600">Loading test result...</p>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
            <p class="text-red-800">{{ error }}</p>
        </div>

        <div v-else-if="result" class="space-y-6">
            <!-- Header -->
            <div class="bg-white shadow rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <button @click="$router.go(-1)" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-900">Test Result Details</h1>
                        <div :class="[
                            'w-3 h-3 rounded-full',
                            result.status === 'passed' ? 'bg-green-500' :
                                result.status === 'failed' ? 'bg-red-500' :
                                    result.status === 'running' ? 'bg-yellow-500' : 'bg-gray-500'
                        ]" />
                    </div>
                    <div class="text-sm text-gray-500">
                        {{ formatDate(result.executedAt) }}
                    </div>
                </div>

                <!-- Cached Steps Indicator -->
                <div v-if="result.usedCachedSteps" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span class="text-sm font-medium text-green-800">Used Cached Steps</span>
                        <span class="text-sm text-green-600">This test used cached steps from a previous successful run,
                            saving AI costs.</span>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{{ result.performance.totalTestTime }}ms</div>
                        <div class="text-sm text-gray-500">Total Time</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">{{ result.performance.clickCount }}</div>
                        <div class="text-sm text-gray-500">Clicks</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600">{{ result.performance.networkRequests }}</div>
                        <div class="text-sm text-gray-500">Network Calls</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-red-600">{{ result.performance.consoleErrors.length }}</div>
                        <div class="text-sm text-gray-500">Console Errors</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-orange-600">${{ result.cost.toFixed(6) }}</div>
                        <div class="text-sm text-gray-500">Cost</div>
                    </div>
                </div>
            </div>

            <!-- Test Steps with Screenshots -->
            <div class="bg-white shadow rounded-lg p-6">
                <!-- Prerequisite Steps Section -->
                <div v-if="getPrerequisiteSteps(result).length > 0" class="mb-8">
                    <div class="flex items-center space-x-2 mb-4">
                        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1">
                            </path>
                        </svg>
                        <h2 class="text-lg font-medium text-gray-900">Prerequisite Steps</h2>
                        <span class="text-sm text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                            {{ getUniquePrerequisiteTests(result).length }} prerequisite test(s)
                        </span>
                    </div>

                    <!-- Group prerequisite steps by test -->
                    <div v-for="prereqTest in getUniquePrerequisiteTests(result)" :key="prereqTest.id" class="mb-6">
                        <div
                            class="flex items-center space-x-2 mb-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                </path>
                            </svg>
                            <span class="font-medium text-purple-800">{{ prereqTest.description }}</span>
                        </div>

                        <div class="space-y-4 ml-6">
                            <div v-for="(step, index) in getStepsForPrerequisite(result, prereqTest.id)" :key="index"
                                class="border rounded-lg p-4 border-l-4"
                                :class="step.success ? 'border-purple-200 bg-purple-50 border-l-purple-400' : 'border-red-200 bg-red-50 border-l-red-400'">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex items-center space-x-3">
                                        <div class="flex-shrink-0">
                                            <div :class="[
                                                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                                                step.success ? 'bg-purple-500' : 'bg-red-500'
                                            ]">
                                                {{ getPrerequisiteStepIndex(result, step) }}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-medium text-gray-900">{{ step.action.toUpperCase()
                                                }}</h3>
                                            <p class="text-sm text-gray-600">{{ step.element }}</p>
                                            <p v-if="step.value" class="text-sm text-gray-500">Value: {{ step.value }}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        {{ formatTime(step.timestamp) }}
                                    </div>
                                </div>

                                <div v-if="step.error" class="mb-3 p-3 bg-red-100 border border-red-200 rounded">
                                    <p class="text-red-800 text-sm">{{ step.error }}</p>
                                </div>

                                <!-- Screenshot Accordion for prerequisite step -->
                                <div v-if="step.screenshot" class="mt-3 border rounded-lg">
                                    <button @click="togglePrerequisiteScreenshot(`${step.prerequisiteTestId}-${getPrerequisiteStepIndex(result, step)}`)"
                                        class="flex items-center justify-between w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                                        <div class="flex items-center space-x-2">
                                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z">
                                                </path>
                                            </svg>
                                            <span class="text-sm font-medium text-gray-700">Screenshot</span>
                                        </div>
                                        <svg :class="[
                                            'w-4 h-4 text-gray-400 transition-transform duration-200',
                                            expandedPrerequisiteScreenshots.has(`${step.prerequisiteTestId}-${getPrerequisiteStepIndex(result, step)}`) ? 'transform rotate-180' : ''
                                        ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>

                                    <div v-show="expandedPrerequisiteScreenshots.has(`${step.prerequisiteTestId}-${getPrerequisiteStepIndex(result, step)}`)" class="p-3 bg-white rounded-b-lg">
                                        <img :src="`data:image/png;base64,${step.screenshot}`"
                                            :alt="`Screenshot for prerequisite step ${getPrerequisiteStepIndex(result, step)}`"
                                            class="max-w-full h-auto rounded border cursor-pointer hover:opacity-75 transition-opacity"
                                            @click="openFullscreenModal(step.screenshot, `Prerequisite Step ${getPrerequisiteStepIndex(result, step)} Screenshot`)" />
                                        <p class="text-xs text-gray-500 mt-2">Click image to view fullscreen</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Test Steps Section -->
                <div v-if="getMainTestSteps(result).length > 0">
                    <div class="flex items-center space-x-2 mb-4">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h2 class="text-lg font-medium text-gray-900">Main Test Steps</h2>
                    </div>
                    <div class="space-y-6">
                        <div v-for="(step, index) in getMainTestSteps(result)" :key="index"
                            class="border rounded-lg p-4"
                            :class="step.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'">
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex items-center space-x-3">
                                    <div class="flex-shrink-0">
                                        <div :class="[
                                            'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                                            step.success ? 'bg-green-500' : 'bg-red-500'
                                        ]">
                                            {{ index + 1 }}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-medium text-gray-900">{{ step.action.toUpperCase() }}
                                        </h3>
                                        <p class="text-sm text-gray-600">{{ step.element }}</p>
                                        <p v-if="step.value" class="text-sm text-gray-500">Value: {{ step.value }}</p>
                                    </div>
                                </div>
                                <div class="text-xs text-gray-500">
                                    {{ formatTime(step.timestamp) }}
                                </div>
                            </div>

                            <div v-if="step.error" class="mb-3 p-3 bg-red-100 border border-red-200 rounded">
                                <p class="text-red-800 text-sm">{{ step.error }}</p>
                            </div>

                            <!-- Screenshot Accordion for this step -->
                            <div v-if="step.screenshot" class="mt-3 border rounded-lg">
                                <button @click="toggleStepScreenshot(index)"
                                    class="flex items-center justify-between w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z">
                                            </path>
                                        </svg>
                                        <span class="text-sm font-medium text-gray-700">Screenshot</span>
                                    </div>
                                    <svg :class="[
                                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                                        expandedScreenshots.has(index) ? 'transform rotate-180' : ''
                                    ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>

                                <div v-show="expandedScreenshots.has(index)" class="p-3 bg-white rounded-b-lg">
                                    <img :src="`data:image/png;base64,${step.screenshot}`"
                                        :alt="`Screenshot for step ${index + 1}`"
                                        class="max-w-full h-auto rounded border cursor-pointer hover:opacity-75 transition-opacity"
                                        @click="openFullscreenModal(step.screenshot, `Step ${index + 1} Screenshot`)" />
                                    <p class="text-xs text-gray-500 mt-2">Click image to view fullscreen</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Console Messages Accordion -->
                <div v-if="result.consoleMessages && result.consoleMessages.length > 0"
                    class="bg-white shadow rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <button @click="showConsoleMessages = !showConsoleMessages"
                            class="flex items-center justify-between w-full text-left">
                            <div class="flex items-center space-x-3">
                                <h2 class="text-lg font-medium text-gray-900">Console Messages</h2>
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {{ result.consoleMessages.length }}
                                </span>
                                <span v-if="consoleErrorCount > 0"
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {{ consoleErrorCount }} errors
                                </span>
                                <span v-if="consoleWarningCount > 0"
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {{ consoleWarningCount }} warnings
                                </span>
                            </div>
                            <svg :class="[
                                'w-5 h-5 text-gray-400 transition-transform duration-200',
                                showConsoleMessages ? 'transform rotate-180' : ''
                            ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7">
                                </path>
                            </svg>
                        </button>
                    </div>

                    <div v-show="showConsoleMessages" class="px-6 py-4">
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            <div v-for="(message, index) in result.consoleMessages" :key="index" :class="[
                                'p-3 rounded text-sm font-mono',
                                message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                                    message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                                        message.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                            'bg-gray-50 text-gray-800 border border-gray-200'
                            ]">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <span class="inline-block w-16 text-xs uppercase font-semibold">{{ message.type
                                            }}</span>
                                        <span>{{ message.text }}</span>
                                    </div>
                                    <span class="text-xs text-gray-500 ml-2">{{ formatTime(message.timestamp) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Network Calls Accordion -->
                <div v-if="result.networkCalls && result.networkCalls.length > 0" class="bg-white shadow rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <button @click="showNetworkCalls = !showNetworkCalls"
                            class="flex items-center justify-between w-full text-left">
                            <div class="flex items-center space-x-3">
                                <h2 class="text-lg font-medium text-gray-900">Network Calls</h2>
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {{ result.networkCalls.length }}
                                </span>
                                <span v-if="networkErrorCount > 0"
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {{ networkErrorCount }} errors
                                </span>
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {{ averageResponseTime }}ms avg
                                </span>
                            </div>
                            <svg :class="[
                                'w-5 h-5 text-gray-400 transition-transform duration-200',
                                showNetworkCalls ? 'transform rotate-180' : ''
                            ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7">
                                </path>
                            </svg>
                        </button>
                    </div>

                    <div v-show="showNetworkCalls" class="px-6 py-4">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Method</th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            URL</th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status</th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Time</th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Size</th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="(call, index) in result.networkCalls" :key="index">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span :class="[
                                                'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                                                call.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                                    call.method === 'POST' ? 'bg-green-100 text-green-800' :
                                                        call.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                                            call.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                            ]">
                                                {{ call.method }}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" :title="call.url">
                                            {{ call.url }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span v-if="call.status" :class="[
                                                'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                                                call.status >= 200 && call.status < 300 ? 'bg-green-100 text-green-800' :
                                                    call.status >= 300 && call.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                                                        call.status >= 400 ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                            ]">
                                                {{ call.status }}
                                            </span>
                                            <span v-else class="text-gray-400">-</span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {{ call.responseTime ? `${call.responseTime}ms` : '-' }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {{ call.size ? formatBytes(call.size) : '-' }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ formatTime(call.timestamp) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Fullscreen Screenshot Modal -->
    <div v-if="showFullscreenModal" class="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
        @click="closeFullscreenModal">
        <div class="relative max-w-full max-h-full p-4" @click.stop>
            <!-- Close button -->
            <button @click="closeFullscreenModal"
                class="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white rounded-full p-2 hover:bg-opacity-90 transition-all shadow-lg"
                title="Close (ESC)">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12">
                    </path>
                </svg>
            </button>

            <!-- Modal title -->
            <div class="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white px-3 py-2 rounded shadow-lg">
                <span class="text-sm font-medium">{{ fullscreenTitle }}</span>
            </div>

            <!-- Screenshot -->
            <img :src="`data:image/png;base64,${fullscreenImage}`" :alt="fullscreenTitle"
                class="max-w-full max-h-full object-contain rounded shadow-2xl" />

            <!-- Navigation hint -->
            <div
                class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded shadow-lg text-sm">
                <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7">
                        </path>
                    </svg>
                    <span>Press ESC to close or click outside</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import type { TestResult } from '@shared/types'

const route = useRoute()
const testStore = useTestStore()

const result = ref<TestResult | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Accordion state
const showConsoleMessages = ref(false)
const showNetworkCalls = ref(false)
const expandedScreenshots = ref(new Set<number>())
const expandedPrerequisiteScreenshots = ref(new Set<string>())

// Fullscreen modal state
const showFullscreenModal = ref(false)
const fullscreenImage = ref('')
const fullscreenTitle = ref('')

// Computed properties for statistics
const consoleErrorCount = computed(() =>
    result.value?.consoleMessages?.filter(m => m.type === 'error').length || 0
)

const consoleWarningCount = computed(() =>
    result.value?.consoleMessages?.filter(m => m.type === 'warning').length || 0
)

const networkErrorCount = computed(() =>
    result.value?.networkCalls?.filter(c => c.status && c.status >= 400).length || 0
)

const averageResponseTime = computed(() => {
    if (!result.value?.networkCalls?.length) return 0
    const callsWithTime = result.value.networkCalls.filter(c => c.responseTime)
    if (callsWithTime.length === 0) return 0
    const total = callsWithTime.reduce((sum, call) => sum + (call.responseTime || 0), 0)
    return Math.round(total / callsWithTime.length)
})

const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
}

const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString()
}

// Helper methods for step categorization
const getPrerequisiteSteps = (result: any) => {
    return result.steps?.filter((step: any) => step.isPrerequisite) || []
}

const getMainTestSteps = (result: any) => {
    return result.steps?.filter((step: any) => step.isMainTest || (!step.isPrerequisite && !step.isMainTest)) || []
}

const getUniquePrerequisiteTests = (result: any) => {
    const prereqSteps = getPrerequisiteSteps(result)
    const uniqueTests = new Map()

    prereqSteps.forEach((step: any) => {
        if (step.prerequisiteTestId && !uniqueTests.has(step.prerequisiteTestId)) {
            uniqueTests.set(step.prerequisiteTestId, {
                id: step.prerequisiteTestId,
                description: step.prerequisiteTestDescription || `Prerequisite Test ${step.prerequisiteTestId.slice(-8)}`
            })
        }
    })

    return Array.from(uniqueTests.values())
}

const getStepsForPrerequisite = (result: any, prereqTestId: string) => {
    return getPrerequisiteSteps(result).filter((step: any) => step.prerequisiteTestId === prereqTestId)
}

const getPrerequisiteStepIndex = (result: any, targetStep: any) => {
    const prereqSteps = getPrerequisiteSteps(result)
    return prereqSteps.findIndex((step: any) => step === targetStep) + 1
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Screenshot accordion functions
const toggleStepScreenshot = (index: number) => {
    if (expandedScreenshots.value.has(index)) {
        expandedScreenshots.value.delete(index)
    } else {
        expandedScreenshots.value.add(index)
    }
}

const togglePrerequisiteScreenshot = (stepId: string) => {
    if (expandedPrerequisiteScreenshots.value.has(stepId)) {
        expandedPrerequisiteScreenshots.value.delete(stepId)
    } else {
        expandedPrerequisiteScreenshots.value.add(stepId)
    }
}

// Fullscreen modal functions
const openFullscreenModal = (screenshot: string, title: string) => {
    fullscreenImage.value = screenshot
    fullscreenTitle.value = title
    showFullscreenModal.value = true
    document.body.style.overflow = 'hidden' // Prevent background scrolling
}

const closeFullscreenModal = () => {
    showFullscreenModal.value = false
    fullscreenImage.value = ''
    fullscreenTitle.value = ''
    document.body.style.overflow = '' // Restore scrolling
}

// Handle ESC key to close modal
const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && showFullscreenModal.value) {
        closeFullscreenModal()
    }
}

const loadResult = async () => {
    try {
        loading.value = true
        const resultId = route.params.id as string

        // Get the result from the store or fetch it
        const foundResult = testStore.results.find(r => r.id === resultId)
        if (foundResult) {
            result.value = foundResult
        } else {
            // Fetch from API
            result.value = await testStore.getResult(resultId)
        }
    } catch (err: any) {
        error.value = err.message || 'Failed to load result'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadResult()
    // Add event listener for ESC key
    document.addEventListener('keydown', handleKeydown)
})

// Cleanup event listener
onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = '' // Ensure scrolling is restored
})
</script>