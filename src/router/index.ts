import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import ArticlePage from '@/pages/ArticlePage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import DemoNaivePage from '@/pages/DemoNaivePage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/article/:slug', name: 'article', component: ArticlePage },
    { path: '/article-path/:encodedPath', name: 'article-path', component: ArticlePage },
    { path: '/settings', name: 'settings', component: SettingsPage },
    { path: '/demo-naive', name: 'demo-naive', component: DemoNaivePage }
  ]
})

export default router
