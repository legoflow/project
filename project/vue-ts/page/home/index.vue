<template>
  <div class="home">
    <img src="@/img/logo.png" alt="logo"/>
    <h1>{{ title }}</h1>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Home extends Vue {
  title: string = 'Vue.ts From LegoFlow'
}
</script>

<style lang="scss" scoped>
.home {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: auto;
}

h1 {
  width: 100%;
  margin-top: 20px;
  color: $h1Color;
  text-align: center;
}
</style>
