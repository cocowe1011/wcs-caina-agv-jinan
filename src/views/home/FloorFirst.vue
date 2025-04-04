<template>
  <div class="floor-image-container">
    <div class="image-wrapper">
      <img src="@/assets/jinan-agv/2800-2F.png" alt="一楼平面图" class="floor-image" @load="updateMarkerPositions">
      <!-- 上货扫码区域提示 -->
      <div class="marker-with-panel" data-x="230" data-y="200">
        <div class="pulse"></div>
        <div class="data-panel" :class="['position-bottom', { 'always-show': true }]">
          <div class="data-panel-header">
            <span>上货扫码信息</span>
          </div>
          <div class="data-panel-content">
            <div class="data-panel-row">
              <span class="data-panel-label">当前上货扫码信息：</span>
              <span>{{ scanInfo.palletCode || '暂无' }}</span>
            </div>
            <div class="data-panel-row">
              <span class="data-panel-label">货品名称：</span>
              <span>{{ scanInfo.productName || '暂无' }}</span>
            </div>
            <div class="data-panel-row">
              <span class="data-panel-label">批次号：</span>
              <span>{{ scanInfo.batchNumber || '暂无' }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 添加带按钮的点位示例 -->
      <div class="marker-with-button" data-x="1820" data-y="1050">
        <div class="pulse"></div>
        <button class="marker-button" @click="handlePalletStorageClick">托盘缓存区操作</button>
      </div>
      <!-- 添加带按钮的点位示例 -->
      <div class="marker-with-button" data-x="2900" data-y="75">
        <div class="pulse"></div>
        <button class="marker-button" @click="handleEmptyPalletStorageClick">空托盘缓存区操作</button>
      </div>
      <!-- 机械臂 -->
      <div v-for="arm in mechanicalArms" 
            :key="arm.name" 
            class="marker-with-panel-machine" 
            :data-x="arm.x" 
            :data-y="arm.y">
        <div class="data-panel data-panel-mechanical-arm" :class="[`position-${arm.position}`, { 'always-show': true }]">
          <div class="data-panel-header">
            <span>机械臂{{ arm.name }}</span>
            <el-button 
              v-if="arm.status === 2 && arm.currentPallet"
              type="text"
              size="mini"
              @click="handleArmPalletToEmpty(arm)">
              <i class="el-icon-position"></i>
              移除
            </el-button>
          </div>
          <div class="data-panel-content">
            <div class="data-panel-row">
              <span class="data-panel-label">托盘码：</span>
              <span>{{ arm.currentPallet || '暂无' }}</span>
            </div>
            <div class="data-panel-row">
              <span class="data-panel-label">状态：</span>
              <span :class="getStatusClass(arm.status)">
                <i :class="getStatusIcon(arm.status)" style="margin-right: 2px;"></i>
                {{ getStatusText(arm.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- 机械臂 -->
    </div>

    <!-- 托盘缓存区抽屉 -->
    <el-drawer
      title="托盘缓存区"
      :visible.sync="palletStorageDrawerVisible"
      direction="rtl"
      size="400px"
      :modal="false"
      custom-class="storage-drawer"
    >
      <div class="storage-container">
        <div v-for="(position, index) in palletStoragePositions" 
             :key="index" 
             class="storage-card"
             :class="{'can-move': position.palletCode}">
          <div class="storage-card-header">
            <span>位置 {{ position.name }}</span>
            <div class="card-actions">
              <el-button 
                v-if="!position.palletCode" 
                type="text" 
                size="mini"
                @click="handleAddPallet(position)">
                <i class="el-icon-plus"></i>
                添加托盘
              </el-button>
              <template v-else>
                <el-button 
                  type="text" 
                  size="mini"
                  @click="position.palletCode && handlePalletCardClick(position)">
                  <i class="el-icon-position"></i>
                  移动
                </el-button>
                <el-button 
                  type="text" 
                  size="mini"
                  class="danger-button"
                  @click="handleRemovePallet(position)">
                  <i class="el-icon-delete"></i>
                  移除
                </el-button>
              </template>
            </div>
          </div>
          <div class="storage-card-content">
            <template v-if="position.palletCode">
              <div class="storage-info">
                <span class="label">托盘码：</span>
                <span class="value">{{ position.palletCode }}</span>
              </div>
            </template>
            <template v-else>
              <div class="storage-info empty">
                <span>空闲</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 空托盘缓存区抽屉 -->
    <el-drawer
      title="空托盘缓存区"
      :visible.sync="emptyPalletStorageDrawerVisible"
      direction="rtl"
      size="400px"
      :modal="false"
      custom-class="storage-drawer"
    >
      <div class="storage-container">
        <div v-for="(position, index) in emptyPalletStoragePositions" 
             :key="index" 
             class="storage-card">
          <div class="storage-card-header">
            <span>位置 {{ position.name }}</span>
            <div class="card-actions">
              <template v-if="position.palletCode">
                <el-button 
                  type="text" 
                  size="mini"
                  class="danger-button"
                  @click="handleRemovePallet(position)">
                  <i class="el-icon-delete"></i>
                  移除
                </el-button>
              </template>
            </div>
          </div>
          <div class="storage-card-content">
            <template v-if="position.palletCode">
              <div class="storage-info">
                <span class="label">托盘码：</span>
                <span class="value">{{ position.palletCode }}</span>
              </div>
            </template>
            <template v-else>
              <div class="storage-info empty">
                <span>空闲</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 选择机械臂弹窗 -->
    <el-dialog
      title="选择目标机械臂"
      :visible.sync="selectArmDialogVisible"
      append-to-body
      width="400px"
      :close-on-click-modal="false"
    >
      <el-select v-model="selectedArmName" placeholder="请选择机械臂" style="width: 100%">
        <el-option
          v-for="arm in availableArms"
          :key="arm.name"
          :label="`机械臂 ${arm.name}`"
          :value="arm.name">
        </el-option>
      </el-select>
      <div slot="footer" class="dialog-footer">
        <el-button @click="selectArmDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmMovePallet" :disabled="!selectedArmName">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 添加托盘对话框 -->
    <el-dialog
      title="添加托盘"
      :visible.sync="addPalletDialogVisible"
      append-to-body
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="palletForm" ref="palletForm" :rules="palletRules">
        <el-form-item label="托盘码" prop="palletCode">
          <el-input 
            v-model="palletForm.palletCode" 
            placeholder="请输入托盘码"
            maxlength="12"
            show-word-limit>
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="addPalletDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmAddPallet">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 添加测试按钮 -->
    <div class="test-button-container">
      <el-button type="info" size="mini" plain @click="showTestPanel">
        <i class="el-icon-setting"></i>
        测试
      </el-button>
    </div>

    <!-- 测试面板对话框 -->
    <el-dialog
      title="测试面板"
      :visible.sync="testPanelVisible"
      append-to-body
      width="360px"
      :close-on-click-modal="false"
      custom-class="test-panel-dialog"
    >
      <div class="test-panel-content">
        <!-- 上货扫码模拟 -->
        <div class="test-section">
          <h3>上货扫码模拟</h3>
          <div class="test-form">
            <el-form :model="testScanForm" label-width="70px" size="small">
              <el-form-item label="托盘码">
                <el-input v-model="testScanForm.palletCode" placeholder="请输入12位数字托盘码"></el-input>
              </el-form-item>
              <el-form-item label="货品名">
                <el-input v-model="testScanForm.productName" placeholder="请输入货品名称"></el-input>
              </el-form-item>
              <el-form-item label="批次号">
                <el-input v-model="testScanForm.batchNumber" placeholder="请输入批次号"></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="small" @click="simulateScan">模拟扫码</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 机械臂状态控制 -->
        <div class="test-section">
          <h3>机械臂状态控制</h3>
          <div class="test-form">
            <el-form :model="testArmForm" label-width="70px" size="small">
              <el-form-item label="机械臂">
                <el-select v-model="testArmForm.selectedArm" placeholder="请选择机械臂">
                  <el-option
                    v-for="arm in mechanicalArms"
                    :key="arm.name"
                    :label="`机械臂 ${arm.name}`"
                    :value="arm.name">
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="testArmForm.targetStatus" placeholder="请选择目标状态">
                  <el-option :value="0" label="空闲中"></el-option>
                  <el-option :value="1" label="处理中"></el-option>
                  <el-option :value="2" label="已完成"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="small" @click="changeArmStatus">更改状态</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 添加悬浮日志面板 -->
    <div class="floating-log-container">
      <div class="log-header" @click="toggleLogPanel">
        <span class="log-title">操作日志</span>
        <div class="log-actions">
          <el-button type="text" size="mini" @click.stop="toggleLogPanel">
            <i :class="isLogExpanded ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
          </el-button>
        </div>
      </div>
      <div class="log-content" ref="logContent" v-show="isLogExpanded">
        <template v-if="logs.length > 0">
          <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </template>
        <template v-else>
          <div class="empty-log">
            <i class="el-icon-document"></i>
            <span>暂无日志</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'FloorFirst',
  data() {
    return {
      palletStorageDrawerVisible: false,
      emptyPalletStorageDrawerVisible: false,
      selectArmDialogVisible: false,
      selectedPalletPosition: null,
      selectedArmName: '',
      addPalletDialogVisible: false,
      palletForm: {
        palletCode: ''
      },
      palletRules: {
        palletCode: [
          { required: true, message: '请输入托盘码', trigger: 'blur' },
          { pattern: /^\d{12}$/, message: '托盘码必须为12位数字', trigger: 'blur' }
        ]
      },
      // 托盘缓存区位置数据
      palletStoragePositions: Array.from({ length: 10 }, (_, i) => ({
        name: `P${i + 1}`,
        palletCode: null
      })),
      // 空托盘缓存区位置数据
      emptyPalletStoragePositions: Array.from({ length: 4 }, (_, i) => ({
        name: `E${i + 1}`,
        palletCode: null
      })),
      mechanicalArms: [
        { 
          name: 'B1', 
          x: 1340, 
          y: 320, 
          status: 0, 
          currentPallet: null,
          position: 'top'
        },
        { 
          name: 'B2', 
          x: 1300, 
          y: 390, 
          status: 0, 
          currentPallet: null,
          position: 'left'
        },
        { 
          name: 'B3', 
          x: 1375, 
          y: 390, 
          status: 0, 
          currentPallet: null,
          position: 'right'
        },
        { 
          name: 'B4', 
          x: 1230, 
          y: 630, 
          status: 0, 
          currentPallet: null,
          position: 'left'
        },
        { 
          name: 'B5', 
          x: 1350, 
          y: 630, 
          status: 0, 
          currentPallet: null,
          position: 'right'
        },
        { 
          name: 'C1', 
          x: 1235, 
          y: 870, 
          status: 0, 
          currentPallet: null,
          position: 'left'
        },
        { 
          name: 'C2', 
          x: 1375, 
          y: 870, 
          status: 0, 
          currentPallet: null,
          position: 'right'
        },
        { 
          name: 'C3', 
          x: 1235, 
          y: 1110, 
          status: 0, 
          currentPallet: null,
          position: 'left'
        },
        { 
          name: 'C4', 
          x: 1330, 
          y: 1110, 
          status: 0, 
          currentPallet: null,
          position: 'right'
        },
        { 
          name: 'C5', 
          x: 1280, 
          y: 1185, 
          status: 0, 
          currentPallet: null,
          position: 'bottom'
        }
      ],
      testPanelVisible: false,
      testScanForm: {
        palletCode: '',
        productName: '',
        batchNumber: ''
      },
      testArmForm: {
        selectedArm: '',
        targetStatus: ''
      },
      // 添加上货扫码区域信息
      scanInfo: {
        palletCode: '',
        productName: '',
        batchNumber: ''
      },
      // 添加日志数据
      logs: [],
      isLogExpanded: false,  // 添加日志面板展开状态
    };
  },
  computed: {
    getStatusClass() {
      return (status) => {
        const statusClasses = {
          0: 'status-idle',
          1: 'status-processing',
          2: 'status-completed'
        };
        return statusClasses[status];
      };
    },
    getStatusIcon() {
      return (status) => {
        const statusIcons = {
          0: 'el-icon-time',
          1: 'el-icon-loading',
          2: 'el-icon-check'
        };
        return statusIcons[status];
      };
    },
    availableArms() {
      return this.mechanicalArms.filter(arm => arm.status === 0 && !arm.currentPallet);
    }
  },
  mounted() {
    this.initializeMarkers();
  },
  methods: {
    getStatusText(status) {
      const statusTexts = {
        0: '空闲中',
        1: '处理中',
        2: '已完成'
      };
      return statusTexts[status];
    },
    initializeMarkers() {
      this.$nextTick(() => {
        this.updateMarkerPositions();
        window.addEventListener('resize', this.updateMarkerPositions);
      });
    },
    updateMarkerPositions() {
      const images = document.querySelectorAll('.floor-image');
      images.forEach(image => {
        const imageWrapper = image.parentElement;
        if (!imageWrapper) return;

        const markers = imageWrapper.querySelectorAll('.marker, .marker-with-panel, .marker-with-panel-machine, .marker-with-button');
        const imageRect = image.getBoundingClientRect();
        const wrapperRect = imageWrapper.getBoundingClientRect();
        
        // 计算图片的实际显示区域
        const displayedWidth = image.width;
        const displayedHeight = image.height;
        const scaleX = displayedWidth / image.naturalWidth;
        const scaleY = displayedHeight / image.naturalHeight;
        
        // 计算图片在容器中的偏移量
        const imageOffsetX = (wrapperRect.width - displayedWidth) / 2;
        const imageOffsetY = (wrapperRect.height - displayedHeight) / 2;
        
        markers.forEach(marker => {
          const x = parseFloat(marker.dataset.x);
          const y = parseFloat(marker.dataset.y);
          if (!isNaN(x) && !isNaN(y)) {
            marker.style.left = `${imageOffsetX + (x * scaleX)}px`;
            marker.style.top = `${imageOffsetY + (y * scaleY)}px`;
          }
        });
      });
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.updateMarkerPositions);
    },
    handlePalletStorageClick() {
      this.palletStorageDrawerVisible = true;
    },
    handleEmptyPalletStorageClick() {
      this.emptyPalletStorageDrawerVisible = true;
    },
    // 获取可用的托盘缓存位置
    getAvailablePalletPosition() {
      return this.palletStoragePositions.find(pos => !pos.palletCode);
    },
    // 分配托盘到空位置
    assignPalletToPosition(palletCode) {
      const availablePosition = this.getAvailablePalletPosition();
      if (availablePosition) {
        availablePosition.palletCode = palletCode;
        return true;
      }
      return false;
    },
    handlePalletCardClick(position) {
      if (this.availableArms.length === 0) {
        this.$message.warning('当前没有空闲的机械臂');
        return;
      }
      this.selectedPalletPosition = position;
      this.selectedArmName = '';
      this.selectArmDialogVisible = true;
    },
    confirmMovePallet() {
      if (!this.selectedArmName || !this.selectedPalletPosition) {
        this.$message.warning('请选择目标机械臂');
        return;
      }
      
      // 根据名称找到对应的机械臂对象
      const selectedArm = this.mechanicalArms.find(arm => arm.name === this.selectedArmName);
      if (!selectedArm) {
        this.$message.error('未找到选中的机械臂');
        return;
      }
      
      // 更新机械臂状态
      selectedArm.currentPallet = this.selectedPalletPosition.palletCode;
      selectedArm.status = 1; // 设置为处理中状态
      
      // 添加日志
      this.addLog('info', `托盘 ${this.selectedPalletPosition.palletCode} 从位置 ${this.selectedPalletPosition.name} 移动到机械臂 ${selectedArm.name}`);
      
      // 清空原托盘位置
      this.selectedPalletPosition.palletCode = null;
      
      // 关闭弹窗并重置选择
      this.selectArmDialogVisible = false;
      this.selectedPalletPosition = null;
      this.selectedArmName = '';
      
      this.$message.success('托盘移动指令已发送');
    },
    handleAddPallet(position) {
      this.selectedPosition = position;
      this.palletForm.palletCode = '';
      this.addPalletDialogVisible = true;
    },
    handleRemovePallet(position) {
      this.$confirm('确认移除该托盘码吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        position.palletCode = null;
        this.$message.success('托盘已移除');
      }).catch(() => {});
    },
    confirmAddPallet() {
      this.$refs.palletForm.validate((valid) => {
        if (valid) {
          if (this.selectedPosition) {
            this.selectedPosition.palletCode = this.palletForm.palletCode;
            this.addPalletDialogVisible = false;
            this.selectedPosition = null;
            this.$message.success('托盘添加成功');
          }
        }
      });
    },
    handleArmPalletToEmpty(arm) {
      // 检查是否有可用的空托盘位置
      const availableEmptyPosition = this.emptyPalletStoragePositions.find(pos => !pos.palletCode);
      
      if (!availableEmptyPosition) {
        this.$message.warning('空托盘区域已满,无法移动');
        this.addLog('error', '空托盘区域已满，无法移动托盘');
        return;
      }

      this.$confirm('确认将托盘移至空托盘区吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 将托盘移动到空托盘位置
        availableEmptyPosition.palletCode = arm.currentPallet;
        this.addLog('success', `托盘 ${arm.currentPallet} 从机械臂 ${arm.name} 移动到空托盘区位置 ${availableEmptyPosition.name}`);
        
        // 清空机械臂状态
        arm.currentPallet = null;
        arm.status = 0;
        this.$message.success('托盘已成功移至空托盘区');
      }).catch(() => {});
    },
    showTestPanel() {
      this.testPanelVisible = true;
    },
    simulateScan() {
      if (!this.testScanForm.palletCode || !this.testScanForm.productName || !this.testScanForm.batchNumber) {
        this.$message.warning('请填写完整的扫码信息');
        return;
      }

      // 更新上货扫码区域的信息
      this.scanInfo = {
        palletCode: this.testScanForm.palletCode,
        productName: this.testScanForm.productName,
        batchNumber: this.testScanForm.batchNumber
      };

      // 添加扫码日志
      this.addLog('info', `扫码成功：托盘码 ${this.scanInfo.palletCode}，货品 ${this.scanInfo.productName}，批次 ${this.scanInfo.batchNumber}`);

      // 查找托盘缓存区的空位
      const availablePosition = this.palletStoragePositions.find(pos => !pos.palletCode);
      
      if (!availablePosition) {
        this.$message.error('托盘缓存区已满，无法分配位置');
        this.addLog('error', '托盘缓存区已满，无法分配位置');
        return;
      }

      // 分配托盘到空位置
      availablePosition.palletCode = this.testScanForm.palletCode;
      this.addLog('success', `托盘已分配到缓存区位置 ${availablePosition.name}`);

      // 清空表单
      this.testScanForm = {
        palletCode: '',
        productName: '',
        batchNumber: ''
      };

      this.$message.success(`扫码成功，托盘已分配到位置 ${availablePosition.name}`);

      // 自动打开托盘缓存区抽屉
      this.palletStorageDrawerVisible = true;
    },
    changeArmStatus() {
      if (!this.testArmForm.selectedArm || this.testArmForm.targetStatus === '') {
        this.$message.warning('请选择机械臂和目标状态');
        return;
      }
      
      // 查找并更新选中的机械臂状态
      const arm = this.mechanicalArms.find(a => a.name === this.testArmForm.selectedArm);
      if (arm) {
        const oldStatus = this.getStatusText(arm.status);
        arm.status = this.testArmForm.targetStatus;
        const newStatus = this.getStatusText(arm.status);
        this.addLog('info', `机械臂 ${arm.name} 状态从 ${oldStatus} 变更为 ${newStatus}`);
        this.$message.success(`机械臂 ${arm.name} 状态已更新`);
      }
    },
    // 添加日志方法
    addLog(type, message) {
      const time = new Date().toLocaleTimeString();
      this.logs.push({ time, type, message });
      // 保持最新的100条日志
      if (this.logs.length > 100) {
        this.logs.shift();
      }
      // 滚动到最新日志
      this.$nextTick(() => {
        if (this.$refs.logContent) {
          this.$refs.logContent.scrollTop = this.$refs.logContent.scrollHeight;
        }
      });
    },
    // 切换日志面板展开状态
    toggleLogPanel() {
      this.isLogExpanded = !this.isLogExpanded;
    },
  }
};
</script>

<style scoped>
.floor-image-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  position: relative;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floor-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.marker {
  position: absolute;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
  pointer-events: auto;
}

.marker::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(10, 197, 168, 0.8);
  border-radius: 50%;
  animation: glow 2s infinite;
}

.pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(10, 197, 168, 0.4);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.marker-label {
  position: absolute;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  bottom: 150%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
}

.marker:hover .marker-label {
  opacity: 1;
}

.marker-show-label .marker-label {
  opacity: 1;
}

@keyframes glow {
  0% {
    box-shadow: 0 0 0 0 rgba(10, 197, 168, 0.4);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(10, 197, 168, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(10, 197, 168, 0);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
/* 带数据面板的标识点样式 */
.marker-with-panel, .marker-with-panel-machine {
  position: absolute;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
}

.marker-with-panel::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(64, 158, 255, 0.8);
  border-radius: 50%;
  animation: glow-blue 2s infinite;
}

.marker-with-panel .pulse {
  background: rgba(64, 158, 255, 0.4);
}

.marker-line {
  position: absolute;
  width: 100px;
  height: 2px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.8), rgba(64, 158, 255, 0.2));
  transform-origin: left center;
  transition: all 0.3s ease;
}

.data-panel {
  position: absolute;
  background: rgba(30, 42, 56, 0.95);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}

/* 面板位置样式 */
.data-panel.position-right {
  left: calc(100% + 15px);
  top: 50%;
  transform: translateY(-50%);
}

.data-panel.position-left {
  right: calc(100% + 15px);
  top: 50%;
  transform: translateY(-50%);
}

.data-panel.position-top {
  bottom: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%);
}

.data-panel.position-bottom {
  top: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%);
}

.data-panel.position-top-left {
  bottom: calc(100% + 15px);
  right: calc(100% + 15px);
  transform: none;
}

.data-panel.position-top-right {
  bottom: calc(100% + 15px);
  left: calc(100% + 15px);
  transform: none;
}

.data-panel.position-bottom-left {
  top: calc(100% + 15px);
  right: calc(100% + 15px);
  transform: none;
}

.data-panel.position-bottom-right {
  top: calc(100% + 15px);
  left: calc(100% + 15px);
  transform: none;
}

/* 始终显示的面板 */
.data-panel.always-show {
  opacity: 1;
  pointer-events: auto;  /* 允许面板响应鼠标事件 */
}

/* 悬停时显示面板 */
.marker-with-panel:hover .data-panel:not(.always-show) {
  opacity: 1;
  pointer-events: auto;  /* 悬停时也允许面板响应鼠标事件 */
}

.data-panel-header {
  font-size: 14px;
  color: #409eff;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

.data-panel-content {
  font-size: 12px;
}

.data-panel-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.9);
}

.data-panel-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

/* 竖向布局样式 */
.data-panel.vertical-layout {
  width: 110px;
  padding: 8px;
}

.data-panel.vertical-layout .data-panel-row {
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.data-panel.vertical-layout .data-panel-label {
  margin-bottom: 2px;
}

/* 带按钮的点位样式 */
.marker-with-button {
  position: absolute;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
}

.marker-with-button::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(255, 156, 0, 0.8);
  border-radius: 50%;
  animation: glow 2s infinite;
}

.marker-with-button .pulse {
  background: rgba(255, 156, 0, 0.4);
}

.marker-with-button .marker-button {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(145deg, rgba(255, 156, 0, 0.9), rgba(255, 126, 0, 0.9));
  border: 1px solid rgba(255, 176, 20, 0.3);
  border-radius: 6px;
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(255, 156, 0, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.marker-with-button .marker-button:hover {
  background: linear-gradient(145deg, rgba(255, 166, 10, 1), rgba(255, 136, 10, 1));
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 156, 0, 0.3);
}

.marker-with-button .marker-button:active {
  transform: translateY(-50%) scale(0.98);
  box-shadow: 0 2px 4px rgba(255, 156, 0, 0.2);
}

.status-idle {
  color: #409EFF;
}

.status-processing {
  color: #E6A23C;
}

.status-completed {
  color: #67C23A;
}

.data-panel-mechanical-arm {
  background: linear-gradient(145deg, rgba(16, 42, 66, 0.95), rgba(8, 72, 107, 0.95));
  border: 1px solid rgba(0, 231, 255, 0.2);
  box-shadow: 
    0 4px 20px rgba(0, 231, 255, 0.1),
    inset 0 0 0 1px rgba(0, 231, 255, 0.05);
  backdrop-filter: blur(12px);
  width: 140px;
}

.data-panel-mechanical-arm .data-panel-header {
  color: #00e7ff;
  border-bottom: 1px solid rgba(0, 231, 255, 0.2);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: auto;  /* 确保整个header区域可以响应事件 */
}

.data-panel-mechanical-arm .data-panel-header span {
  margin-right: 8px;
}

.data-panel-mechanical-arm .data-panel-header .el-button {
  color: #f56c6c;
  padding: 0;
  pointer-events: auto;  /* 确保按钮可以点击 */
  cursor: pointer;
  z-index: 1;
}

.data-panel-mechanical-arm .data-panel-header .el-button:hover {
  color: #f78989;
}

.data-panel-mechanical-arm .data-panel-row {
  color: #e2e8f0;
}

.data-panel-mechanical-arm .data-panel-label {
  color: rgba(0, 231, 255, 0.7);
}
/* 抽屉内容样式 */
.storage-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

/* 自定义滚动条样式 */
.storage-container::-webkit-scrollbar {
  width: 6px;
}

.storage-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.storage-container::-webkit-scrollbar-thumb {
  background: rgba(64, 158, 255, 0.3);
  border-radius: 3px;
  transition: all 0.3s ease;
}

.storage-container::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 158, 255, 0.5);
}

.storage-card {
  background: rgba(30, 42, 56, 0.95);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.storage-card.can-move {
  cursor: pointer;
}

.storage-card.can-move:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.storage-card-header {
  background: rgba(64, 158, 255, 0.1);
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  color: #409eff;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 8px;
}

:deep(.el-button--text) {
  color: #409eff;
  padding: 0;
}

:deep(.el-button--text:hover) {
  color: #66b1ff;
}

:deep(.el-button--text.danger-button) {
  color: #f56c6c;
}

:deep(.el-button--text.danger-button:hover) {
  color: #f78989;
}

.storage-card-content {
  padding: 16px;
}

.storage-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}

.storage-info.empty {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.storage-info .label {
  color: rgba(255, 255, 255, 0.7);
}

.storage-info .value {
  font-weight: 500;
}

/* 自定义抽屉样式 */
:deep(.storage-drawer) {
  background: rgba(24, 29, 47, 0.95) !important;
  backdrop-filter: blur(12px);
}

:deep(.storage-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 20px;
  color: #fff;
  font-size: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.storage-drawer .el-drawer__close-btn) {
  color: #fff;
}

.test-button-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.test-button-container:hover {
  opacity: 1;
}

.test-panel-content {
  max-height: 500px;
  overflow-y: auto;
}

.test-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.test-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.test-section h3 {
  color: #409eff;
  margin-bottom: 12px;
  font-size: 14px;
}

.test-form {
  padding: 12px;
  background: rgba(64, 158, 255, 0.05);
  border-radius: 6px;
}

:deep(.test-panel-dialog) {
  background: rgba(24, 29, 47, 0.95);
  backdrop-filter: blur(12px);
}

:deep(.test-panel-dialog .el-dialog__header) {
  padding: 16px 20px;
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

:deep(.test-panel-dialog .el-dialog__title) {
  color: #409eff;
  font-size: 18px;
  font-weight: 500;
}

:deep(.test-panel-dialog .el-dialog__body) {
  padding: 24px;
  color: #fff;
}

:deep(.test-panel-dialog .el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.test-panel-dialog .el-input__inner) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(64, 158, 255, 0.3);
  color: #fff;
}

:deep(.test-panel-dialog .el-input__inner:focus) {
  border-color: #409eff;
}

:deep(.test-panel-dialog .el-select .el-input__inner) {
  background: rgba(0, 0, 0, 0.3);
}

:deep(.test-panel-dialog .el-select-dropdown) {
  background: rgba(24, 29, 47, 0.95);
  border: 1px solid rgba(64, 158, 255, 0.3);
  backdrop-filter: blur(12px);
}

:deep(.test-panel-dialog .el-select-dropdown__item) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.test-panel-dialog .el-select-dropdown__item.hover) {
  background: rgba(64, 158, 255, 0.1);
}

:deep(.test-panel-dialog .el-select-dropdown__item.selected) {
  color: #409eff;
  font-weight: bold;
}

:deep(.test-panel-dialog .el-form-item) {
  margin-bottom: 12px;
}

:deep(.test-panel-dialog .el-form-item:last-child) {
  margin-bottom: 0;
}

/* 添加新的悬浮日志面板样式 */
.floating-log-container {
  position: fixed;
  bottom: 2px;
  left: 2px;
  width: 360px;
  background: rgba(30, 42, 56, 0.95);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: all 0.3s ease;
}

.floating-log-container .log-header {
  padding: 8px 16px;
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  border-radius: 8px 8px 0 0;
}

.floating-log-container .log-title {
  color: #409eff;
  font-size: 14px;
  font-weight: 500;
}

.floating-log-container .log-actions {
  display: flex;
  gap: 4px;
}

.floating-log-container .log-content {
  height: 240px;
  overflow-y: auto;
  padding: 8px;
}

.floating-log-container .log-item {
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  gap: 8px;
  color: #fff;
}

.floating-log-container .log-time {
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.floating-log-container .log-message {
  flex: 1;
  word-break: break-all;
}

.floating-log-container .log-item.info {
  background: rgba(64, 158, 255, 0.1);
}

.floating-log-container .log-item.success {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.floating-log-container .log-item.error {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

/* 自定义日志滚动条样式 */
.floating-log-container .log-content::-webkit-scrollbar {
  width: 6px;
}

.floating-log-container .log-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.floating-log-container .log-content::-webkit-scrollbar-thumb {
  background: rgba(64, 158, 255, 0.3);
  border-radius: 3px;
  transition: all 0.3s ease;
}

.floating-log-container .log-content::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 158, 255, 0.5);
}

/* 添加空日志样式 */
.floating-log-container .empty-log {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  gap: 8px;
}

.floating-log-container .empty-log i {
  font-size: 24px;
}
</style>