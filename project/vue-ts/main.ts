import './sass/main'
import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './app.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: () => import(/* webpackChunkName: "home" */ './components/home.vue')
  }
]

const router = new VueRouter({
  routes
})

/* eslint-disable no-new */
new Vue({
  el: 'app',
  router,
  render: h => h(App)
})
