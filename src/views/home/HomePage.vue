<template>
  <div class="homePage">
    <div class="maskDiv">
      <div class="maskDiv-top">
        <div class="maskDiv-top-left" @dblclick="maxWindow">
          <img
            src="../../../build/icons/64x64.png"
            style="width: 38px; height: 38px"
          />
          <div style="margin-left: 10px; height: 100%">
            <div class="maskDiv-top-left-top-title">WCS系统</div>
            <div class="maskDiv-top-left-top-title2">wcs</div>
          </div>
        </div>
        <div class="maskDiv-top-mid">
          <el-menu
            :default-active="activeIndex"
            class="el-menu-demo"
            mode="horizontal"
            @select="handleSelect"
          >
            <el-menu-item index="1">首页</el-menu-item>
            <el-menu-item index="2">业务处理</el-menu-item>
            <el-menu-item index="3" v-if="userRole === 'ADMIN'"
              >用户管理</el-menu-item
            >
            <el-menu-item index="5">关于</el-menu-item>
          </el-menu>
        </div>
        <div class="version-view">
          <div
            class="el-divider el-divider--vertical"
            style="margin-right: 15px"
          ></div>
          <div class="version-container">
            <div class="version-number">
              <!-- <i class="el-icon-caret-bottom"></i> -->
              V1.1.0
            </div>
          </div>
          <el-dropdown
            trigger="click"
            style="line-height: 0"
            @command="setCommand"
          >
            <i
              class="el-icon-setting"
              style="font-size: 18px; margin-right: 14px"
            ></i>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item icon="el-icon-full-screen" command="full_screen"
                >全屏/取消全屏&nbsp;&nbsp;Ctrl+F11</el-dropdown-item
              >
            </el-dropdown-menu>
          </el-dropdown>
          <i
            class="el-icon-lock"
            style="font-size: 18px; margin-right: 14px; cursor: pointer"
            @click="lockScreen"
          ></i>
          <el-dropdown
            trigger="click"
            @command="handelCommand"
            style="line-height: 0"
          >
            <el-avatar
              :src="require('./img/header.png')"
              size="small"
              style="margin-right: 10px"
            ></el-avatar>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item
                icon="el-icon-key"
                command="updatePassword"
                v-if="userRole !== 'ADMIN'"
                >修改密码</el-dropdown-item
              >
              <el-dropdown-item icon="el-icon-upload2" command="logout"
                >退出登录</el-dropdown-item
              >
            </el-dropdown-menu>
          </el-dropdown>
          <div class="el-divider el-divider--vertical"></div>
        </div>
        <div class="maskDiv-top-min" @click="minWindow">
          <i
            class="el-icon-minus"
            style="font-size: 18px; font-weight: 600"
          ></i>
        </div>
        <div class="maskDiv-top-max" @click="maxWindow">
          <i
            :class="
              windowSize === 'unmax-window'
                ? 'el-icon-full-screen'
                : 'el-icon-copy-document'
            "
            style="font-size: 18px; font-weight: 600"
          ></i>
        </div>
        <div class="maskDiv-top-close" @click="closewindow">
          <i
            class="el-icon-close"
            style="font-size: 18px; font-weight: 600"
          ></i>
        </div>
      </div>
      <div class="maskDiv-down">
        <StatusMonitor></StatusMonitor>
        <keep-alive>
          <router-view />
        </keep-alive>
      </div>
    </div>
    <el-dialog
      title="修改密码"
      :visible.sync="dialogFormVisible"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="updatePasswordForm">
        <el-form-item label="请输入新密码" label-width="120px">
          <el-input
            v-model="updatePasswordForm.newPassword"
            autocomplete="off"
          ></el-input>
        </el-form-item>
        <el-form-item label="确定密码" label-width="120px">
          <el-input
            v-model="updatePasswordForm.newPasswordAgain"
            autocomplete="off"
          ></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="cancelUpdatePassword">取 消</el-button>
        <el-button type="primary" @click="updatePasswordMethod"
          >确 定</el-button
        >
      </div>
    </el-dialog>

    <!-- 管理员授权弹窗 -->
    <el-dialog
      :title="authDialogTitle"
      :visible.sync="showAuthDialog"
      width="460px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="auth-warning-tip">
        <i class="el-icon-warning"></i>
        <div class="auth-warning-text">
          <span class="auth-warning-title">风险提示</span>
          <span>{{ authWarningText }}</span>
        </div>
      </div>
      <el-form
        :model="authForm"
        ref="authForm"
        :rules="authRules"
        label-width="100px"
      >
        <el-form-item label="管理员账号" prop="adminCode">
          <el-input
            v-model="authForm.adminCode"
            placeholder="请输入管理员账号"
            @keyup.enter.native="confirmAuth"
          ></el-input>
        </el-form-item>
        <el-form-item label="管理员密码" prop="adminPassword">
          <el-input
            v-model="authForm.adminPassword"
            type="password"
            placeholder="请输入管理员密码"
            show-password
            @keyup.enter.native="confirmAuth"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelAuth">取 消</el-button>
        <el-button type="primary" @click="confirmAuth" :loading="authLoading"
          >确认授权</el-button
        >
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron';
import StatusMonitor from '@/components/StatusMonitoring.vue';
import HttpUtil from '@/utils/HttpUtil';
const remote = require('electron').remote;
export default {
  name: 'HomePage',
  components: {
    StatusMonitor
  },
  props: {},
  data() {
    return {
      activeIndex: '1',
      windowSize: 'max-window', // 初始状态为最大化
      showLogout: true,
      dialogFormVisible: false,
      updatePasswordForm: {
        newPassword: '',
        newPasswordAgain: ''
      },
      userRole: '',
      showAuthDialog: false,
      authLoading: false,
      authAction: '', // 'close' 或 'logout'
      authForm: {
        adminCode: '',
        adminPassword: ''
      },
      authRules: {
        adminCode: [
          { required: true, message: '请输入管理员账号', trigger: 'blur' }
        ],
        adminPassword: [
          { required: true, message: '请输入管理员密码', trigger: 'blur' }
        ]
      }
    };
  },
  watch: {},
  computed: {
    isAdmin() {
      return this.userRole === 'ADMIN';
    },
    authDialogTitle() {
      const titleMap = {
        close: '退出授权验证',
        logout: '退出授权验证',
        updatePassword: '修改密码授权验证'
      };
      return titleMap[this.authAction] || '授权验证';
    },
    authWarningText() {
      const textMap = {
        close:
          '关闭系统将中断所有正在运行的任务，AGV调度将停止，请确认是否需要退出。',
        logout:
          '退出登录将中断所有正在运行的任务，AGV调度将停止，请确认是否需要退出。',
        updatePassword:
          '修改密码后将强制退出登录，所有正在运行的任务将被中断，AGV调度将停止，请确认是否需要修改。'
      };
      return textMap[this.authAction] || '';
    }
  },
  methods: {
    handleSelect(key, keyPath) {
      switch (key) {
        // welcomPage
        case '1':
          this.$nextTick(() => {
            if (this.$route.path !== '/homePage/welcomPage') {
              this.$router.replace({
                path: '/homePage/welcomPage'
              });
            }
          });
          break;
        case '2':
          this.$nextTick(() => {
            if (this.$route.path !== '/homePage/MainPage') {
              this.$router.replace({
                path: '/homePage/MainPage'
              });
            }
          });
          break;
        case '3':
          this.$nextTick(() => {
            if (this.$route.path !== '/homePage/userManagement') {
              this.$router.replace({
                path: '/homePage/userManagement'
              });
            }
          });
          break;
        case '5':
          this.$nextTick(() => {
            if (this.$route.path !== '/homePage/aboutPage') {
              this.$router.replace({
                path: '/homePage/aboutPage'
              });
            }
          });
          break;
        default:
          break;
      }
    },
    closewindow() {
      if (this.userRole === 'ADMIN') {
        ipcRenderer.send('close-window');
        return;
      }
      this.authAction = 'close';
      this.showAuthDialog = true;
    },
    minWindow() {
      ipcRenderer.send('min-window');
    },
    maxWindow() {
      // 根据当前状态发送对应的操作指令
      // 如果当前是最大化，发送还原指令；如果当前是还原，发送最大化指令
      const action =
        this.windowSize === 'unmax-window' ? 'max-window' : 'unmax-window';
      ipcRenderer.send('max-window', action);
    },
    fullScreen() {
      // 全屏切换前，如果窗口是最大化状态，先还原
      if (this.windowSize === 'max-window') {
        this.windowSize = 'unmax-window';
        ipcRenderer.send('max-window', 'unmax-window');
      }
      ipcRenderer.send('full_screen');
    },
    logoutMethod() {
      this.$nextTick(() => {
        this.$router.replace({
          path: '/'
        });
      });
      this.$nextTick(() => {
        ipcRenderer.send('logStatus', 'logout');
      });
    },
    lockScreen() {
      this.$confirm('确认锁定屏幕吗？', '锁屏', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          this.$store.commit('SET_LOCKED', true);
        })
        .catch(() => {});
    },
    handelCommand(command) {
      switch (command) {
        case 'logout':
          if (this.userRole === 'ADMIN') {
            this.$notify({
              title: '已退出登录！',
              message: '退出登录！',
              type: 'success',
              duration: 2000
            });
            this.logoutMethod();
            return;
          }
          this.authAction = 'logout';
          this.showAuthDialog = true;
          break;
        case 'updatePassword':
          if (this.userRole !== 'ADMIN') {
            this.authAction = 'updatePassword';
            this.showAuthDialog = true;
            return;
          }
          this.showNameVerifyPrompt();
          break;
        default:
          break;
      }
    },
    setCommand(command) {
      console.log(command);
      switch (command) {
        case 'full_screen':
          this.fullScreen();
          break;
        default:
          break;
      }
    },
    changeIcon() {
      ipcRenderer.on('mainWin-max', (e, status) => {
        this.windowSize = status;
      });
    },
    cancelAuth() {
      this.showAuthDialog = false;
      this.authForm.adminCode = '';
      this.authForm.adminPassword = '';
      this.$nextTick(() => {
        if (this.$refs.authForm) {
          this.$refs.authForm.clearValidate();
        }
      });
    },
    confirmAuth() {
      this.$refs.authForm.validate((valid) => {
        if (!valid) return;
        this.authLoading = true;
        const param = {
          userCode: this.authForm.adminCode,
          userPassword: this.authForm.adminPassword
        };
        HttpUtil.post('/login/login', param)
          .then((res) => {
            this.authLoading = false;
            if (res.data && res.data.userRole === 'ADMIN') {
              this.showAuthDialog = false;
              this.authForm.adminCode = '';
              this.authForm.adminPassword = '';
              if (this.authAction === 'close') {
                ipcRenderer.send('close-window');
              } else if (this.authAction === 'logout') {
                this.$notify({
                  title: '已退出登录！',
                  message: '退出登录！',
                  type: 'success',
                  duration: 2000
                });
                this.logoutMethod();
              } else if (this.authAction === 'updatePassword') {
                this.showNameVerifyPrompt();
              }
            } else {
              this.$message.error('授权失败，仅管理员账号可授权退出');
            }
          })
          .catch((err) => {
            this.authLoading = false;
            this.$message.error('账号或密码错误，授权失败');
          });
      });
    },
    showNameVerifyPrompt() {
      this.$prompt('请输入注册账号时保存的姓名：', '敏感操作！验证用户！', {
        confirmButtonText: '验证',
        cancelButtonText: '取消'
      })
        .then(({ value }) => {
          // 验证姓名是否正确
          const param = {
            userName: value,
            userCode: remote.getGlobal('sharedObject').userInfo.userCode
          };
          HttpUtil.post('/userInfo/verifyName', param)
            .then((res) => {
              if (res.data) {
                this.$message.success('验证通过！');
                // 打开修改密码的弹窗，可以修改密码
                this.dialogFormVisible = true;
              } else {
                this.$message.error('验证未通过！');
              }
            })
            .catch((err) => {
              this.$message.error('验证未通过！请重试！');
            });
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '取消验证！'
          });
        });
    },
    cancelUpdatePassword() {
      this.dialogFormVisible = false;
      this.updatePasswordForm.newPassword = '';
      this.updatePasswordForm.newPasswordAgain = '';
    },
    updatePasswordMethod() {
      if (this.updatePasswordForm.newPassword == '') {
        this.$message.error('密码不可为空，请输入！');
        return false;
      }
      if (
        this.updatePasswordForm.newPassword !==
        this.updatePasswordForm.newPasswordAgain
      ) {
        this.$message.error('密码输入不一致，请重新输入！');
        return false;
      }
      const param = {
        userPassword: this.updatePasswordForm.newPassword,
        userCode: remote.getGlobal('sharedObject').userInfo.userCode
      };
      HttpUtil.post('/userInfo/updatePassword', param)
        .then((res) => {
          if (res.data > 0) {
            this.$notify({
              title: '修改成功！',
              message: '修改成功！请重新登陆！',
              type: 'success',
              duration: 2000
            });
            // 打开修改密码的弹窗，可以修改密码
            this.dialogFormVisible = false;
            this.logoutMethod();
          } else {
            this.$message.error('修改失败！');
          }
        })
        .catch((err) => {
          this.$message.error('修改失败！');
        });
    }
  },
  created() {
    // 获取用户角色
    this.userRole = remote.getGlobal('sharedObject').userInfo.userRole || '';
    // 同步角色到store
    this.$store.commit('SET_USER_ROLE', this.userRole);
    // 给主进程发送用户角色，用于窗口权限控制
    ipcRenderer.send('set-user-role', this.userRole);
    // 给主进程发送消息，更改窗口大小，设置最小大小，默认全屏
    ipcRenderer.send('logStatus', 'login');
    this.changeIcon();
  },
  mounted() {}
};
</script>
<style lang="less" scoped>
.homePage {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e3e9f3 0%, #eef2f7 50%, #f5f7fa 100%);
  .maskDiv {
    width: 100%;
    height: 100%;
    opacity: 1;
    background: transparent;
    &-top {
      height: 55px;
      width: 100%;
      display: flex;
      align-items: center;
      border-radius: 0px 0px 10px 10px;
      background: rgba(255, 255, 255, 1);
      &-left {
        flex: 1;
        height: 100%;
        -webkit-app-region: drag;
        text-align: left;
        display: flex;
        align-items: center;
        padding-left: 10px;
        &-top-title {
          font-size: 16px;
          font-weight: 550;
          letter-spacing: 0px;
          color: rgba(28, 28, 40, 1);
          text-align: left;
          vertical-align: top;
          height: 30px;
          display: flex;
          align-items: flex-end;
        }
        &-top-title2 {
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 1.2px;
          color: rgba(70, 91, 101, 1);
          text-align: left;
          vertical-align: top;
          height: 20px;
          display: flex;
          align-items: flex-start;
        }
      }
      &-min,
      &-close,
      &-max {
        height: 45px;
        width: 45px;
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
      .version-view {
        height: 100%;
        display: inline-flex;
        align-items: center;
        vertical-align: text-bottom;
        cursor: pointer;
        .version-container {
          height: 20px;
          margin-right: 11px;
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          border-radius: 25px;
          background-color: rgba(47, 84, 235, 0.050980392156862744);
          .version-number {
            height: 20px;
            line-height: 20px;
            padding: 0 10px;
            color: #2f54eb;
            font-weight: 600;
            letter-spacing: 1px;
          }
        }
        .el-divider--vertical {
          display: inline-block;
          width: 1px;
          height: 1.5rem;
          margin: 0 8px;
          vertical-align: middle;
          position: relative;
        }
      }
      ::v-deep .el-menu--horizontal > .el-menu-item {
        margin-right: 30px;
        color: #000000;
        font-size: 13px;
        font-weight: 500;
        height: 55px;
        line-height: 60px;
      }
      ::v-deep .el-menu--horizontal > .el-menu-item.is-active {
        border-bottom: 2px solid #3e7bfa;
      }
    }
    &-down {
      width: 100%;
      height: calc(100% - 55px);
    }
  }
  ::v-deep {
    .el-drawer__wrapper {
      height: calc(100% - 57px);
      top: 57px;
      bottom: auto;
    }
    .v-modal {
      top: auto;
    }
  }
  .auth-warning-tip {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 15px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 4px;
    margin-bottom: 22px;

    i {
      color: #ff4d4f;
      font-size: 16px;
      margin-top: 1px;
      flex-shrink: 0;
    }

    .auth-warning-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .auth-warning-title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
    }

    span {
      font-size: 13px;
      color: #595959;
      line-height: 1.5;
    }
  }
}

::v-deep .auth-warning-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 15px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  margin-bottom: 22px;

  i {
    color: #ff4d4f;
    font-size: 16px;
    margin-top: 1px;
    flex-shrink: 0;
  }

  .auth-warning-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .auth-warning-title {
    font-size: 14px;
    font-weight: 600;
    color: #cf1322;
  }

  span {
    font-size: 13px;
    color: #595959;
    line-height: 1.5;
  }
}

::v-deep .el-dialog {
  .el-dialog__header {
    padding: 20px 20px 10px;

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
      color: #262626;
    }
  }

  .el-dialog__body {
    padding: 10px 20px;
  }

  .el-dialog__footer {
    padding: 10px 20px 20px;
    text-align: right;
  }
}
</style>
