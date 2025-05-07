<template>
  <div class="content-wrapper">
    <!-- 左侧面板 -->
    <div class="side-info-panel">
      <!-- 排班计划区域 -->
      <div class="schedule-section">
        <div class="section-header">
          <span><i class="el-icon-date"></i> 今日排班计划</span>
        </div>
        <div class="schedule-content">
          <div
            class="schedule-item"
            v-for="(item, index) in scheduleData"
            :key="index"
          >
            <div class="schedule-item-header">
              <span>{{ item.name }}</span>
              <div class="schedule-actions">
                <el-input-number
                  v-model="item.plan"
                  :min="0"
                  :max="999"
                  size="mini"
                  controls-position="right"
                  @change="updateSchedulePlan(index)"
                ></el-input-number>
              </div>
            </div>
            <div class="schedule-progress">
              <div class="progress-container">
                <div class="progress-info">
                  <span>已完成：{{ item.completed }} / {{ item.plan }}</span>
                </div>
                <el-progress
                  :percentage="
                    Math.floor((item.completed / (item.plan || 1)) * 100)
                  "
                  :stroke-width="8"
                  :color="getProgressColor(item.completed, item.plan)"
                  :show-text="true"
                ></el-progress>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 日志区域 -->
      <div class="log-section">
        <div class="section-header">
          运行日志
          <div class="log-tabs">
            <div
              class="log-tab"
              :class="{ active: activeLogType === 'running' }"
              @click="activeLogType = 'running'"
            >
              运行日志
            </div>
            <div
              class="log-tab"
              :class="{ active: activeLogType === 'alarm' }"
              @click="activeLogType = 'alarm'"
            >
              报警日志
              <div v-if="unreadAlarms > 0" class="alarm-badge">
                {{ unreadAlarms }}
              </div>
            </div>
          </div>
        </div>
        <div class="scrollable-content">
          <div class="log-list">
            <template v-if="currentLogs.length > 0">
              <div
                v-for="log in currentLogs"
                :key="log.id"
                :class="[
                  'log-item',
                  { alarm: log.type === 'alarm', unread: log.unread }
                ]"
                @click="markAsRead(log)"
              >
                <div class="log-time">{{ log.timestamp }}</div>
                <div class="log-item-content">{{ log.message }}</div>
              </div>
            </template>
            <div v-else class="empty-state">
              <i class="el-icon-chat-line-square"></i>
              <p>
                {{
                  activeLogType === 'running' ? '暂无运行日志' : '暂无报警日志'
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 右侧内容区域 -->
    <div class="main-content">
      <div class="floor-container">
        <!-- 左侧区域 -->
        <div class="floor-left">
          <div class="floor-title"><i class="el-icon-monitor"></i> 生产线</div>
          <div class="floor-image-container">
            <div class="image-wrapper">
              <img
                src="@/assets/jinan-agv/2800-2F.png"
                alt="一楼平面图"
                class="floor-image"
                @load="updateMarkerPositions"
              />
              <!-- 上货扫码区域提示 -->
              <div class="marker-with-panel" data-x="260" data-y="200">
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
                      <span>{{ twoEightHundredPalletCode || '--' }}</span>
                    </div>
                    <div class="data-panel-row">
                      <span class="data-panel-label">来料托盘号：</span>
                      <span>{{ scanInfo.trayCode || '--' }}</span>
                    </div>
                    <div class="data-panel-row">
                      <span class="data-panel-label">来料名称：</span>
                      <span>{{ scanInfo.productName || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 三楼灌装线A -->
              <div class="marker-with-panel" data-x="520" data-y="840">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-left', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>三楼灌装线A</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ scanInfo.productName || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 三楼灌装线B -->
              <div class="marker-with-panel" data-x="2980" data-y="850">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-right', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>三楼灌装线B</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ scanInfo.productName || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 一楼灌装线A -->
              <div class="marker-with-panel" data-x="600" data-y="1020">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-bottom', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>一楼灌装线A</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ scanInfo.productName || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 一楼灌装线B -->
              <div class="marker-with-panel" data-x="2900" data-y="1020">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-bottom', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>一楼灌装线B</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ scanInfo.productName || '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 添加带按钮的点位示例 -->
              <div class="marker-with-button" data-x="1020" data-y="60">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('A')"
                >
                  拆垛间缓存库位(A1-A100)
                </button>
              </div>
              <div class="marker-with-button" data-x="2870" data-y="60">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('B')"
                >
                  三楼货物缓存库位(B1-B100)
                </button>
              </div>
              <div class="marker-with-button" data-x="1800" data-y="1605">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('C')"
                >
                  一楼货物缓存库位(C1-C100)
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
                <span
                  class="arm-label"
                  @click.stop="toggleArmPanel(arm.name)"
                  >{{ arm.name }}</span
                >
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
          </div>
        </div>
      </div>
    </div>

    <!-- 托盘缓存区抽屉 -->
    <el-drawer
      :title="`托盘缓存区 ${currentStorageArea}区`"
      :visible.sync="palletStorageDrawerVisible"
      direction="rtl"
      size="400px"
      :modal="false"
      custom-class="storage-drawer"
    >
      <div class="storage-container">
        <div class="area-tabs">
          <div
            v-for="area in ['A', 'B', 'C']"
            :key="area"
            class="area-tab"
            :class="{ active: currentStorageArea === area }"
            @click="switchStorageArea(area)"
          >
            {{ area }}区
          </div>
        </div>
        <div
          v-for="(position, index) in currentStoragePositions"
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
            <el-form label-width="70px" size="small">
              <el-form-item label="托盘码">
                <el-input
                  v-model="twoEightHundredPalletCode"
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
  </div>
</template>

<script>
import HttpUtil from '@/utils/HttpUtil';
import HttpUtilAGV from '@/utils/HttpUtilAGV';
import moment from 'moment';
import { ipcRenderer } from 'electron';
export default {
  name: 'FloorFirst',
  data() {
    return {
      visibleArmPanels: [], // 当前显示的机械臂面板ID列表
      palletStorageDrawerVisible: false,
      currentStorageArea: 'A', // 当前选中的缓存区
      palletStorageAreas: {
        A: Array.from({ length: 100 }, (_, i) => ({
          name: `A${i + 1}`,
          palletCode: null
        })),
        B: Array.from({ length: 100 }, (_, i) => ({
          name: `B${i + 1}`,
          palletCode: null
        })),
        C: Array.from({ length: 100 }, (_, i) => ({
          name: `C${i + 1}`,
          palletCode: null
        }))
      },
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
      scanInfo: {
        trayCode: '',
        productName: ''
      },
      activeLogType: 'running',
      runningLogs: [], // 修改为空数组
      alarmLogs: [], // 修改为空数组
      scheduleData: [
        { name: '三楼灌装线A', plan: 0, completed: 0 },
        { name: '三楼灌装线B', plan: 0, completed: 0 },
        { name: '一楼灌装线A', plan: 0, completed: 0 },
        { name: '一楼灌装线B', plan: 0, completed: 0 }
      ],
      logId: 0, // 添加日志ID计数器
      // 输送线当前运行状态
      conveyorStatus: {
        bit0: '0', // PLC系统运行中运行信号
        bit1: '0', // PLC系统故障信号
        bit2: '0', // 1#机器人故障信号
        bit3: '0', // 2#机器人故障信号
        bit4: '0', // 去三楼托盘提升机故障信号
        bit5: '0', // 去一楼托盘提升机故障信号
        bit6: '0', // 去三楼灌装车间A输送线故障信号
        bit7: '0', // 去三楼灌装车间B输送线故障信号
        bit8: '0', // 去一楼灌装车间A输送线故障信号
        bit9: '0' // 去一楼灌装车间B输送线故障信号
      },
      // 1#机器人状态
      robotStatus: {
        bit0: '0', // 值为1时，1#机器人A缺货
        bit1: '0', // 值为1时，1#机器人A需要清理空托盘
        bit2: '0', // 值为1时，1#机器人B缺货
        bit3: '0', // 值为1时，1#机器人B需要清理空托盘
        bit4: '0', // 值为1时，1#机器人C缺货
        bit5: '0', // 值为1时，1#机器人C需要清理空托盘
        bit6: '0', // 值为1时，1#机器人D缺货
        bit7: '0', // 值为1时，1#机器人D需要清理空托盘
        bit8: '0', // 值为1时，1#机器人E缺货
        bit9: '0', // 值为1时，1#机器人E需要清理空托盘
        bit10: '0', // 值为1时，去三楼灌装车间A输送线启动中
        bit11: '0' // 值为1时，去三楼灌装车间B输送线启动中
      },
      // 2#机器人状态
      robotStatus2: {
        bit0: '0', // 值为1时，2#机器人A缺货
        bit1: '0', // 值为1时，2#机器人A需要清理空托盘
        bit2: '0', // 值为1时，2#机器人B缺货
        bit3: '0', // 值为1时，2#机器人B需要清理空托盘
        bit4: '0', // 值为1时，2#机器人C缺货
        bit5: '0', // 值为1时，2#机器人C需要清理空托盘
        bit6: '0', // 值为1时，2#机器人D缺货
        bit7: '0', // 值为1时，2#机器人D需要清理空托盘
        bit8: '0', // 值为1时，2#机器人E缺货
        bit9: '0', // 值为1时，2#机器人E需要清理空托盘
        bit10: '0', // 值为1时，去一楼灌装车间A输送线启动中
        bit11: '0' // 值为1时，去一楼灌装车间B输送线启动中
      },
      // AGV调度条件
      agvScheduleCondition: {
        bit0: '0', // 2800转盘处允许接货（同时允许上位机读取扫码结果）
        bit1: '0', // 2500接驳口允许接货（同时允许上位机读取扫码结果）
        bit2: '0', // AGV2-2空闲允许放货
        bit3: '0', // AGV2-3空闲允许放货
        bit4: '0', // AGV3-1有货需AGV接走（三楼提升机出口）
        bit5: '0' // AGV1-1有货需AGV接走（一楼提升机出口）
      },
      // 2800接货处条码
      twoEightHundredPalletCode: '',
      // 2500接货处条码
      twoFiveHundredPalletCode: ''
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
    currentStoragePositions() {
      return this.palletStorageAreas[this.currentStorageArea] || [];
    },
    currentLogs() {
      return this.activeLogType === 'running'
        ? this.runningLogs
        : this.alarmLogs;
    },
    unreadAlarms() {
      return this.alarmLogs.filter((log) => log.unread).length;
    }
  },
  mounted() {
    this.initializeMarkers();
    // ipcRenderer.on('receivedMsg', (event, values, values2) => {
    //   // 使用位运算优化赋值
    //   const getBit = (word, bitIndex) => ((word >> bitIndex) & 1).toString();

    //   // 输送线当前运行状态
    //   let word2 = this.convertToWord(values.DBW2);
    //   this.conveyorStatus.bit0 = getBit(word2, 8);
    //   this.conveyorStatus.bit1 = getBit(word2, 9);
    //   this.conveyorStatus.bit2 = getBit(word2, 10);
    //   this.conveyorStatus.bit3 = getBit(word2, 11);
    //   this.conveyorStatus.bit4 = getBit(word2, 12);
    //   this.conveyorStatus.bit5 = getBit(word2, 13);
    //   this.conveyorStatus.bit6 = getBit(word2, 14);
    //   this.conveyorStatus.bit7 = getBit(word2, 15);
    //   this.conveyorStatus.bit8 = getBit(word2, 0);
    //   this.conveyorStatus.bit9 = getBit(word2, 1);

    //   // 1#机器人状态
    //   let word4 = this.convertToWord(values.DBW4);
    //   this.robotStatus.bit0 = getBit(word4, 8);
    //   this.robotStatus.bit1 = getBit(word4, 9);
    //   this.robotStatus.bit2 = getBit(word4, 10);
    //   this.robotStatus.bit3 = getBit(word4, 11);
    //   this.robotStatus.bit4 = getBit(word4, 12);
    //   this.robotStatus.bit5 = getBit(word4, 13);
    //   this.robotStatus.bit6 = getBit(word4, 14);
    //   this.robotStatus.bit7 = getBit(word4, 15);
    //   this.robotStatus.bit8 = getBit(word4, 0);
    //   this.robotStatus.bit9 = getBit(word4, 1);
    //   this.robotStatus.bit10 = getBit(word4, 2);
    //   this.robotStatus.bit11 = getBit(word4, 3);

    //   // 2#机器人状态
    //   let word6 = this.convertToWord(values.DBW6);
    //   this.robotStatus2.bit0 = getBit(word6, 8);
    //   this.robotStatus2.bit1 = getBit(word6, 9);
    //   this.robotStatus2.bit2 = getBit(word6, 10);
    //   this.robotStatus2.bit3 = getBit(word6, 11);
    //   this.robotStatus2.bit4 = getBit(word6, 12);
    //   this.robotStatus2.bit5 = getBit(word6, 13);
    //   this.robotStatus2.bit6 = getBit(word6, 14);
    //   this.robotStatus2.bit7 = getBit(word6, 15);
    //   this.robotStatus2.bit8 = getBit(word6, 0);
    //   this.robotStatus2.bit9 = getBit(word6, 1);
    //   this.robotStatus2.bit10 = getBit(word6, 2);
    //   this.robotStatus2.bit11 = getBit(word6, 3);

    //   // AGV调度条件
    //   let word8 = this.convertToWord(values.DBW8);
    //   this.agvScheduleCondition.bit0 = getBit(word8, 8);
    //   this.agvScheduleCondition.bit1 = getBit(word8, 9);
    //   this.agvScheduleCondition.bit2 = getBit(word8, 10);
    //   this.agvScheduleCondition.bit3 = getBit(word8, 11);
    //   this.agvScheduleCondition.bit4 = getBit(word8, 12);
    //   this.agvScheduleCondition.bit5 = getBit(word8, 13);

    //   // 2800接货处条码
    //   this.twoEightHundredPalletCode = values.DBB10 ?? '';
    //   // 2500接货处条码
    //   this.twoFiveHundredPalletCode = values.DBB20 ?? '';
    // });
  },
  watch: {
    // 2800接货处条码
    twoEightHundredPalletCode: {
      async handler(newVal) {
        if (newVal !== '' && this.agvScheduleCondition.bit0 === '1') {
          this.addLog(`2800接货处扫码数据：${newVal}`);
          this.getTrayInfo(this.twoEightHundredPalletCode);
        }
      }
    }
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
    handlePalletStorageClick(area) {
      this.currentStorageArea = area;
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
      if (!this.twoEightHundredPalletCode) {
        this.$message.warning('请填写完整的扫码信息');
        return;
      }
      // 调用接口读取托盘信息
      this.getTrayInfo(this.twoEightHundredPalletCode);
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
            this.addLog(`读取托盘成功：${JSON.stringify(res.data)}`);
            this.scanInfo.trayCode = res.data[0].traceid;
            this.scanInfo.productName = res.data[0].descrC;
            // 根据托盘信息给AGV小车发送指令
          } else {
            // 没查询到货物信息，直接报警
            this.addLog(`读取托盘失败：${trayCode}，请检查托盘是否存在`);
          }
        })
        .catch((err) => {
          this.$message.error('查询托盘失败，请重试' + err);
          // 没查询到货物信息，直接报警
          this.addLog(`读取托盘失败：${trayCode}，请检查托盘是否存在`);
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
    switchStorageArea(area) {
      this.currentStorageArea = area;
    },
    // 添加新的日志方法
    addLog(message, type = 'running') {
      const log = {
        id: this.logId++,
        type,
        message,
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        unread: type === 'alarm'
      };

      if (type === 'running') {
        this.runningLogs.unshift(log);
        // 保持日志数量在合理范围内
        if (this.runningLogs.length > 100) {
          this.runningLogs.pop();
        }
      } else {
        this.alarmLogs.unshift(log);
        if (this.alarmLogs.length > 100) {
          this.alarmLogs.pop();
        }
      }
    },
    updateSchedulePlan(index) {
      // 更新排班计划
      this.addLog(
        `已更新${this.scheduleData[index].name}的计划数量为${this.scheduleData[index].plan}`
      );
      // 这里可以添加将计划保存到后端的逻辑
    },
    getProgressColor(completed, plan) {
      // 根据完成度计算进度条颜色
      const percentage = plan === 0 ? 0 : (completed / plan) * 100;
      if (percentage < 30) return '#909399'; // 灰色
      if (percentage < 70) return '#e6a23c'; // 黄色
      return '#67c23a'; // 绿色
    },
    convertToWord(value) {
      if (value < 0) {
        return (value & 0xffff) >>> 0; // 负数转换为无符号的16位整数
      } else {
        return value; // 非负数保持不变
      }
    }
  }
};
</script>

<style scoped lang="less">
.content-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  .side-info-panel {
    width: 330px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 0px 7px 7px 7px;
    box-sizing: border-box;
    flex-shrink: 0;
    overflow: hidden;
    .schedule-section {
      background: #07293e;
      padding: 10px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
      height: 338px;
      display: flex;
      flex-direction: column;

      :deep(.el-input-number) {
        width: 100px;
      }

      :deep(.el-input-number .el-input__inner) {
        background: rgba(10, 197, 168, 0.1);
        border: 1px solid rgba(10, 197, 168, 0.3);
        color: #fff;
      }

      :deep(.el-progress-bar__outer) {
        background-color: rgba(255, 255, 255, 0.2) !important;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0px 0px 8px 0px;
        color: #0ac5a8;
        font-size: 22px;
        font-weight: 900;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .schedule-content {
        flex: 1;
        padding: 5px 0 5px 0;
        .schedule-item {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 6px;
          width: 100%;
          box-sizing: border-box;
          .schedule-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
          }
          .schedule-progress {
            margin-top: 6px;
            .progress-container {
              display: flex;
              align-items: center;
            }
            .progress-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-right: 10px;
              color: rgba(255, 255, 255, 0.6);
              font-size: 12px;
              min-width: 105px;
            }
            :deep(.el-progress) {
              flex: 1;
            }
            :deep(.el-progress__text) {
              color: rgba(255, 255, 255, 0.6);
              font-size: 12px !important;
            }
          }
        }
      }
      .schedule-content::-webkit-scrollbar {
        width: 4px;
      }

      .schedule-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .schedule-content::-webkit-scrollbar-thumb {
        background: rgba(10, 197, 168, 0.2);
        border-radius: 2px;
      }

      .schedule-content::-webkit-scrollbar-thumb:hover {
        background: rgba(10, 197, 168, 0.4);
      }
    }

    /* 日志区域 */
    .log-section {
      background: #07293e;
      padding: 10px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
      height: 257px;
      display: flex;
      flex-direction: column;
      flex: 1;
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0px 0px 8px 0px;
        color: #0ac5a8;
        font-size: 22px;
        font-weight: 900;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        .log-tabs {
          display: flex;
          gap: 5px;
        }
        .log-tab {
          position: relative;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 5px 15px;
          border-radius: 4px;
          transition: all 0.3s ease;
          .alarm-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #f56c6c;
            color: #fff;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        .log-tab.active {
          color: #fff;
          background: rgba(10, 197, 168, 0.2);
        }
        .log-tab:hover:not(.active) {
          color: #0ac5a8;
        }
      }
      .scrollable-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px 0;
        .log-list {
          padding: 0 10px;
          width: 100%;
          box-sizing: border-box;
          .log-item {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
            cursor: pointer;
            width: 100%;
            box-sizing: border-box;
            .log-time {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.4);
              margin-bottom: 6px;
            }
            .log-item-content {
              color: rgba(255, 255, 255, 0.9);
              font-size: 13px;
              line-height: 1.6;
              overflow-wrap: break-word;
              word-wrap: break-word;
              word-break: normal;
              hyphens: auto;
              display: block;
              width: 100%;
              padding-right: 10px;
            }
          }
          .log-item:hover {
            background: rgba(255, 255, 255, 0.05);
          }

          .log-item.alarm {
            background: rgba(245, 108, 108, 0.05);
          }

          .log-item.alarm.unread {
            background: rgba(245, 108, 108, 0.1);
            border-left: 2px solid #f56c6c;
          }
          /* 添加空状态样式 */
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
            color: rgba(255, 255, 255, 0.6);
            i {
              font-size: 48px;
              margin-bottom: 16px;
              color: rgba(255, 255, 255, 0.3);
            }
            p {
              font-size: 14px;
              margin: 0 0 16px 0;
            }
            .el-button {
              color: #0ac5a8;
              font-size: 14px;
              i {
                font-size: 14px;
                margin-right: 4px;
                color: inherit;
              }
            }
            .el-button:hover {
              color: #0db196;
            }
          }
        }
      }
      .scrollable-content::-webkit-scrollbar {
        width: 4px;
      }

      .scrollable-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .scrollable-content::-webkit-scrollbar-thumb {
        background: rgba(10, 197, 168, 0.2);
        border-radius: 2px;
      }

      .scrollable-content::-webkit-scrollbar-thumb:hover {
        background: rgba(10, 197, 168, 0.4);
      }
    }
  }
  .main-content {
    flex: 1;
    display: flex;
    padding: 0px 7px 7px 0px;
    box-sizing: border-box;
    overflow: hidden;
    height: 100%;
    .floor-container {
      display: flex;
      gap: 10px;
      height: 100%;
      width: 100%;
      min-height: 0;

      .floor-left {
        flex: 1;
        background: #07293e;
        padding: 10px;
        border-radius: 15px;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
        color: #f5f5f5;
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
        overflow: hidden;
        box-sizing: border-box;
        .floor-title {
          font-size: 22px;
          color: #0ac5a8;
          font-weight: 900;
          padding-bottom: 10px;
          flex-shrink: 0;
        }
        .floor-image-container {
          flex: 1;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-height: 0;
          height: calc(100% - 50px);
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
                width: 160px;
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
        }
      }
    }
  }
  /* 抽屉内容样式 */
  .storage-container {
    padding: 20px;
    height: 100%;
    overflow-y: auto;

    .area-tabs {
      display: flex;
      margin-bottom: 20px;
      background: rgba(30, 42, 56, 0.5);
      border-radius: 8px;
      overflow: hidden;

      .area-tab {
        flex: 1;
        text-align: center;
        padding: 12px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;

        &:hover {
          background: rgba(64, 158, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        &.active {
          background: rgba(64, 158, 255, 0.2);
          color: #409eff;
          box-shadow: inset 0 -2px 0 #409eff;
        }
      }
    }

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
  top: 123px;
  left: 8px;
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
