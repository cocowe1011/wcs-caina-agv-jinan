<template>
  <div class="floor-image-container">
    <div class="image-wrapper">
      <img
        src="@/assets/jinan-agv/2800-2F.png"
        alt="一楼平面图"
        class="floor-image"
        @load="updateMarkerPositions"
      />
      <!-- 上货扫码区域提示 -->
      <div class="marker-with-panel" data-x="230" data-y="200">
        <div class="pulse"></div>
        <div
          class="data-panel"
          :class="['position-bottom', { 'always-show': true }]"
        >
          <div class="data-panel-header">
            <span>立库来料</span>
          </div>
          <div class="data-panel-content">
            <div class="data-panel-row">
              <span class="data-panel-label">当前扫码信息：</span>
              <span>{{ scanInfo.trayCode || '暂无' }}</span>
            </div>
            <div class="data-panel-row">
              <span class="data-panel-label">来料托盘号：</span>
              <span>{{ scanInfo.trayCode || '暂无' }}</span>
            </div>
            <div class="data-panel-row">
              <span class="data-panel-label">来料名称：</span>
              <span>{{ scanInfo.productName || '暂无' }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 添加带按钮的点位示例 -->
      <div class="marker-with-button" data-x="1820" data-y="1050">
        <div class="pulse"></div>
        <button class="marker-button" @click="handlePalletStorageClick">
          托盘缓存区操作
        </button>
      </div>
      <!-- 机械臂 -->
      <div
        v-for="arm in mechanicalArms"
        :key="arm.name"
        class="marker-with-panel-machine"
        :data-x="arm.x"
        :data-y="arm.y"
      >
        <span class="arm-label" @click.stop="toggleArmPanel(arm.name)">{{
          arm.name
        }}</span>
        <div
          class="data-panel data-panel-mechanical-arm"
          :class="[
            `position-${arm.position}`,
            { 'show-panel': visibleArmPanels.includes(arm.name) }
          ]"
        >
          <div class="data-panel-header">
            <span>机械臂{{ arm.name }}</span>
          </div>
          <div class="data-panel-content">
            <div class="data-panel-row">
              <span class="data-panel-label">托盘码：</span>
              <span>{{ arm.currentPallet || '暂无' }}</span>
            </div>
            <div class="data-panel-row">
              <span class="data-panel-label">状态：</span>
              <span :class="getStatusClass(arm.status)">
                <i
                  :class="getStatusIcon(arm.status)"
                  style="margin-right: 2px"
                ></i>
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
        <div
          v-for="(position, index) in palletStoragePositions"
          :key="index"
          class="storage-card"
          :class="{ 'can-move': position.palletCode }"
        >
          <div class="storage-card-header">
            <span>位置 {{ position.name }}</span>
            <div class="card-actions">
              <el-button
                type="text"
                size="mini"
                class="danger-button"
                @click="handleRemovePallet(position)"
              >
                <i class="el-icon-delete"></i>
                移除
              </el-button>
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
                <el-input
                  v-model="testScanForm.palletCode"
                  placeholder="请输入托盘码"
                ></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="small" @click="simulateScan"
                  >模拟扫码</el-button
                >
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
            <i
              :class="isLogExpanded ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"
            ></i>
          </el-button>
        </div>
      </div>
      <div class="log-content" ref="logContent" v-show="isLogExpanded">
        <template v-if="logs.length > 0">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="log-item"
            :class="log.type"
          >
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
import HttpUtil from '@/utils/HttpUtil';
import HttpUtilAGV from '@/utils/HttpUtilAGV';
import moment from 'moment';
export default {
  name: 'FloorFirst',
  data() {
    return {
      visibleArmPanels: [], // 当前显示的机械臂面板ID列表
      palletStorageDrawerVisible: false,
      palletStoragePositions: Array.from({ length: 10 }, (_, i) => ({
        name: `P${i + 1}`,
        palletCode: null
      })),
      mechanicalArms: [
        {
          name: 'A1',
          x: 1300,
          y: 415,
          status: 0,
          currentPallet: null,
          position: 'top-left'
        },
        {
          name: 'B1',
          x: 1380,
          y: 415,
          status: 0,
          currentPallet: null,
          position: 'top-right'
        },
        {
          name: 'C1',
          x: 1220,
          y: 558,
          status: 0,
          currentPallet: null,
          position: 'left'
        },
        {
          name: 'D1',
          x: 1285,
          y: 625,
          status: 0,
          currentPallet: null,
          position: 'bottom-left'
        },
        {
          name: 'E1',
          x: 1363,
          y: 635,
          status: 0,
          currentPallet: null,
          position: 'bottom-right'
        },
        {
          name: 'A2',
          x: 1300,
          y: 853,
          status: 0,
          currentPallet: null,
          position: 'top-left'
        },
        {
          name: 'B2',
          x: 1387,
          y: 858,
          status: 0,
          currentPallet: null,
          position: 'top-right'
        },
        {
          name: 'C2',
          x: 1226,
          y: 930,
          status: 0,
          currentPallet: null,
          position: 'left'
        },
        {
          name: 'D2',
          x: 1226,
          y: 1010,
          status: 0,
          currentPallet: null,
          position: 'bottom-left'
        },
        {
          name: 'E2',
          x: 1335,
          y: 1100,
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
      scanInfo: {
        trayCode: '',
        productName: ''
      },
      logs: [],
      isLogExpanded: true // 添加日志面板展开状态
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
    }
  },
  mounted() {
    this.initializeMarkers();
  },
  methods: {
    getStatusText(status) {
      const statusTexts = {
        0: '空闲中',
        1: '处理中'
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
      images.forEach((image) => {
        const imageWrapper = image.parentElement;
        if (!imageWrapper) return;

        const markers = imageWrapper.querySelectorAll(
          '.marker, .marker-with-panel, .marker-with-panel-machine, .marker-with-button'
        );
        const wrapperRect = imageWrapper.getBoundingClientRect();

        // 计算图片的实际显示区域
        const displayedWidth = image.width;
        const displayedHeight = image.height;
        const scaleX = displayedWidth / image.naturalWidth;
        const scaleY = displayedHeight / image.naturalHeight;

        // 计算图片在容器中的偏移量
        const imageOffsetX = (wrapperRect.width - displayedWidth) / 2;
        const imageOffsetY = (wrapperRect.height - displayedHeight) / 2;

        markers.forEach((marker) => {
          const x = parseFloat(marker.dataset.x);
          const y = parseFloat(marker.dataset.y);
          if (!isNaN(x) && !isNaN(y)) {
            marker.style.left = `${imageOffsetX + x * scaleX}px`;
            marker.style.top = `${imageOffsetY + y * scaleY}px`;
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
    handleRemovePallet(position) {
      this.$confirm('确认移除该托盘码吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          position.palletCode = null;
          this.$message.success('托盘已移除');
        })
        .catch(() => {});
    },
    showTestPanel() {
      this.testPanelVisible = true;
    },
    simulateScan() {
      if (!this.testScanForm.palletCode) {
        this.$message.warning('请填写完整的扫码信息');
        return;
      }
      // 调用接口读取托盘信息
      this.getTrayInfo(this.testScanForm.palletCode);
      // 关闭测试面板
      this.testPanelVisible = false;
    },
    getTrayInfo(trayCode) {
      const params = {
        traceid: trayCode,
        zt: 'N',
        cheijian: '2800'
      };
      HttpUtil.post('/order_info/selectList', params)
        .then((res) => {
          // this.queues[0]： 上货区
          if (res.data && res.data.length > 0) {
            // 根据托盘信息给agv小车发送指令
            this.addLog('info', `读取托盘成功：${JSON.stringify(res.data)}`);
            console.log(res.data[0]);
            this.scanInfo.trayCode = res.data[0].traceid;
            this.scanInfo.productName = res.data[0].descrC;
            // 根据托盘信息给AGV小车发送指令
          } else {
            // 没查询到货物信息，直接报警
            this.addLog(
              'error',
              `读取托盘失败：${trayCode}，请检查托盘是否存在`
            );
          }
        })
        .catch((err) => {
          this.$message.error('查询托盘失败，请重试' + err);
          // 没查询到货物信息，直接报警
          this.addLog('error', `读取托盘失败：${trayCode}，请检查托盘是否存在`);
        });
    },
    toggleArmPanel(armName) {
      const index = this.visibleArmPanels.indexOf(armName);
      if (index > -1) {
        // 已显示则隐藏
        this.visibleArmPanels.splice(index, 1);
      } else {
        // 未显示则添加到显示列表
        this.visibleArmPanels.push(armName);
      }
    },
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
    toggleLogPanel() {
      this.isLogExpanded = !this.isLogExpanded;
    }
  }
};
</script>

<style scoped lang="less">
.floor-image-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  position: relative;
  .image-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    .floor-image {
      display: block;
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    .marker-with-panel::before {
      content: '';
      position: absolute;
      width: 10px;
      height: 10px;
      background: rgba(64, 158, 255, 0.8);
      border-radius: 50%;
      animation: glow-blue 2s infinite;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    @keyframes glow-blue {
      0% {
        box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(64, 158, 255, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
      }
    }
    .marker-with-panel,
    .marker-with-panel-machine {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      /* 添加机械臂标签样式 */
      .arm-label {
        color: #ff5722;
        font-weight: bold;
        font-size: 16px;
        line-height: 1;
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
      }
      .marker-line {
        position: absolute;
        width: 100px;
        height: 2px;
        background: linear-gradient(
          90deg,
          rgba(64, 158, 255, 0.8),
          rgba(64, 158, 255, 0.2)
        );
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
        z-index: 10;
      }
      /* 显示面板 */
      .data-panel.show-panel {
        opacity: 1;
        pointer-events: auto;
      }
      /* 面板位置样式 */
      .data-panel.position-right {
        left: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
      }

      .data-panel.position-left {
        right: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
      }

      .data-panel.position-top {
        bottom: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%);
      }

      .data-panel.position-bottom {
        top: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%);
      }

      .data-panel.position-top-left {
        bottom: calc(100% + 10px);
        right: calc(100% + 10px);
        transform: none;
      }

      .data-panel.position-top-right {
        bottom: calc(100% + 10px);
        left: calc(100% + 10px);
        transform: none;
      }

      .data-panel.position-bottom-left {
        top: calc(100% + 10px);
        right: calc(100% + 10px);
        transform: none;
      }

      .data-panel.position-bottom-right {
        top: calc(100% + 10px);
        left: calc(100% + 10px);
        transform: none;
      }

      /* 始终显示的面板 */
      .data-panel.always-show {
        opacity: 1;
        pointer-events: auto;
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
      }
      .data-panel-mechanical-arm {
        background: linear-gradient(
          145deg,
          rgba(16, 42, 66, 0.95),
          rgba(8, 72, 107, 0.95)
        );
        border: 1px solid rgba(0, 231, 255, 0.2);
        box-shadow: 0 4px 20px rgba(0, 231, 255, 0.1),
          inset 0 0 0 1px rgba(0, 231, 255, 0.05);
        backdrop-filter: blur(12px);
        width: 140px;
        .data-panel-header {
          color: #00e7ff;
          border-bottom: 1px solid rgba(0, 231, 255, 0.2);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: auto;
          span {
            margin-right: 8px;
          }
        }
        .data-panel-row {
          color: #e2e8f0;
          .status-idle {
            color: #409eff;
          }

          .status-processing {
            color: #e6a23c;
          }

          .status-completed {
            color: #67c23a;
          }
        }
        .data-panel-label {
          color: rgba(0, 231, 255, 0.7);
        }
      }
    }

    /* 带按钮的点位样式 */
    .marker-with-button {
      position: absolute;
      width: 10px;
      height: 10px;
      transform: translate(-50%, -50%);
      cursor: pointer;
      z-index: 2;
      .pulse {
        background: rgba(255, 156, 0, 0.4);
      }
      .marker-button {
        position: absolute;
        left: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        background: linear-gradient(
          145deg,
          rgba(255, 156, 0, 0.9),
          rgba(255, 126, 0, 0.9)
        );
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
      .marker-button:hover {
        background: linear-gradient(
          145deg,
          rgba(255, 166, 10, 1),
          rgba(255, 136, 10, 1)
        );
        transform: translateY(-50%) scale(1.05);
        box-shadow: 0 4px 12px rgba(255, 156, 0, 0.3);
      }
      .marker-button:active {
        transform: translateY(-50%) scale(0.98);
        box-shadow: 0 2px 4px rgba(255, 156, 0, 0.2);
      }
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
    @keyframes glow {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 156, 0, 0.4);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(255, 156, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 156, 0, 0);
      }
    }
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
    .log-header {
      padding: 8px 16px;
      background: rgba(64, 158, 255, 0.1);
      border-bottom: 1px solid rgba(64, 158, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      border-radius: 8px 8px 0 0;
      .log-title {
        color: #409eff;
        font-size: 14px;
        font-weight: 500;
      }
      .log-actions {
        display: flex;
        gap: 4px;
      }
    }
    .log-content {
      height: 240px;
      overflow-y: auto;
      padding: 8px;
      .log-item {
        padding: 4px 8px;
        margin-bottom: 4px;
        border-radius: 4px;
        font-size: 12px;
        display: flex;
        gap: 8px;
        color: #fff;
        .log-time {
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
        }
        .log-message {
          flex: 1;
          word-break: break-all;
        }
      }
      .log-item.info {
        background: rgba(64, 158, 255, 0.1);
      }
      .log-item.error {
        background: rgba(245, 108, 108, 0.1);
        color: #f56c6c;
      }
    }
    .log-content::-webkit-scrollbar {
      width: 6px;
    }
    .log-content::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    .log-content::-webkit-scrollbar-thumb {
      background: rgba(64, 158, 255, 0.3);
      border-radius: 3px;
      transition: all 0.3s ease;
    }
    .log-content::-webkit-scrollbar-thumb:hover {
      background: rgba(64, 158, 255, 0.5);
    }
    .empty-log {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.3);
      font-size: 14px;
      gap: 8px;
      i {
        font-size: 24px;
      }
    }
  }
  /* 抽屉内容样式 */
  .storage-container {
    padding: 20px;
    height: 100%;
    overflow-y: auto;
    .storage-card {
      background: rgba(30, 42, 56, 0.95);
      border: 1px solid rgba(64, 158, 255, 0.3);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
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
        .card-actions {
          display: flex;
          gap: 8px;
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
        }
      }
      .storage-card-content {
        padding: 16px;
        .storage-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          .label {
            color: rgba(255, 255, 255, 0.7);
          }
          .value {
            font-weight: 500;
          }
        }

        .storage-info.empty {
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }
      }
    }
    .storage-card.can-move {
      cursor: pointer;
    }
    .storage-card.can-move:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
    }
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
</style>
