import '@/style/main'
import Vue from 'vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'
import App from './app.vue'

interface WindowInterface extends Window {
  Promise: any
}

if (!(window as WindowInterface).Promise) {
  (window as WindowInterface).Promise = Promise
}

Vue.use(VueRouter)
Vue.use(Vuex)

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
