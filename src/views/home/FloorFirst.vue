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

      <!-- AGV调度区域 -->
      <div class="agv-schedule-section">
        <div class="section-header">
          <span>AGV调度</span>
        </div>
        <div class="agv-schedule-content">
          <div class="agv-route-selector">
            <div class="route-row">
              <div class="route-item">
                <div class="route-label">起点：</div>
                <el-autocomplete
                  v-model="agvSchedule.startPosition"
                  :fetch-suggestions="querySearchStartAsync"
                  placeholder="选择或输入起点"
                  @select="handleStartSelect"
                  class="agv-input"
                  size="mini"
                ></el-autocomplete>
              </div>
              <div class="route-item">
                <div class="route-label">终点：</div>
                <el-autocomplete
                  v-model="agvSchedule.endPosition"
                  :fetch-suggestions="querySearchEndAsync"
                  placeholder="选择或输入终点"
                  @select="handleEndSelect"
                  class="agv-input"
                  size="mini"
                ></el-autocomplete>
              </div>
            </div>
          </div>
          <div class="agv-controls">
            <el-button
              type="primary"
              size="mini"
              class="agv-btn"
              icon="el-icon-position"
              @click="handleSingleModeChange()"
            >
              单次执行
            </el-button>
            <el-button
              type="danger"
              size="mini"
              class="agv-btn"
              icon="el-icon-close"
              v-if="agvSchedule.status === 'cycleRunning'"
              @click="handleAgvModeChange(false)"
            >
              停止循环执行
            </el-button>
            <el-button
              type="primary"
              size="mini"
              class="agv-btn"
              icon="el-icon-refresh"
              v-else
              @click="handleAgvModeChange(true)"
            >
              循环执行
            </el-button>
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
                      <span class="data-panel-label">来料名称：</span>
                      <span>{{ scanInfo.descrC || '--' }}</span>
                    </div>
                    <div class="data-panel-row">
                      <span class="data-panel-label">目的地：</span>
                      <span>{{ scanInfo.mudidi || '--' }}</span>
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
                      <span>{{ '--' }}</span>
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
                      <span>{{ '--' }}</span>
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
                      <span>{{ '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 一楼灌装线B -->
              <div class="marker-with-panel" data-x="2980" data-y="1030">
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
                      <span>{{ '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 添加带按钮的点位示例 -->
              <div class="marker-with-button" data-x="1020" data-y="60">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="
                    handlePalletStorageClick('A', '拆垛间缓存库位(A1-A100)')
                  "
                >
                  拆垛间缓存库位(A1-A100)
                </button>
              </div>
              <div class="marker-with-button" data-x="2870" data-y="60">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="
                    handlePalletStorageClick('B', '三楼货物缓存库位(B1-B100)')
                  "
                >
                  三楼货物缓存库位(B1-B100)
                </button>
              </div>
              <div class="marker-with-button" data-x="1800" data-y="1605">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="
                    handlePalletStorageClick('C', '一楼货物缓存库位(C1-C100)')
                  "
                >
                  一楼货物缓存库位(C1-C100)
                </button>
              </div>
              <div class="marker-with-button" data-x="2410" data-y="1010">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('AGV2-2', 'AGV2-2队列')"
                >
                  AGV2-2队列
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
      :visible.sync="palletStorageDrawerVisible"
      direction="rtl"
      size="400px"
      :modal="false"
      custom-class="storage-drawer"
    >
      <template #title>
        <div class="drawer-title-container">
          <span>{{ currentStorageTitle }}</span>
          <el-button
            type="primary"
            size="mini"
            icon="el-icon-refresh"
            @click="loadPalletStorageByArea(currentStorageArea)"
            :loading="isRefreshing"
            class="title-refresh-button"
          >
            刷新
          </el-button>
        </div>
      </template>
      <div class="storage-container">
        <!-- 原刷新按钮容器 .area-tabs 将被移除 -->
        <div
          v-for="(item, index) in currentStoragePositions"
          :key="index"
          class="storage-card"
          :class="{ 'can-move': item.trayInfo }"
        >
          <div class="storage-card-header">
            <span v-if="currentStorageTitle !== 'AGV2-2队列'"
              >位置 {{ item.queueName + item.queueNum
              }}<el-tag
                v-if="item.trayStatus === '0'"
                size="small"
                style="margin-left: 15px"
                >在2800等待AGV取货</el-tag
              ><el-tag
                v-if="item.trayStatus === '1'"
                type="warning"
                size="small"
                style="margin-left: 15px"
                >已在2800取货，正往缓存区运送</el-tag
              ><el-tag
                v-if="item.trayStatus === '2'"
                size="small"
                type="success"
                style="margin-left: 15px"
                >已送至2楼缓存区</el-tag
              ><el-tag
                v-if="item.trayStatus === '3'"
                size="small"
                style="margin-left: 15px"
                >在缓存区等待AGV取货</el-tag
              ><el-tag
                v-if="item.trayStatus === '4' || item.trayStatus === '5'"
                size="small"
                type="warning"
                style="margin-left: 15px"
                >已在缓存区取货，正往运往目的地</el-tag
              ></span
            >
            <span v-else>队列序号：{{ index + 1 }}</span>
            <div
              class="card-actions"
              v-if="currentStorageTitle !== 'AGV2-2队列' && item.trayInfo"
            >
              <el-button
                type="text"
                size="mini"
                class="danger-button"
                @click="handleRemovePallet(item)"
              >
                <i class="el-icon-delete"></i>
                移除
              </el-button>
            </div>
          </div>
          <div class="storage-card-content">
            <template v-if="item.trayInfo">
              <div class="storage-info-container">
                <div class="storage-info">
                  <div class="storage-info-row">
                    <span class="label">托盘码：</span>
                    <span class="value">{{ item.trayInfo }}</span>
                  </div>
                  <div class="storage-info-row product-desc">
                    <span class="label">产品描述：</span>
                    <span class="value">{{
                      item.trayInfoAdd || '暂无描述'
                    }}</span>
                  </div>
                </div>

                <!-- 状态为2时显示发送图标 -->
                <div
                  v-if="
                    item.trayStatus === '2' &&
                    currentStorageTitle !== 'AGV2-2队列'
                  "
                  class="send-action-icon"
                >
                  <el-button
                    type="text"
                    @click="item.showSendPanel = true"
                    v-if="!item.showSendPanel"
                  >
                    <i
                      class="el-icon-position"
                      style="font-size: 18px; color: #409eff"
                    ></i>
                  </el-button>
                </div>

                <!-- 状态为2且点击了发送图标时显示发送面板 -->
                <div
                  class="send-actions"
                  v-if="
                    item.trayStatus === '2' &&
                    item.showSendPanel &&
                    currentStorageTitle !== 'AGV2-2队列'
                  "
                >
                  <el-autocomplete
                    v-model="item.targetPosition"
                    :fetch-suggestions="querySearchEndAsync"
                    placeholder="发送至"
                    size="mini"
                    class="target-input"
                  ></el-autocomplete>
                  <div class="action-buttons">
                    <el-button
                      type="primary"
                      size="mini"
                      @click="handleExecutePallet(item)"
                    >
                      <i class="el-icon-position"></i>
                      发送
                    </el-button>
                    <el-button
                      size="mini"
                      style="margin-left: 0px"
                      @click="item.showSendPanel = false"
                    >
                      取消
                    </el-button>
                  </div>
                </div>

                <!-- 状态为3、4、5时显示发送状态 -->
                <div
                  class="sending-status"
                  v-if="
                    ['3', '4', '5'].includes(item.trayStatus) &&
                    currentStorageTitle !== 'AGV2-2队列'
                  "
                >
                  <div class="status-text">
                    <i class="el-icon-loading"></i>
                    <span>正在发送中</span>
                  </div>
                  <div class="destination">
                    <span class="label">目的地：</span>
                    <span class="value">{{
                      item.targetPosition || '未知'
                    }}</span>
                  </div>
                </div>
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
          <div class="test-form">
            <el-form label-width="70px" size="small">
              <el-form-item label="托盘码">
                <el-input
                  v-model="twoEightHundredPalletTestCode"
                  placeholder="请输入托盘码"
                ></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="small" @click="testDatabase"
                  >数据库接口测试</el-button
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
      pollingTimerCtoAGV22: null, // 定时器ID，用于C区到AGV2-2的托盘移动轮询
      currentStorageTitle: '', // 新增：用于抽屉标题
      visibleArmPanels: [], // 当前显示的机械臂面板ID列表
      palletStorageDrawerVisible: false,
      currentStorageArea: 'A', // 当前选中的缓存区
      palletStorageAreas: {
        A: [],
        B: [],
        C: []
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
        descrC: '',
        mudidi: ''
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
      twoFiveHundredPalletCode: '',
      isRefreshing: false,
      agvSchedule: {
        startPosition: '',
        endPosition: '',
        status: 'idle' // idle没任务 singleRunning单次任务执行中 cycleRunning多次任务执行中
      },
      // 新增起点点位列表
      startAgvPositions: [
        { value: 'AGV2-1' },
        { value: 'AGV1-1' },
        { value: 'AGV3-1' }
      ],
      // 新增终点点位列表
      endAgvPositions: [{ value: 'AGV2-2' }, { value: 'AGV2-3' }],
      // 定义一个map，可以通过type获取到code
      agvCodeMap: {
        'AGV2-1': '102',
        'AGV2-2': '201',
        'AGV2-3': '301',
        '2500输送线': '101',
        'AGV1-1': '202',
        'AGV3-1': '302'
      },
      twoEightHundredPalletTestCode: ''
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
    this.startPalletMovePolling(); // 启动C区到AGV2-2托盘移动的轮询
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
          // 自动触发AGV运输任务，从2800到C区缓存位
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
      this.stopPalletMovePolling(); // 组件销毁前停止轮询
    },
    handlePalletStorageClick(area, title) {
      this.currentStorageArea = area;
      this.currentStorageTitle = title; // 设置抽屉标题
      // 打开抽屉前重新查询数据
      this.loadPalletStorageByArea(area);
      this.palletStorageDrawerVisible = true;
    },
    // 加载指定区域的托盘存储数据
    loadPalletStorageByArea(area) {
      this.$set(this.palletStorageAreas, area, []); // 清空当前区域数据，显示加载状态
      this.isRefreshing = true;

      const params = {
        queueName: area
      };

      HttpUtil.post('/queue_info/queryQueueList', params)
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            // 为每个托盘项添加showSendPanel属性
            const dataWithSendPanel = res.data.map((item) => {
              return {
                ...item,
                showSendPanel: false
              };
            });
            // 如果API返回的数据已经是格式化好的，直接使用
            this.$set(this.palletStorageAreas, area, dataWithSendPanel);
          } else {
            // 如果API返回的数据需要格式化，进行处理
            this.$message.warning(`获取${area}区托盘数据格式不正确`);
          }
        })
        .catch((err) => {
          console.error(`获取${area}区托盘数据失败:`, err);
          this.$message.error(`获取${area}区托盘数据失败`);
        })
        .finally(() => {
          this.isRefreshing = false;
        });
    },
    handleRemovePallet(position) {
      this.$confirm('确认移除该托盘码吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          // 调用API更新数据库中的托盘信息
          HttpUtil.post('/pallet_storage/removePallet', {
            area: this.currentStorageArea,
            position: position.name,
            palletCode: position.palletCode
          })
            .then(() => {
              // API调用成功后更新本地数据
              position.palletCode = null;
              this.$message.success('托盘已移除');
              this.addLog(
                `已从${this.currentStorageArea}区${position.name}移除托盘`
              );
            })
            .catch((err) => {
              console.error('移除托盘失败:', err);
              this.$message.error('移除托盘失败，请重试');
            });
        })
        .catch(() => {});
    },
    showTestPanel() {
      this.testPanelVisible = true;
    },
    testDatabase() {
      if (!this.twoEightHundredPalletTestCode) {
        this.$message.warning('请填写完整的测试托盘码');
        return;
      }
      // 调用接口读取托盘信息
      this.getTrayInfo(this.twoEightHundredPalletTestCode);
      // 关闭测试面板
      this.testPanelVisible = false;
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
        traceid: trayCode.trim(),
        zt: 'N',
        cheijian: '2800'
      };
      HttpUtil.post('/order_info/selectList', params)
        .then((res) => {
          // this.queues[0]： 上货区
          if (res.data && res.data.length > 0) {
            // 根据托盘信息给agv小车发送指令
            this.addLog(`读取托盘成功：${JSON.stringify(res.data)}`);
            this.scanInfo.mudidi = res.data[0].mudidi;
            this.scanInfo.descrC = res.data[0].descrC;
            // 处理扫码后托盘逻辑
            this.dealScanCode(trayCode, res.data[0].descrC);
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
    dealScanCode(trayCode, descrC) {
      // 判断目的地-先不判断，先直接写死进入C队列
      // 查询C队列托盘情况，查找第一个空闲的托盘位置
      const params = {
        queueName: 'C'
      };
      HttpUtil.post('/queue_info/queryQueueList', params)
        .then(async (res) => {
          if (res.data && res.data.length > 0) {
            // 查找第一个空闲的托盘位置，目前只检索queueNum在6-20的托盘
            const emptyPosition = res.data.find(
              (item) =>
                (item.trayInfo === null || item.trayInfo === '') &&
                item.queueNum >= 6 &&
                item.queueNum <= 20
            );
            if (emptyPosition) {
              // 说明有空缓存位置
              // 根据托盘信息给AGV小车发送指令
              const robotTaskCode = await this.sendAgvCommand(
                'PF-FMR-COMMON-JH1',
                '102',
                emptyPosition.queueName + emptyPosition.queueNum
              );
              if (robotTaskCode !== '') {
                // 更新托盘信息
                const param = {
                  id: emptyPosition.id,
                  trayInfo: trayCode,
                  trayStatus: '0',
                  robotTaskCode,
                  trayInfoAdd: descrC
                };
                HttpUtil.post('/queue_info/update', param)
                  .then(() => {
                    this.$message.success('托盘已入库');
                    this.addLog(
                      `托盘已入库：${trayCode}, 缓存区位置：${emptyPosition.queueName}${emptyPosition.queueNum}`
                    );
                  })
                  .catch((err) => {
                    this.$message.error('托盘入库失败，请重试');
                    this.addLog(`托盘入库失败：${trayCode},${err}`);
                  });
              }
            } else {
              this.$message.error('缓存区没有空闲位置');
              this.addLog(`${trayCode} 托盘入库失败，缓存区没有空闲位置`);
            }
          }
        })
        .catch((err) => {
          console.error('查询C队列托盘情况失败:', err);
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
      // 切换区域时重新加载数据
      this.loadPalletStorageByArea(area);
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
    },
    handleAgvModeChange(val) {
      if (!this.agvSchedule.startPosition || !this.agvSchedule.endPosition) {
        this.$message.warning('请先选择起点和终点');
        return;
      }
      // 判断起点和终点是否相同
      if (this.agvSchedule.startPosition === this.agvSchedule.endPosition) {
        this.$message.warning('起点和终点不能相同');
        return;
      }

      // 判断是否在单次执行
      if (this.agvSchedule.status === 'singleRunning') {
        this.$message.warning('当前正在单次执行，请先等待单次执行完成');
        return;
      }
    },

    handleSingleModeChange() {
      if (!this.agvSchedule.startPosition || !this.agvSchedule.endPosition) {
        this.$message.warning('请先选择起点和终点');
        return;
      }
      // 判断起点和终点是否相同
      if (this.agvSchedule.startPosition === this.agvSchedule.endPosition) {
        this.$message.warning('起点和终点不能相同');
        return;
      }
      // 判断当前是否在循环执行
      if (this.agvSchedule.status === 'cycleRunning') {
        this.$message.warning('当前正在循环执行，请先停止循环执行');
        return;
      }
      // PF-FMR-COMMON-JH	转盘-输送线，起点终点都与plc进行安全交互
      // PF-FMR-COMMON-JH1 转盘-缓存区，只有起点与plc进行安全交互
      // PF-FMR-COMMON-JH2 缓存区-输送线，只有终点与plc进行安全交互
      // 判断起点类型
      let taskType = '';
      let fromSiteCode = '';
      let toSiteCode = '';

      if (this.agvSchedule.startPosition === 'AGV2-1') {
        // 说明起点是转盘
        fromSiteCode = this.agvCodeMap[this.agvSchedule.startPosition];

        if (this.agvSchedule.endPosition.includes('AGV')) {
          // 转盘-输送线，起点终点都与plc进行安全交互
          taskType = 'PF-FMR-COMMON-JH';
          toSiteCode = this.agvCodeMap[this.agvSchedule.endPosition];
        } else {
          // 转盘-缓存区，只有起点与plc进行安全交互
          taskType = 'PF-FMR-COMMON-JH1';
          toSiteCode = this.agvSchedule.endPosition;
        }
      } else {
        // 说明起点是缓存区
        fromSiteCode = this.agvSchedule.startPosition;

        if (this.agvSchedule.endPosition.includes('AGV')) {
          // 缓存区-输送线，只有终点与plc进行安全交互
          taskType = 'PF-FMR-COMMON-JH2';
          toSiteCode = this.agvCodeMap[this.agvSchedule.endPosition];
        } else {
          // 缓存区-缓存区，不需要与plc交互，报错，没有这种任务类型
          taskType = 'ERROR';
        }
      }
      if (taskType === 'ERROR') {
        this.$message.warning(
          `指令为缓存区到缓存区，没有这种任务类型，请检查！`
        );
      }
      this.agvSchedule.status = 'singleRunning';
      // 调用发送AGV指令方法
      this.sendAgvCommand(taskType, fromSiteCode, toSiteCode);
    },
    stopAgvSchedule() {
      if (this.agvSchedule.status === 'cycleRunning') {
        this.agvSchedule.status = 'idle';
        this.addLog('AGV调度已停止(循环)');
      }
    },
    async sendAgvCommand(taskType, fromSiteCode, toSiteCode) {
      // 测试用，返回当前时间戳
      // return Date.now().toString();
      // 组装入参
      const params = {
        taskType: taskType,
        targetRoute: [
          {
            type: 'SITE',
            code: fromSiteCode
          },
          {
            type: 'SITE',
            code: toSiteCode
          }
        ]
      };
      this.addLog(
        `发送AGV指令: 类型=${taskType}, 起点=${fromSiteCode}, 终点=${toSiteCode}`
      );
      try {
        // 发送AGV指令
        const res = await HttpUtilAGV.post(
          '/rcs/rtas/api/robot/controller/task/submit',
          params
        );
        if (res.code === 'SUCCESS') {
          this.addLog(`AGV指令发送成功: ${JSON.stringify(res.data)}`);
          // 成功时返回robotTaskCode
          return res.data.robotTaskCode;
        } else {
          // 处理各种错误类型
          let errorMsg = '';
          switch (res.errorCode) {
            case 'Err_TaskTypeNotSupport':
              errorMsg = '任务类型不支持';
              break;
            case 'Err_RobotGroupsNotMatch':
              errorMsg = '机器人资源组编号与任务不匹配，无法调度';
              break;
            case 'Err_RobotCodeNotMatch':
              errorMsg = '机器人编号与任务不匹配，无法调度';
              break;
            case 'Err_TargetRouteError':
              errorMsg = '任务路径参数有误';
              break;
            default:
              errorMsg = res.message || '未知错误';
          }
          this.addLog(`AGV指令发送失败: ${errorMsg}`);
          return '';
        }
      } catch (err) {
        console.error('发送AGV指令失败:', err);
        this.addLog(`AGV指令发送失败: ${err.message || '未知错误'}`);
        return '';
      }
    },
    startPalletMovePolling() {
      if (this.pollingTimerCtoAGV22) {
        clearInterval(this.pollingTimerCtoAGV22);
      }
      // 每3秒轮询一次，并立即执行一次
      this.pollForPalletsToMove();
      this.pollingTimerCtoAGV22 = setInterval(this.pollForPalletsToMove, 3000);
      this.addLog('[轮询] C区到AGV2-2队列的托盘移动轮询已启动。');
    },

    stopPalletMovePolling() {
      if (this.pollingTimerCtoAGV22) {
        clearInterval(this.pollingTimerCtoAGV22);
        this.pollingTimerCtoAGV22 = null;
        this.addLog('[轮询] C区到AGV2-2队列的托盘移动轮询已停止。');
      }
    },
    // 轮询C区有没有能够移到AGV2-2队列的托盘
    pollForPalletsToMove() {
      HttpUtil.post('/queue_info/queryQueueList', {
        queueName: 'C',
        trayStatus: '5'
      }).then((res) => {
        if (res && res.data.length > 0) {
          this.insertPalletToAGV22(res.data);
        }
      });
    },
    // 将托盘插入AGV2-2队列
    insertPalletToAGV22(pallets) {
      // pallets按照元素updateTime正序排序，pallets长度是大于等于一的
      pallets.sort((a, b) => a.updateTime - b.updateTime);
      // 取第一个元素
      const firstPallet = pallets[0];
      // 调用入库接口
      HttpUtil.post('/queue_info/updateAgv22', firstPallet)
        .then((res) => {
          if (res.data == 1) {
            // 给PLC写条码数据
            ipcRenderer.send(
              'writeValuesToPLC',
              'DBB120',
              firstPallet.trayInfo
            );
            this.addLog(
              `收到AGV放货消息，托盘${firstPallet.trayInfo}已进入AGV2-2队列，已给PLC发送条码数据。`
            );
          } else {
            this.addLog(
              `托盘${firstPallet.trayInfo}进入AGV2-2队列失败，请检查。`
            );
          }
        })
        .catch((err) => {
          this.addLog(
            `托盘${firstPallet.trayInfo}进入AGV2-2队列失败，请检查。${err}`
          );
        });
    },
    handleStartSelect(item) {
      this.agvSchedule.startPosition = item.value;
    },
    handleEndSelect(item) {
      this.agvSchedule.endPosition = item.value;
    },
    querySearchStartAsync(queryString, cb) {
      const results = queryString
        ? this.startAgvPositions.filter(this.createFilter(queryString))
        : this.startAgvPositions;
      // el-autocomplete 需要一个 value 字段用于显示
      cb(results);
    },
    querySearchEndAsync(queryString, cb) {
      const results = queryString
        ? this.endAgvPositions.filter(this.createFilter(queryString))
        : this.endAgvPositions;
      // el-autocomplete 需要一个 value 字段用于显示
      cb(results);
    },
    createFilter(queryString) {
      return (item) => {
        return item.value.toLowerCase().indexOf(queryString.toLowerCase()) > 0;
      };
    },
    handleExecutePallet(item) {
      if (!item.targetPosition) {
        this.$message.warning('请选择目的地');
        return;
      }

      // 发送托盘至选定目的地的逻辑
      this.$confirm(
        `确认将托盘 ${item.trayInfo} 发送至 ${item.targetPosition} 吗？`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(() => {
          // 执行发送逻辑
          this.sendPalletToDestination(item, item.targetPosition);
        })
        .catch(() => {});
    },

    sendPalletToDestination(item, destination) {
      // 根据托盘信息给AGV小车发送指令
      this.addLog(`正在发送托盘 ${item.trayInfo} 至 ${destination}...`);

      // 显示加载状态
      this.$set(item, 'showSendPanel', false);

      // 这里可以根据目的地调用相应的AGV指令
      // 如果目的地是AGV站点，则使用AGV代码映射表中的代码
      const toSiteCode = this.agvCodeMap[destination] || destination;

      // 调用发送AGV指令方法，确定任务类型和起点终点
      const taskType = 'PF-FMR-COMMON-JH2'; // 假设是从缓存区到输送线
      const fromSiteCode = item.queueName + item.queueNum;

      this.sendAgvCommand(taskType, fromSiteCode, toSiteCode)
        .then((robotTaskCode) => {
          if (robotTaskCode) {
            // 更新托盘状态为正在发送中
            const param = {
              id: item.id,
              trayStatus: '4', // 状态更新为：已在缓存区取货，正运往目的地
              robotTaskCode,
              targetPosition: destination // 保存目的地信息
            };

            HttpUtil.post('/queue_info/update', param)
              .then(() => {
                this.$message.success(`托盘已发送至 ${destination}`);
                this.addLog(`托盘 ${item.trayInfo} 已发送至 ${destination}`);
                // 更新本地item的状态
                this.$set(item, 'trayStatus', '4');
                this.$set(item, 'targetPosition', destination);
                // 重新加载当前区域数据
                this.loadPalletStorageByArea(this.currentStorageArea);
              })
              .catch((err) => {
                this.$message.error('托盘状态更新失败，请重试');
                this.addLog(`托盘状态更新失败：${err}`);
                // 恢复发送面板状态
                this.$set(item, 'showSendPanel', true);
              });
          } else {
            this.$message.error('AGV指令发送失败');
            // 恢复发送面板状态
            this.$set(item, 'showSendPanel', true);
          }
        })
        .catch((err) => {
          this.$message.error(`发送指令失败: ${err}`);
          // 恢复发送面板状态
          this.$set(item, 'showSendPanel', true);
        });
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

    /* AGV调度区域 */
    .agv-schedule-section {
      background: #07293e;
      padding: 10px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);

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

      .agv-schedule-content {
        padding: 8px 0 0 0;

        .agv-route-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;

          .route-row {
            display: flex;
            gap: 10px;
          }

          .route-item {
            display: flex;
            align-items: center;
            flex: 1;

            .route-label {
              color: rgba(255, 255, 255, 0.8);
              width: 50px;
            }
            .agv-input {
              flex: 1;
            }
          }
        }

        .agv-controls {
          width: 100%;
          display: flex;

          .agv-btn {
            flex: 1;
            justify-content: center;
          }
        }
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

    .storage-card {
      background: rgba(30, 42, 56, 0.95);
      border: 1px solid rgba(64, 158, 255, 0.3);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
      .storage-card-header {
        background: rgba(64, 158, 255, 0.1);
        padding: 12px 16px;
        font-size: 16px;
        font-weight: 800;
        color: #409eff;
        border-bottom: 1px solid rgba(64, 158, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        .card-actions {
          display: flex;
          gap: 8px;
          align-items: center;

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

        .storage-info-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          .storage-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
            color: #fff;
            min-width: 150px;

            .storage-info-row {
              display: flex;
              gap: 8px;
              align-items: flex-start;

              &.product-desc {
                .value {
                  flex: 1;
                  word-break: break-word;
                  line-height: 1.4;
                }
              }
            }

            .label {
              color: rgba(255, 255, 255, 0.7);
              white-space: nowrap;
            }

            .value {
              font-weight: 500;
            }
          }

          .send-action-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;

            .el-button {
              width: 36px;
              height: 36px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(64, 158, 255, 0.1);
              border-radius: 50%;
              transition: all 0.3s;

              &:hover {
                background: rgba(64, 158, 255, 0.2);
                transform: scale(1.1);
              }
            }
          }

          .sending-status {
            margin-left: auto;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;

            .status-text {
              display: flex;
              align-items: center;
              gap: 6px;
              color: #e6a23c;
              font-weight: 500;

              i {
                font-size: 16px;
              }
            }

            .destination {
              display: flex;
              gap: 4px;
              font-size: 12px;

              .label {
                color: rgba(255, 255, 255, 0.6);
              }

              .value {
                color: #fff;
              }
            }
          }
        }
        .storage-info.empty {
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }

        .send-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .target-input {
            width: 90px;
          }

          .action-buttons {
            display: flex;
            gap: 6px;
            width: 90px;
            justify-content: space-between;

            :deep(.el-button) {
              padding: 5px 4px;
              flex: 1;
            }
          }
        }
      }
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
    /* color: #fff; */ /* 由内部 span 控制颜色 */
    /* font-size: 18px; */ /* 由内部 span 控制字体大小 */
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    /* Element UI 默认 header 是 flex, align-items: center */
  }

  .drawer-title-container {
    display: flex;
    align-items: center;
    width: 100%; /* 占据整个头部宽度 */
    color: #fff; /* 保持原有标题颜色 */
    font-size: 18px; /* 保持原有标题字体大小 */
  }

  .title-refresh-button {
    /* 根据需要调整按钮与标题的间距 */
    margin-left: 10px;
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
