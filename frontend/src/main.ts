import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Import views
import TestCreator from './views/TestCreator.vue'
import TestResults from './views/TestResults.vue'
import TestResultDetail from './views/TestResultDetail.vue'
import TestsList from './views/TestsList.vue'
import Configuration from './views/Configuration.vue'
import Dashboard from './views/Dashboard.vue'
import GroupRunDetail from './views/GroupRunDetail.vue'
import GroupRunsView from './views/GroupRunsView.vue'
import GroupsView from './views/GroupsView.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/create', component: TestCreator },
  { path: '/tests', component: TestsList },
  { path: '/tests/:id/results', component: TestResults },
  { path: '/results/:id', component: TestResultDetail },
  { path: '/config', component: Configuration },
  { path: '/groups', component: GroupsView },
  { path: '/groups/:groupId/runs', component: GroupRunsView },
  { path: '/groups/:groupId/runs/:runId', component: GroupRunDetail }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')