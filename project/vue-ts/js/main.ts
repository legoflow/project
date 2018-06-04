import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './main.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: () => import( /* webpackChunkName: "home" */ './components/home' ),
  },
]

const router = new VueRouter({
  routes,
})

new Vue({
  el: 'app',
  router,
  render: h => h(App)
})

