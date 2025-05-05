<template>
  <div class="welcome">
    <div>
      <p class="main-left-user center">{{ userName }} 您好</p>
      <p class="center main-left-title">欢迎使用WCS系统</p>
      <div class="content">
        <p class="center main-left-content">简单易用 高效稳定</p>
        <p class="center main-left-content">我们将竭诚为您服务</p>
        <p class="center main-left-content">您的满意是我们最大的追求</p>
        <p class="center main-left-content">祝您身体健康 工作顺利</p>
      </div>
    </div>
  </div>
</template>
<script>
import ipcBridge from '@/utils/ipcBridge';

export default {
  name: 'WelcomPage',
  components: {},
  props: {},
  data() {
    return {
      userName: ipcBridge.getGlobal('userInfo').userName
    };
  },
  watch: {},
  computed: {},
  methods: {},
  created() {},
  mounted() {}
};
</script>
<style lang="less" scoped>
.welcome {
  width: 100%;
  height: 100%;
  padding: 5px;
  box-sizing: border-box;
  > div {
    width: 100%;
    height: 100%;
    opacity: 1;
    border-radius: 20px;
    background: rgb(255, 255, 255);
    box-shadow: 0px 60px 90px 0px rgba(0, 0, 0, 0.2);
    background-image: url(./img/welcome.jpg);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    .center {
      letter-spacing: 3px;
      width: 37%;
      text-align: center;
    }
    .main-left-user {
      position: relative;
      top: 32%;
      font-size: 29px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 5px 0;
    }
    .main-left-title {
      position: relative;
      top: 33%;
      font-size: 26px;
      color: #fff;
      margin: 0 0 25px 0;
    }
    .content {
      position: relative;
      top: 33%;
      .main-left-content {
        color: rgb(255, 255, 255);
        font-family: 隶书;
        font-size: 24px;
        margin: 0px 0px 10px;
      }
    }
  }
}
</style>
