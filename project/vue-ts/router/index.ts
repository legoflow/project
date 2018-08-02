import VueRouter from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import(/* webpackChunkName: "home" */ '@/page/home/index.vue')
  }
]

export default new VueRouter({
  routes
})
