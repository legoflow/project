<template>
  <h1>{{ msg }}</h1>
</template>

<style lang="scss" scoped>
h1 {
  width: 100%;
  color: red;
  text-align: center;
}
</style>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Home extends Vue {
  msg = 'foo'
}
</script>
