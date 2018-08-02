import '@/style/main'
import Vue from 'vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'
import App from '@/App.vue'
import router from '@/router/index.ts'

interface WindowInterface extends Window {
  Promise: any
}

if (!(window as WindowInterface).Promise) {
  (window as WindowInterface).Promise = Promise
}

Vue.use(VueRouter)
Vue.use(Vuex)

/* eslint-disable no-new */
new Vue({
  router,
  render: h => h(App)
}).$mount('app')
