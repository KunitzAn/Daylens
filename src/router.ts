import { createRouter, createWebHistory } from 'vue-router'
import CategoryEditView from './views/CategoryEditView.vue'
import EntryView from './views/EntryView.vue'
import MoodSetsView from './views/MoodSetsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'entry', component: EntryView },
    { path: '/categories/new', name: 'category-new', component: CategoryEditView },
    {
      path: '/categories/:id/edit',
      name: 'category-edit',
      component: CategoryEditView,
      props: true,
    },
    { path: '/mood-sets', name: 'mood-sets', component: MoodSetsView },
  ],
})
