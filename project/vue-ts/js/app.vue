<template>
  <router-view></router-view>
</template>

<style lang="scss" scoped>

</style>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Home from '@/components/home'

@Component({
  components: {
    Home
  }
})
export default class App extends Vue {}
</script>
