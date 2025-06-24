<template>
  <div class="user-management">
    <!-- 页面容器 -->
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">用户管理</h2>
          <p class="page-subtitle">管理系统操作员用户</p>
        </div>
        <div class="header-right">
          <el-button
            @click="loadUserList"
            icon="el-icon-refresh"
            class="refresh-btn"
            :loading="refreshLoading"
          >
            刷新
          </el-button>
          <el-button
            type="primary"
            @click="showAddUserDialog = true"
            icon="el-icon-plus"
            class="add-btn"
          >
            添加操作员
          </el-button>
        </div>
      </div>

      <!-- 统计信息卡片 -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-icon total">
            <i class="el-icon-user"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ userList.length }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active">
            <i class="el-icon-circle-check"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ activeUserCount }}</div>
            <div class="stat-label">正常用户</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon locked">
            <i class="el-icon-warning"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ lockedUserCount }}</div>
            <div class="stat-label">锁定用户</div>
          </div>
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title">用户列表</div>
          <div class="table-actions">
            <el-input
              placeholder="搜索用户名或账号..."
              v-model="searchKeyword"
              prefix-icon="el-icon-search"
              size="small"
              clearable
              style="width: 200px"
            />
          </div>
        </div>

        <div class="table-wrapper">
          <el-table
            :data="filteredUserList"
            stripe
            class="user-table"
            :header-cell-style="tableHeaderStyle"
            :row-style="tableRowStyle"
          >
            <el-table-column label="用户信息" width="200">
              <template slot-scope="scope">
                <div class="user-info">
                  <el-avatar
                    :size="36"
                    :src="require('@/assets/jinan-agv/avatar15.png')"
                  ></el-avatar>
                  <div class="user-details">
                    <div class="user-name">{{ scope.row.userName }}</div>
                    <div class="user-code">{{ scope.row.userCode }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              prop="userRole"
              label="角色"
              width="120"
              align="center"
            >
              <template slot-scope="scope">
                <el-tag
                  v-if="scope.row.userRole === 'ADMIN'"
                  type="danger"
                  size="small"
                  effect="plain"
                >
                  管理员
                </el-tag>
                <el-tag v-else type="primary" size="small" effect="plain">
                  操作员
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              prop="isLocked"
              label="状态"
              width="100"
              align="center"
            >
              <template slot-scope="scope">
                <el-tag
                  v-if="scope.row.isLocked === 1"
                  type="danger"
                  size="small"
                >
                  已锁定
                </el-tag>
                <el-tag v-else type="success" size="small"> 正常 </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              prop="loginFailCount"
              label="失败次数"
              width="100"
              align="center"
            >
              <template slot-scope="scope">
                <span
                  :class="
                    scope.row.loginFailCount > 0
                      ? 'fail-count-warn'
                      : 'fail-count-normal'
                  "
                >
                  {{ scope.row.loginFailCount || 0 }}
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="createTime" label="创建时间" min-width="160">
              <template slot-scope="scope">
                <span class="create-time">{{
                  formatTime(scope.row.createTime)
                }}</span>
              </template>
            </el-table-column>

            <el-table-column
              label="操作"
              width="200"
              fixed="right"
              align="center"
            >
              <template slot-scope="scope">
                <div class="action-buttons">
                  <el-button
                    v-if="scope.row.isLocked === 1"
                    size="mini"
                    type="success"
                    @click="handleUnlock(scope.row)"
                  >
                    解锁
                  </el-button>
                  <el-button
                    v-else
                    size="mini"
                    type="warning"
                    @click="handleLock(scope.row)"
                  >
                    锁定
                  </el-button>
                  <el-button
                    size="mini"
                    type="primary"
                    @click="handleResetPassword(scope.row)"
                  >
                    重置密码
                  </el-button>
                  <el-button
                    size="mini"
                    type="danger"
                    @click="handleDelete(scope.row)"
                  >
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 添加用户对话框 -->
    <el-dialog
      title="添加操作员"
      :visible.sync="showAddUserDialog"
      width="450px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form
        :model="newUser"
        ref="userForm"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="账号" prop="userCode">
          <el-input v-model="newUser.userCode" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="姓名" prop="userName">
          <el-input v-model="newUser.userName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="userPassword">
          <el-input
            v-model="newUser.userPassword"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="newUser.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelAddUser">取 消</el-button>
        <el-button
          type="primary"
          @click="handleAddUser"
          :loading="addUserLoading"
        >
          确 定
        </el-button>
      </span>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      title="重置密码"
      :visible.sync="showResetPasswordDialog"
      width="400px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="reset-user-card">
        <el-avatar :src="require('@/assets/jinan-agv/header.png')"></el-avatar>
        <div class="reset-user-info">
          <div class="reset-user-name">{{ currentUser?.userName }}</div>
          <div class="reset-user-code">{{ currentUser?.userCode }}</div>
        </div>
      </div>

      <el-form
        :model="resetPasswordData"
        ref="passwordForm"
        :rules="passwordRules"
        label-width="100px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordData.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordData.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelResetPassword">取 消</el-button>
        <el-button
          type="primary"
          @click="confirmResetPassword"
          :loading="resetPasswordLoading"
        >
          确 定
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import HttpUtil from '@/utils/HttpUtil';

export default {
  name: 'UserManagement',
  components: {},
  props: {},
  data() {
    const validatePass = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入密码'));
      } else {
        if (this.newUser.confirmPassword !== '') {
          this.$refs.userForm.validateField('confirmPassword');
        }
        callback();
      }
    };
    const validatePass2 = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次输入密码'));
      } else if (value !== this.newUser.userPassword) {
        callback(new Error('两次输入密码不一致!'));
      } else {
        callback();
      }
    };
    const validateResetPass2 = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次输入密码'));
      } else if (value !== this.resetPasswordData.newPassword) {
        callback(new Error('两次输入密码不一致!'));
      } else {
        callback();
      }
    };

    return {
      userList: [],
      searchKeyword: '',
      showAddUserDialog: false,
      showResetPasswordDialog: false,
      addUserLoading: false,
      resetPasswordLoading: false,
      refreshLoading: false,
      currentUser: null,
      newUser: {
        userCode: '',
        userName: '',
        userPassword: '',
        confirmPassword: ''
      },
      resetPasswordData: {
        newPassword: '',
        confirmPassword: ''
      },
      rules: {
        userCode: [
          { required: true, message: '请输入账号', trigger: 'blur' },
          {
            pattern: /^[a-zA-Z0-9_]+$/,
            message: '账号只能包含字母、数字和下划线',
            trigger: 'blur'
          }
        ],
        userName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        userPassword: [
          { required: true, validator: validatePass, trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, validator: validatePass2, trigger: 'blur' }
        ]
      },
      passwordRules: {
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, validator: validateResetPass2, trigger: 'blur' }
        ]
      },
      tableHeaderStyle: {
        background: '#f8f9fc',
        color: '#606266',
        fontWeight: '600',
        fontSize: '14px'
      },
      tableRowStyle: {
        fontSize: '13px'
      }
    };
  },
  watch: {},
  computed: {
    filteredUserList() {
      if (!this.searchKeyword) {
        return this.userList;
      }
      return this.userList.filter(
        (user) =>
          user.userCode
            .toLowerCase()
            .includes(this.searchKeyword.toLowerCase()) ||
          user.userName.toLowerCase().includes(this.searchKeyword.toLowerCase())
      );
    },
    activeUserCount() {
      return this.userList.filter((user) => user.isLocked !== 1).length;
    },
    lockedUserCount() {
      return this.userList.filter((user) => user.isLocked === 1).length;
    }
  },
  methods: {
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return '--';
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    // 加载用户列表
    loadUserList() {
      this.refreshLoading = true;
      HttpUtil.get('/userInfo/getOperatorList')
        .then((res) => {
          this.refreshLoading = false;
          if (res.data) {
            this.userList = res.data;
            this.$message.success('刷新成功');
          } else {
            this.$message.error(res.message || '获取用户列表失败');
          }
        })
        .catch((err) => {
          this.refreshLoading = false;
          this.$message.error('获取用户列表失败');
        });
    },

    // 取消添加用户
    cancelAddUser() {
      this.showAddUserDialog = false;
      this.resetForm();
    },

    // 添加用户
    handleAddUser() {
      this.$refs.userForm.validate((valid) => {
        if (valid) {
          this.addUserLoading = true;
          const param = {
            userCode: this.newUser.userCode,
            userName: this.newUser.userName,
            userPassword: this.newUser.userPassword
          };

          HttpUtil.post('/userInfo/registerOperator', param)
            .then((res) => {
              this.addUserLoading = false;
              if (res.data) {
                this.$message.success('添加成功');
                this.showAddUserDialog = false;
                this.resetForm();
                this.loadUserList();
              } else {
                this.$message.error(res.message || '添加失败');
              }
            })
            .catch((err) => {
              this.addUserLoading = false;
              this.$message.error('添加失败');
            });
        }
      });
    },

    // 解锁用户
    handleUnlock(user) {
      this.$confirm('确定要解锁该用户吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          HttpUtil.post(`/userInfo/unlockUser/${user.userId}`)
            .then((res) => {
              if (res.data) {
                this.$message.success('解锁成功');
                this.loadUserList();
              } else {
                this.$message.error(res.message || '解锁失败');
              }
            })
            .catch((err) => {
              this.$message.error('解锁失败');
            });
        })
        .catch(() => {
          // 用户取消操作
        });
    },

    // 锁定用户
    handleLock(user) {
      this.$confirm('确定要锁定该用户吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          HttpUtil.post(`/userInfo/lockUser/${user.userId}`)
            .then((res) => {
              if (res.data) {
                this.$message.success('锁定成功');
                this.loadUserList();
              } else {
                this.$message.error(res.message || '锁定失败');
              }
            })
            .catch((err) => {
              this.$message.error('锁定失败');
            });
        })
        .catch(() => {
          // 用户取消操作
        });
    },

    // 重置密码
    handleResetPassword(user) {
      this.currentUser = user;
      this.resetPasswordData = {
        newPassword: '',
        confirmPassword: ''
      };
      this.showResetPasswordDialog = true;
    },

    // 取消重置密码
    cancelResetPassword() {
      this.showResetPasswordDialog = false;
      this.resetPasswordData = {
        newPassword: '',
        confirmPassword: ''
      };
    },

    // 确认重置密码
    confirmResetPassword() {
      this.$refs.passwordForm.validate((valid) => {
        if (valid) {
          this.resetPasswordLoading = true;
          const param = {
            userId: this.currentUser.userId,
            newPassword: this.resetPasswordData.newPassword
          };

          HttpUtil.post('/userInfo/resetPassword', param)
            .then((res) => {
              this.resetPasswordLoading = false;
              if (res.data) {
                this.$message.success('密码重置成功');
                this.showResetPasswordDialog = false;
                this.resetPasswordData = {
                  newPassword: '',
                  confirmPassword: ''
                };
              } else {
                this.$message.error(res.message || '密码重置失败');
              }
            })
            .catch((err) => {
              this.resetPasswordLoading = false;
              this.$message.error('密码重置失败');
            });
        }
      });
    },

    // 删除用户
    handleDelete(user) {
      this.$confirm('确定要删除该用户吗？此操作不可恢复', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          HttpUtil.delete(`/userInfo/deleteUser/${user.userId}`)
            .then((res) => {
              // 判断是否删除成功：影响行数大于0表示删除成功
              if (res.data > 0) {
                this.$message.success('删除成功');
                this.loadUserList();
              } else {
                this.$message.error('删除失败，用户可能不存在或无权限删除');
              }
            })
            .catch((err) => {
              this.$message.error('删除失败');
            });
        })
        .catch(() => {
          // 用户取消操作
        });
    },

    // 重置表单
    resetForm() {
      this.newUser = {
        userCode: '',
        userName: '',
        userPassword: '',
        confirmPassword: ''
      };
      if (this.$refs.userForm) {
        this.$refs.userForm.clearValidate();
      }
    }
  },
  created() {},
  mounted() {
    this.loadUserList();
  }
};
</script>

<style lang="less" scoped>
.user-management {
  width: 100%;
  height: 100%;
  padding: 5px;
  box-sizing: border-box;

  .page-container {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 1);
    border-radius: 20px;
    box-shadow: 0px 60px 90px 0px rgba(0, 0, 0, 0.2);
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e6e6e6;

      .header-left {
        .page-title {
          margin: 0 0 5px 0;
          font-size: 24px;
          font-weight: 600;
          color: #262626;
        }

        .page-subtitle {
          margin: 0;
          font-size: 13px;
          color: #8c8c8c;
        }
      }

      .header-right {
        display: flex;
        gap: 10px;

        .refresh-btn,
        .add-btn {
          font-size: 14px;
          padding: 8px 16px;
        }
      }
    }

    .stats-section {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;

      .stat-card {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 15px;
        background: #f8f9fc;
        border-radius: 8px;
        border: 1px solid #e6e8eb;

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;

          i {
            font-size: 20px;
            color: #fff;
          }

          &.total {
            background: #4385ff;
          }

          &.active {
            background: #52c41a;
          }

          &.locked {
            background: #ff4d4f;
          }
        }

        .stat-content {
          .stat-number {
            font-size: 20px;
            font-weight: 600;
            color: #262626;
            line-height: 1;
          }

          .stat-label {
            font-size: 12px;
            color: #8c8c8c;
            margin-top: 2px;
          }
        }
      }
    }

    .table-section {
      flex: 1;
      display: flex;
      flex-direction: column;

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;

        .table-title {
          font-size: 16px;
          font-weight: 600;
          color: #262626;
        }
      }

      .table-wrapper {
        flex: 1;
        overflow: auto;

        .user-table {
          width: 100%;

          .user-info {
            display: flex;
            align-items: center;
            gap: 10px;

            .user-details {
              .user-name {
                font-weight: 500;
                color: #262626;
                font-size: 13px;
                margin-bottom: 2px;
              }

              .user-code {
                color: #8c8c8c;
                font-size: 12px;
              }
            }
          }

          .fail-count-warn {
            color: #ff4d4f;
            font-weight: 600;
          }

          .fail-count-normal {
            color: #8c8c8c;
          }

          .create-time {
            color: #8c8c8c;
            font-size: 12px;
          }

          .action-buttons {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;

            .el-button--mini {
              padding: 5px 8px;
              font-size: 12px;
            }
          }
        }
      }
    }
  }

  // 对话框样式
  ::v-deep .el-dialog {
    border-radius: 8px;

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

      .reset-user-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 15px;
        background: #f8f9fc;
        border-radius: 6px;
        margin-bottom: 20px;

        .reset-user-info {
          .reset-user-name {
            font-weight: 600;
            color: #262626;
            font-size: 14px;
          }

          .reset-user-code {
            color: #8c8c8c;
            font-size: 12px;
            margin-top: 2px;
          }
        }
      }

      .el-form-item {
        margin-bottom: 18px;

        .el-form-item__label {
          font-weight: 500;
          color: #262626;
          font-size: 13px;
        }

        .el-input__inner {
          border-radius: 4px;
          font-size: 13px;
        }
      }
    }

    .el-dialog__footer {
      padding: 10px 20px 20px;
      text-align: right;

      .el-button {
        font-size: 13px;
        padding: 8px 16px;
      }
    }
  }

  // 表格样式优化
  ::v-deep .el-table {
    th {
      padding: 12px 0;
    }

    td {
      padding: 10px 0;
    }

    .el-table__row:hover > td {
      background-color: #f8f9fc !important;
    }
  }

  // 标签样式
  ::v-deep .el-tag {
    border-radius: 4px;
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>
