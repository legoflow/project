import '@/style/main'
import Vue from 'vue/dist/vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'

Vue.use(VueRouter)
Vue.use(Vuex)

const routes = [
  {
    path: '/',
    component: () => import(/* webpackChunkName: "home" */ './components/home')
  }
]

const router = new VueRouter({
  routes
})

/* eslint-disable no-new */
new Vue({
  el: 'app',
  router,
  render (h) {
    return (<router-view></router-view>)
  }
})
