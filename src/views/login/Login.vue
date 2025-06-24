<template>
  <div class="login">
    <div class="login-left">
      <img src="./img/imgs_register.png" alt="免费注册" />
    </div>
    <div class="login-right">
      <div class="login-right-top">
        <div class="login-right-top-left"></div>
        <div class="login-right-top-min" style="z-index: 12" @click="minWindow">
          <i
            class="el-icon-minus"
            style="font-size: 18px; font-weight: 600"
          ></i>
        </div>
        <div
          class="login-right-top-close"
          style="z-index: 12"
          @click="closewindow"
        >
          <i
            class="el-icon-close"
            style="font-size: 18px; font-weight: 600"
          ></i>
        </div>
      </div>
      <div class="login-right-down">
        <p class="title">WCS系统</p>
        <p class="intro">
          欢迎使用WCS系统。简洁、易用的操作页面，全自动化管理全力帮助您提高效率。
        </p>
        <div class="login-form">
          <el-input
            placeholder="请输入用户名"
            class="user-code"
            spellcheck="false"
            v-model="userCode"
          ></el-input>
          <el-input
            placeholder="请输入密码"
            class="user-password"
            type="password"
            v-model="userPassword"
            spellcheck="false"
            show-password
          ></el-input>
          <p class="tips">忘记密码请联系管理员</p>
          <el-button
            class="user-login-button"
            type="primary"
            @click="login"
            :loading="loadingStatus"
            >立即登录</el-button
          >
        </div>
      </div>
    </div>
    <transition name="fade">
      <div class="zz-spin" v-show="!javaAppStarted">
        <div id="loader" class="loadloding">
          <div></div>
        </div>
        <div id="lodtext">系统正在启动中...&nbsp;请稍后...</div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron';
import HttpUtil from '@/utils/HttpUtil';
import axios from 'axios';
const remote = require('electron').remote;
export default {
  name: 'Login',
  components: {},
  props: {},
  data() {
    return {
      userCode: '',
      userPassword: '',
      loadingStatus: false,
      javaAppStarted: false,
      javaAppUrl: process.env.VUE_APP_BASE_URL + '/status/check',
      maxRetries: 30,
      retryInterval: 1000
    };
  },
  watch: {},
  computed: {},
  methods: {
    login() {
      this.loadingStatus = true;
      // 将账号密码传递后台，判断密码是否正确
      const param = {
        userCode: this.userCode,
        userPassword: this.userPassword
      };
      HttpUtil.post('/login/login', param)
        .then((res) => {
          if (res.data) {
            remote.getGlobal('sharedObject').userInfo = res.data;
            // 根据用户角色跳转不同页面
            setTimeout(() => {
              this.loadingStatus = false;
              // 跳转主页
              this.$nextTick(() => {
                this.$router.replace({
                  path: '/homePage/welcomPage',
                  query: { userRole: res.data.userRole }
                });
              });
            }, 2000);
          } else {
            this.$message.error(res.message);
            this.loadingStatus = false;
          }
        })
        .catch((err) => {
          this.$message.error(err);
          this.loadingStatus = false;
        });
    },
    closewindow() {
      ipcRenderer.send('close-window');
    },
    minWindow() {
      ipcRenderer.send('min-window');
    },
    checkJavaAppStatus(retries = 0) {
      axios
        .get(this.javaAppUrl)
        .then((response) => {
          console.log(response);
          if (response.data === 'OK') {
            this.javaAppStarted = true;
            this.$message.success('已启动！');
            // 给主进程发消息，启动PLC连接
            ipcRenderer.send('conPLC');
          } else {
            if (retries < this.maxRetries) {
              setTimeout(
                () => this.checkJavaAppStatus(retries + 1),
                this.retryInterval
              );
            } else {
              console.error('Java应用程序启动超时');
            }
          }
        })
        .catch((error) => {
          if (retries < this.maxRetries) {
            setTimeout(
              () => this.checkJavaAppStatus(retries + 1),
              this.retryInterval
            );
          } else {
            console.error('检查Java应用程序状态时发生错误', error);
          }
        });
    }
  },
  created() {
    // ipcRenderer.send('logStatus','logout');
  },
  mounted() {
    if (!this.javaAppStarted) {
      this.checkJavaAppStatus();
    }
  }
};
</script>
<style lang="less" scoped>
.login {
  width: 100%;
  height: 100%;
  display: flex;
  &-left {
    pointer-events: none;
    -webkit-app-region: drag;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fbfcfd;
    img {
      width: 690px;
      height: 546px;
    }
  }
  &-right {
    width: calc(100% - 690px);
    height: 100%;
    padding-left: 28px;
    &-top {
      height: 45px;
      width: 100%;
      display: flex;
      &-left {
        flex: 1;
        height: 100%;
        -webkit-app-region: drag;
        line-height: 45px;
        text-align: left;
        padding-left: 10px;
        font-size: 13px;
        font-weight: 600;
      }
      &-min,
      &-close,
      &-max {
        height: 100%;
        width: 50px;
        display: flex;
        justify-content: center;
        align-items: center;
        -webkit-app-region: no-drag;
      }
      &-min:hover,
      &-max:hover {
        background-color: #eeeeee;
      }
      &-close:hover {
        background-color: #f8635f;
        color: #fff;
      }
    }
    &-down {
      width: 100%;
      margin-top: 75px;
      .title {
        font-weight: 400;
        font-size: 32px;
        line-height: 25px;
        color: #262626;
      }
      .intro {
        width: 332px;
        font-weight: 400;
        font-size: 12px;
        line-height: 18px;
        color: #8c8c8c;
        margin-top: -15px;
        span {
          color: #4385ff;
          cursor: pointer;
        }
      }
      .login-form {
        padding: 20px 30px 20px 0px;
        ::v-deep .user-code {
          .el-input__inner {
            height: 45px;
            margin-bottom: 30px;
            font-size: 14px !important;
            color: #000;
          }
        }
        ::v-deep .user-password {
          .el-input__inner {
            height: 45px;
            font-size: 14px !important;
            color: #000;
            margin-bottom: 2px;
          }
        }
        .user-login-button {
          height: 43px;
          border-radius: 2px;
          font-size: 16px;
          width: 100%;
        }
        .tips {
          font-weight: 400;
          font-size: 12px;
          line-height: 18px;
          color: #8c8c8c;
          margin-bottom: 36px;
          span {
            color: #4385ff;
            cursor: pointer;
          }
        }
      }
    }
  }
  .loadloding {
    position: fixed;
    top: 45%;
    left: 50%;
    margin-top: -25px;
    margin-left: -25px;
    width: 50px;
    height: 50px;
    display: block;
    color: #1890ff;
    z-index: 11;
  }
  .loadloding > div {
    display: inline-block;
    float: none;
    background-color: currentColor;
    border: 0 solid currentColor;
  }
  #lodtext {
    font-size: 18px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: 40px;
    margin-left: -100px;
    width: 220px;
    height: 30px;
    z-index: 11;
    font-weight: 600;
  }
  .loadloding > div {
    width: 100%;
    height: 100%;
    border-radius: 0;
    animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
  }
  @keyframes square-spin {
    0% {
      transform: perspective(100px) rotateX(0) rotateY(0);
    }
    25% {
      transform: perspective(100px) rotateX(180deg) rotateY(0);
    }
    50% {
      transform: perspective(100px) rotateX(180deg) rotateY(180deg);
    }
    75% {
      transform: perspective(100px) rotateX(0) rotateY(180deg);
    }
    100% {
      transform: perspective(100px) rotateX(0) rotateY(360deg);
    }
  }
  .zz-spin {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4;
    width: 100%;
    height: 100%;
    opacity: 0.9;
    pointer-events: auto;
    background: #fff;
  }
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 1s;
  }
  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }
}
</style>
