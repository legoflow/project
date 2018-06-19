<template>
  <div class="home">
    <img src="@/img/logo.png" alt="logo">
    <h1>{{ title }}</h1>
  </div>
</template>

<style lang="scss" scoped>
.home {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

h1 {
  margin-top: 20px;
  width: 100%;
  text-align: center;
}
</style>

<script>
export default {
  data () {
    return {
      title: 'Vue.js From LegoFlow'
    }
  }
}
</script>
