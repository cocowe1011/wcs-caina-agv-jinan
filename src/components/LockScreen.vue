<template>
  <transition name="lock-fade">
    <div class="lock-screen" v-if="isLocked" @click.self="focusInput">
      <div class="lock-content">
        <div class="lock-icon-wrapper">
          <i class="el-icon-lock lock-icon"></i>
        </div>
        <div class="lock-user-name">{{ userName }}</div>
        <div class="lock-hint">屏幕已锁定，请输入密码解锁</div>
        <div class="lock-form">
          <el-input
            ref="lockPasswordInput"
            v-model="password"
            type="password"
            placeholder="请输入登录密码"
            show-password
            @keyup.enter.native="unlock"
          >
            <i slot="prefix" class="el-icon-lock"></i>
          </el-input>
          <el-button
            type="primary"
            @click="unlock"
            :loading="loading"
            class="unlock-btn"
          >
            解锁
          </el-button>
        </div>
        <div class="lock-footer">
          <span class="lock-time">{{ currentTime }}</span>
          <span class="lock-date">{{ currentDate }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import HttpUtil from '@/utils/HttpUtil';
import moment from 'moment';
import 'moment/locale/zh-cn';
moment.locale('zh-cn');
const remote = require('electron').remote;

export default {
  name: 'LockScreen',
  props: {
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      password: '',
      loading: false,
      currentTime: '',
      currentDate: '',
      timeTimer: null
    };
  },
  computed: {
    userName() {
      try {
        const userInfo = remote.getGlobal('sharedObject').userInfo;
        return userInfo ? userInfo.userName || '' : '';
      } catch (e) {
        return '';
      }
    }
  },
  watch: {
    isLocked(val) {
      if (val) {
        this.password = '';
        this.startClock();
        this.$nextTick(() => {
          this.focusInput();
        });
      } else {
        this.stopClock();
      }
    }
  },
  methods: {
    focusInput() {
      this.$nextTick(() => {
        if (this.$refs.lockPasswordInput) {
          this.$refs.lockPasswordInput.focus();
        }
      });
    },
    unlock() {
      if (!this.password) {
        this.$message.warning('请输入密码');
        return;
      }
      this.loading = true;
      const userInfo = remote.getGlobal('sharedObject').userInfo;
      const param = {
        userCode: userInfo.userCode,
        userPassword: this.password
      };
      HttpUtil.post('/userInfo/verifyPassword', param)
        .then((res) => {
          if (res.data === true) {
            this.$emit('unlock');
          } else {
            this.$message.error('密码错误，请重新输入');
          }
        })
        .catch((err) => {
          this.$message.error('验证失败，请重试');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    startClock() {
      this.updateTime();
      this.timeTimer = setInterval(this.updateTime, 1000);
    },
    stopClock() {
      if (this.timeTimer) {
        clearInterval(this.timeTimer);
        this.timeTimer = null;
      }
    },
    updateTime() {
      this.currentTime = moment().format('HH:mm:ss');
      this.currentDate = moment().format('YYYY年MM月DD日 dddd');
    }
  },
  mounted() {
    if (this.isLocked) {
      this.startClock();
    }
  },
  beforeDestroy() {
    this.stopClock();
  }
};
</script>

<style lang="less" scoped>
.lock-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #1a1f36 0%, #2b3256 50%, #1e2548 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 360px;
}

.lock-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.lock-icon {
  font-size: 36px;
  color: rgba(255, 255, 255, 0.85);
}

.lock-user-name {
  font-size: 24px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.lock-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 32px;
}

.lock-form {
  width: 100%;
  margin-bottom: 48px;

  ::v-deep .el-input {
    margin-bottom: 16px;
    .el-input__inner {
      height: 44px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      &::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
      &:focus {
        border-color: rgba(64, 158, 255, 0.6);
        background: rgba(255, 255, 255, 0.1);
      }
    }
    .el-input__prefix {
      color: rgba(255, 255, 255, 0.4);
      left: 10px;
      font-size: 16px;
      line-height: 44px;
    }
    .el-input__suffix {
      color: rgba(255, 255, 255, 0.4);
      line-height: 44px;
    }
  }

  .unlock-btn {
    width: 100%;
    height: 44px;
    border-radius: 8px;
    font-size: 15px;
    letter-spacing: 2px;
    border: none;
    background: #409eff;
    &:hover {
      background: #5aabff;
    }
  }
}

.lock-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  .lock-time {
    font-size: 40px;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 4px;
    font-variant-numeric: tabular-nums;
  }
  .lock-date {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 6px;
    letter-spacing: 1px;
  }
}

.lock-fade-enter-active {
  transition: opacity 0.3s ease;
}
.lock-fade-leave-active {
  transition: opacity 0.2s ease;
}
.lock-fade-enter,
.lock-fade-leave-to {
  opacity: 0;
}
</style>
