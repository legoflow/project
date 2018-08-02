import VueRouter from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import(/* webpackChunkName: "home" */ '@/page/home')
  }
]

export default new VueRouter({
  routes
})
