import { createRouter, createWebHistory } from 'vue-router'
import AccentView from './views/AccentView.vue'
import CalendarView from './views/CalendarView.vue'
import CategoriesSettingsView from './views/CategoriesSettingsView.vue'
import CategoryEditView from './views/CategoryEditView.vue'
import EntryView from './views/EntryView.vue'
import FeedView from './views/FeedView.vue'
import LoginView from './views/LoginView.vue'
import MoodPaletteEditView from './views/MoodPaletteEditView.vue'
import MoodPalettesView from './views/MoodPalettesView.vue'
import MoodSetEditView from './views/MoodSetEditView.vue'
import MoodSetsView from './views/MoodSetsView.vue'
import MoodStatsView from './views/MoodStatsView.vue'
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
    { path: '/stats/mood/:level', name: 'mood-stats', component: MoodStatsView, props: true },
    { path: '/settings/categories', name: 'categories-settings', component: CategoriesSettingsView },
    { path: '/categories/new', name: 'category-new', component: CategoryEditView },
    {
      path: '/categories/:id/edit',
      name: 'category-edit',
      component: CategoryEditView,
      props: true,
    },
    { path: '/mood-sets', name: 'mood-sets', component: MoodSetsView },
    { path: '/mood-sets/new', name: 'mood-set-new', component: MoodSetEditView },
    { path: '/mood-sets/:id/edit', name: 'mood-set-edit', component: MoodSetEditView, props: true },
    { path: '/accent', name: 'accent', component: AccentView },
    { path: '/mood-palettes', name: 'mood-palettes', component: MoodPalettesView },
    { path: '/mood-palettes/new', name: 'mood-palette-new', component: MoodPaletteEditView },
    {
      path: '/mood-palettes/:id/edit',
      name: 'mood-palette-edit',
      component: MoodPaletteEditView,
      props: true,
    },
    // не требует сессии для показа — сам логин, страница обязана быть публичной
    { path: '/login', name: 'login', component: LoginView },
  ],
})
