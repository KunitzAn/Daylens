import { createRouter, createWebHistory } from 'vue-router'
import CalendarView from './views/CalendarView.vue'
import CategoriesSettingsView from './views/CategoriesSettingsView.vue'
import CategoryEditView from './views/CategoryEditView.vue'
import EntryView from './views/EntryView.vue'
import FeedView from './views/FeedView.vue'
import LoginView from './views/LoginView.vue'
import MoodSetsView from './views/MoodSetsView.vue'
import MoreView from './views/MoreView.vue'
import StatsView from './views/StatsView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Таб-бар показываем только на четырёх основных экранах. */
    tabBar?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'feed', component: FeedView, meta: { tabBar: true } },
    { path: '/stats', name: 'stats', component: StatsView, meta: { tabBar: true } },
    { path: '/calendar', name: 'calendar', component: CalendarView, meta: { tabBar: true } },
    { path: '/more', name: 'more', component: MoreView, meta: { tabBar: true } },

    // Открываются поверх табов, со своей кнопкой «назад»
    { path: '/day/:date', name: 'day', component: EntryView, props: true },
    { path: '/settings/categories', name: 'categories-settings', component: CategoriesSettingsView },
    { path: '/categories/new', name: 'category-new', component: CategoryEditView },
    {
      path: '/categories/:id/edit',
      name: 'category-edit',
      component: CategoryEditView,
      props: true,
    },
    { path: '/mood-sets', name: 'mood-sets', component: MoodSetsView },
    // не требует сессии для показа — сам логин, страница обязана быть публичной
    { path: '/login', name: 'login', component: LoginView },
  ],
})
