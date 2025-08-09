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
              @click="switchToAlarmLog"
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
          <!-- 修改生产线标题部分，添加按钮 -->
          <div class="floor-title" style="position: relative">
            <i class="el-icon-monitor"></i> 生产线
            <el-button
              style="position: absolute; right: 175px"
              type="success"
              size="mini"
              @click="showMobileConnectionStatus"
              icon="el-icon-connection"
              :disabled="!wsServerStatus.isRunning"
            >
              PDA互联
            </el-button>
            <el-button
              style="position: absolute; right: 2px"
              type="primary"
              size="mini"
              @click="showAgvTaskManagement"
              icon="el-icon-truck"
            >
              AGV运行中任务管理
            </el-button>
          </div>
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
              <div class="marker-with-button" data-x="2710" data-y="420">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('AGV2-3', 'AGV2-3队列')"
                >
                  AGV2-3队列
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
              <!-- 三楼流动箭头 -->
              <div
                v-for="(arrow, index) in thirdFloorArrows"
                :key="'third-floor-' + index"
                v-show="conveyorStatus.bit14 === '1'"
                class="marker-with-flow flow-item"
                :data-x="arrow.x"
                :data-y="arrow.y"
                :style="{
                  width: arrow.width + 'px',
                  transform: `translate(-50%, -50%) scale(0.5) rotateZ(${arrow.rotation}deg)`
                }"
              >
                <div
                  v-for="item in arrow.arrowCount"
                  :key="item"
                  class="arrow-item"
                ></div>
              </div>

              <!-- 一楼流动箭头 -->
              <div
                v-for="(arrow, index) in firstFloorArrows"
                :key="'first-floor-' + index"
                v-show="conveyorStatus.bit15 === '1'"
                class="marker-with-flow flow-item"
                :data-x="arrow.x"
                :data-y="arrow.y"
                :style="{
                  width: arrow.width + 'px',
                  transform: `translate(-50%, -50%) scale(0.5) rotateZ(${arrow.rotation}deg)`
                }"
              >
                <div
                  v-for="item in arrow.arrowCount"
                  :key="item"
                  class="arrow-item-first-floor"
                ></div>
              </div>

              <!-- 1#机器人状态指示灯 -->
              <div class="robot-status-indicators" data-x="1050" data-y="530">
                <div
                  class="robot-indicator"
                  @click="toggleRobotIndicator('robot1')"
                >
                  <div
                    class="status-light"
                    :class="{
                      'light-green': conveyorStatus.bit14 === '1',
                      'light-yellow-flash': conveyorStatus.bit10 === '1',
                      'light-off':
                        conveyorStatus.bit14 === '0' &&
                        conveyorStatus.bit10 === '0'
                    }"
                  ></div>
                  <span class="robot-label">1#机器人</span>
                </div>
              </div>

              <!-- 2#机器人状态指示灯 -->
              <div class="robot-status-indicators" data-x="1050" data-y="980">
                <div
                  class="robot-indicator"
                  @click="toggleRobotIndicator('robot2')"
                >
                  <div
                    class="status-light"
                    :class="{
                      'light-green': conveyorStatus.bit15 === '1',
                      'light-yellow-flash': conveyorStatus.bit11 === '1',
                      'light-off':
                        conveyorStatus.bit15 === '0' &&
                        conveyorStatus.bit11 === '0'
                    }"
                  ></div>
                  <span class="robot-label">2#机器人</span>
                </div>
              </div>

              <!-- 拆垛线控制按钮 -->
              <div class="control-button-group" data-x="50" data-y="1400">
                <div class="control-panel-title">
                  <i class="el-icon-share" style="margin-right: 5px"></i
                  >拆垛线控制操作
                </div>
                <el-button
                  type="success"
                  size="mini"
                  @mousedown="controlLinePress(1, 'start')"
                  @mouseup="controlLineRelease(1, 'start')"
                  >1# 拆垛线启动</el-button
                >
                <el-button
                  type="success"
                  size="mini"
                  @mousedown="controlLinePress(2, 'start')"
                  @mouseup="controlLineRelease(2, 'start')"
                  >2# 拆垛线启动</el-button
                >
                <el-button
                  type="danger"
                  size="mini"
                  @mousedown="controlLinePress(1, 'stop')"
                  @mouseup="controlLineRelease(1, 'stop')"
                  >1# 拆垛线停止</el-button
                >
                <el-button
                  type="danger"
                  size="mini"
                  @mousedown="controlLinePress(2, 'stop')"
                  @mouseup="controlLineRelease(2, 'stop')"
                  >2# 拆垛线停止</el-button
                >
                <el-button
                  type="warning"
                  size="mini"
                  @mousedown="controlLinePress(1, 'reset')"
                  @mouseup="controlLineRelease(1, 'reset')"
                  >1# 拆垛线复位</el-button
                >
                <el-button
                  type="warning"
                  size="mini"
                  @mousedown="controlLinePress(2, 'reset')"
                  @mouseup="controlLineRelease(2, 'reset')"
                  >2# 拆垛线复位</el-button
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 托盘缓存区抽屉 -->
    <el-drawer
      :visible.sync="palletStorageDrawerVisible"
      direction="rtl"
      size="450px"
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
          :class="{
            'can-move': item.trayInfo,
            'is-locked': item.isLock === '1'
          }"
        >
          <!-- 锁定遮层 -->
          <div v-if="item.isLock === '1'" class="lock-overlay">
            <div class="lock-content">
              <i class="el-icon-lock lock-icon"></i>
              <span class="lock-text">此位置已被占用，正在等待AGV运输</span>
            </div>
          </div>
          <div class="storage-card-header">
            <span
              v-if="
                currentStorageTitle !== 'AGV2-2队列' &&
                currentStorageTitle !== 'AGV2-3队列'
              "
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
                >已在2800取货，正运往缓存区</el-tag
              ><el-tag
                v-if="item.trayStatus === '2'"
                size="small"
                type="success"
                style="margin-left: 15px"
                >已送至2楼缓存区</el-tag
              ><el-tag
                v-if="item.trayStatus === '20'"
                size="small"
                type="success"
                style="margin-left: 15px"
                >在缓存区等待AGV取货</el-tag
              ><el-tag
                v-if="item.trayStatus === '21'"
                size="small"
                type="success"
                style="margin-left: 15px"
                >已在缓存区取货，正运往目的地</el-tag
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
                >已在缓存区取货，正运往目的地</el-tag
              ></span
            >
            <span v-else
              >队列序号：{{ index + 1
              }}<el-tag
                v-if="
                  currentStorageTitle === 'AGV2-2队列' &&
                  item.trayStatus === '6'
                "
                size="small"
                style="margin-left: 15px"
                >等待一楼AGV取货中</el-tag
              ><el-tag
                v-if="
                  currentStorageTitle === 'AGV2-3队列' &&
                  item.trayStatus === '6'
                "
                size="small"
                style="margin-left: 15px"
                >等待三楼AGV取货中</el-tag
              ></span
            >
            <div
              class="card-actions"
              v-if="
                currentStorageTitle !== 'AGV2-2队列' &&
                currentStorageTitle !== 'AGV2-3队列' &&
                item.trayInfo
              "
            >
              <el-button
                type="text"
                size="mini"
                @click="handleOpenMovePalletDialog(item)"
              >
                <i class="el-icon-s-promotion"></i>
                移动
              </el-button>
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
            <div
              class="card-actions"
              v-if="
                (currentStorageTitle === 'AGV2-2队列' ||
                  currentStorageTitle === 'AGV2-3队列') &&
                item.trayInfo
              "
            >
              <el-button
                type="text"
                size="mini"
                class="danger-button"
                @click="handleRemoveFromAGVQueue(item)"
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
                    currentStorageTitle !== 'AGV2-2队列' &&
                    currentStorageTitle !== 'AGV2-3队列'
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
                    currentStorageTitle !== 'AGV2-2队列' &&
                    currentStorageTitle !== 'AGV2-3队列'
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
                    currentStorageTitle !== 'AGV2-2队列' &&
                    currentStorageTitle !== 'AGV2-3队列'
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

        <!-- 添加AGV调度条件模拟 -->
        <div class="test-section">
          <h3>AGV调度条件模拟</h3>
          <div class="test-form">
            <el-form size="small">
              <el-form-item>
                <el-button
                  type="warning"
                  size="small"
                  @click="simulateAGV1Signal"
                  :loading="agvSignalLoading"
                >
                  模拟一楼提升机出口有货信号
                </el-button>
                <el-button
                  type="warning"
                  size="small"
                  style="margin-left: 0px; margin-top: 10px"
                  @click="simulateAGV3Signal"
                  :loading="agvSignalLoading"
                >
                  模拟三楼提升机出口有货信号
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 故障信号测试 -->
        <div class="test-section">
          <h3>故障信号测试</h3>
          <div class="test-form">
            <el-form label-width="70px" size="small">
              <el-form-item label="故障类型">
                <el-select
                  v-model="selectedFaultSignal"
                  placeholder="选择要测试的故障信号"
                  style="width: 100%"
                >
                  <el-option
                    v-for="fault in faultSignalOptions"
                    :key="fault.value"
                    :label="fault.label"
                    :value="fault.value"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="danger"
                  size="small"
                  @click="simulateFaultSignal"
                  :loading="faultSignalLoading"
                  :disabled="!selectedFaultSignal"
                >
                  触发故障信号
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </el-dialog>
    <!-- 托盘移动对话框 -->
    <el-dialog
      title="移动托盘"
      :visible.sync="movePalletDialogVisible"
      width="450px"
      append-to-body
      custom-class="move-pallet-dialog"
      :close-on-click-modal="false"
      @close="resetMovePalletDialog"
    >
      <div v-if="sourcePalletToMove">
        <div class="target-pallet-list">
          <el-radio-group
            v-model="selectedTargetPalletIdForMove"
            style="width: 100%"
          >
            <div
              v-for="targetPallet in currentStoragePositions"
              :key="targetPallet.id"
              class="target-pallet-item"
              :class="{
                'is-source':
                  sourcePalletToMove &&
                  targetPallet.id === sourcePalletToMove.id
              }"
            >
              <el-radio
                :label="targetPallet.id"
                border
                size="small"
                style="width: 100%"
                :disabled="
                  sourcePalletToMove &&
                  targetPallet.id === sourcePalletToMove.id
                "
              >
                位置: {{ targetPallet.queueName }}{{ targetPallet.queueNum }}
                <span
                  v-if="targetPallet.trayInfo"
                  style="margin-left: 10px; color: #e6a23c"
                >
                  (当前: {{ targetPallet.trayInfo }})
                </span>
                <span v-else style="margin-left: 10px; color: #67c23a">
                  (空闲)
                </span>
              </el-radio>
            </div>
          </el-radio-group>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="resetMovePalletDialog" size="small">取消</el-button>
        <el-button
          type="primary"
          @click="confirmPalletMove"
          size="small"
          :disabled="!selectedTargetPalletIdForMove"
          >确定</el-button
        >
      </span>
    </el-dialog>

    <!-- 添加AGV任务管理弹窗 -->
    <el-dialog
      title="AGV运行中任务管理"
      :visible.sync="agvTaskDialogVisible"
      width="980px"
      append-to-body
      :close-on-click-modal="false"
      custom-class="agv-task-dialog"
    >
      <div class="agv-task-management">
        <div class="task-header">
          <el-tabs
            v-model="currentAgvTaskFloor"
            @tab-click="handleAgvTaskTabChange"
          >
            <el-tab-pane
              label="一层AGV运行中任务管理"
              name="floor1"
            ></el-tab-pane>
            <el-tab-pane
              label="二层AGV运行中任务管理"
              name="floor2"
            ></el-tab-pane>
            <el-tab-pane
              label="三层AGV运行中任务管理"
              name="floor3"
            ></el-tab-pane>
          </el-tabs>
          <el-button
            type="primary"
            size="small"
            icon="el-icon-refresh"
            @click="refreshAgvTasks"
            :loading="agvTasksLoading"
          >
            刷新
          </el-button>
        </div>

        <div class="task-table">
          <el-table
            :data="currentAgvTasks"
            border
            style="width: 100%"
            max-height="550px"
            v-loading="agvTasksLoading"
          >
            <el-table-column
              type="index"
              label="序号"
              width="60"
              align="center"
            ></el-table-column>
            <el-table-column label="队列位置" min-width="100" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.queueName }}{{ scope.row.queueNum }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="trayInfo"
              label="托盘号"
              min-width="120"
              align="center"
            ></el-table-column>
            <el-table-column
              prop="trayInfoAdd"
              label="产品描述"
              min-width="220"
            ></el-table-column>
            <el-table-column
              prop="robotTaskCode"
              label="任务号"
              min-width="140"
              align="center"
            ></el-table-column>
            <el-table-column
              prop="trayStatus"
              label="当前状态"
              min-width="180"
              align="center"
            >
              <template slot-scope="scope">
                <span>{{ getAgvTaskStatusText(scope.row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="130" align="center">
              <template slot-scope="scope">
                <el-button
                  v-if="scope.row.isWaitCancel !== '1'"
                  type="danger"
                  size="mini"
                  @click="cancelAgvTask(scope.row)"
                >
                  取消执行
                </el-button>
                <span v-else class="waiting-cancel-text">正在等待取消执行</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 移动端连接状态对话框 -->
    <el-dialog
      title="PDA连接状态"
      :visible.sync="mobileConnectionDialogVisible"
      width="1200px"
      append-to-body
      custom-class="mobile-connection-dialog"
    >
      <div class="connection-status-header">
        <div class="server-status">
          <el-tag :type="wsServerStatus.isRunning ? 'success' : 'danger'">
            WebSocket服务器状态:
            {{ wsServerStatus.isRunning ? '运行中' : '已停止' }}
          </el-tag>
          <span class="server-info">端口: {{ wsServerStatus.port }}</span>
          <span class="server-info"
            >2800车间在线客户端: {{ workshop2800ClientCount }}</span
          >
        </div>
        <el-button
          type="primary"
          size="small"
          icon="el-icon-refresh"
          @click="refreshMobileConnections"
          :loading="refreshingConnections"
        >
          刷新
        </el-button>
      </div>

      <el-table
        :data="mobileConnections"
        style="width: 100%; margin-top: 16px"
        :height="400"
        empty-text="暂无移动端连接"
      >
        <el-table-column
          prop="id"
          label="客户端ID"
          width="280"
          show-overflow-tooltip
        />
        <el-table-column
          prop="workshop"
          label="车间"
          width="100"
          align="center"
        >
          <template slot-scope="scope">
            <el-tag
              :type="
                scope.row.workshop === '2800'
                  ? 'primary'
                  : scope.row.workshop === '2500'
                  ? 'success'
                  : 'info'
              "
              size="small"
            >
              {{ scope.row.workshop }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag
              :type="scope.row.status === '在线' ? 'success' : 'danger'"
              size="small"
            >
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="connectedAt" label="连接时间" width="180">
          <template slot-scope="scope">
            {{ formatTime(scope.row.connectedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastPing" label="最后活跃" width="180">
          <template slot-scope="scope">
            {{ formatTime(scope.row.lastPing) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="userAgent"
          label="设备信息"
          show-overflow-tooltip
        />
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import HttpUtil from '@/utils/HttpUtil';
import HttpUtilAGV from '@/utils/HttpUtilAGV';
import moment from 'moment';
import { ipcRenderer } from 'electron';
// import AlarmWebSocketServer from '@/utils/WebSocketServer'; // 移动到主进程
export default {
  name: 'FloorFirst',
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // 三楼流动箭头配置
      thirdFloorArrows: [
        { x: 1065, y: 457, width: 230, rotation: 180, arrowCount: 7 }, // 三楼A
        { x: 822, y: 635, width: 180, rotation: 95, arrowCount: 6 }, // 三楼A
        { x: 1565, y: 575, width: 180, rotation: 0, arrowCount: 6 }, // 三楼B
        { x: 2430, y: 606, width: 280, rotation: 0, arrowCount: 8 }, // 三楼B
        { x: 2790, y: 777, width: 60, rotation: 5, arrowCount: 4 }, // 三楼B
        { x: 2707, y: 685, width: 70, rotation: 85, arrowCount: 4 } // 三楼B
      ],
      // 一楼流动箭头配置
      firstFloorArrows: [
        { x: 1050, y: 1053, width: 220, rotation: 180, arrowCount: 7 }, // 一楼A
        { x: 800, y: 990, width: 100, rotation: 225, arrowCount: 4 }, // 一楼A
        { x: 2050, y: 658, width: 550, rotation: 0, arrowCount: 15 }, // 一楼B
        { x: 1453, y: 841, width: 130, rotation: 270, arrowCount: 5 }, // 一楼B
        { x: 2653, y: 790, width: 90, rotation: 90, arrowCount: 4 }, // 一楼B
        { x: 2780, y: 926, width: 60, rotation: 0, arrowCount: 3 } // 一楼B
      ],
      pollingTimerCtoAGV: null, // 定时器ID，用于C区到AGV2-2和AGV2-3的托盘移动轮询
      currentStorageTitle: '', // 新增：用于抽屉标题
      visibleArmPanels: [], // 当前显示的机械臂面板ID列表
      palletStorageDrawerVisible: false,
      currentStorageArea: 'A', // 当前选中的缓存区
      palletStorageAreas: {
        A: [],
        B: [],
        C: []
      },
      // 跟踪DBW106的当前值
      currentDBW106Value: 0,
      // 跟踪DBW102的当前值
      currentDBW102Value: 0,
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
        bit9: '0', // 去一楼灌装车间B输送线故障信号
        bit10: '0', // 1#机器人暂停中信号（AGV送货暂停、门安全暂停）
        bit11: '0', // 2#机器人暂停中信号（AGV送货暂停、门安全暂停）
        bit12: '0', // 1#机器人安全门被打开（信号为1时，不能复位停）
        bit13: '0', // 2#机器人安全门被打开（信号为1时，不能复位停）
        bit14: '0', // 1#拆垛线启动中
        bit15: '0' // 2#拆垛线启动中
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
        'AGV1-1': '202',
        'AGV3-1': '302'
      },
      twoEightHundredPalletTestCode: '',
      agvSignalLoading: false,
      // 托盘移动功能所需数据
      movePalletDialogVisible: false,
      sourcePalletToMove: null,
      selectedTargetPalletIdForMove: null,
      agvTaskDialogVisible: false,
      currentAgvTaskFloor: 'floor1',
      currentAgvTasks: [],
      agvTasksLoading: false,
      // 故障信号测试相关数据
      selectedFaultSignal: '',
      faultSignalLoading: false,
      faultSignalOptions: [
        { value: 'bit1', label: 'PLC系统故障信号' },
        { value: 'bit2', label: '1#机器人故障信号' },
        { value: 'bit3', label: '2#机器人故障信号' },
        { value: 'bit4', label: '去三楼托盘提升机故障信号' },
        { value: 'bit5', label: '去一楼托盘提升机故障信号' },
        { value: 'bit6', label: '去三楼灌装车间A输送线故障信号' },
        { value: 'bit7', label: '去三楼灌装车间B输送线故障信号' },
        { value: 'bit8', label: '去一楼灌装车间A输送线故障信号' },
        { value: 'bit9', label: '去一楼灌装车间B输送线故障信号' }
      ],
      // WebSocket相关数据
      wsServer: null,
      wsServerStatus: {
        isRunning: false,
        port: 8081,
        clientCount: 0
      },
      mobileConnectionDialogVisible: false,
      mobileConnections: [],
      refreshingConnections: false
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
    },
    // 2800车间的客户端数量
    workshop2800ClientCount() {
      return this.mobileConnections.length;
    }
  },
  mounted() {
    this.initializeMarkers();
    this.startPalletMovePolling(); // 启动C区到AGV2-2托盘移动的轮询
    this.initWebSocketServer(); // 初始化WebSocket服务器
    ipcRenderer.on('receivedMsg', (event, values, values2) => {
      // 使用位运算优化赋值
      const getBit = (word, bitIndex) => ((word >> bitIndex) & 1).toString();

      // 输送线当前运行状态
      let word2 = this.convertToWord(values.DBW2);
      this.conveyorStatus.bit0 = getBit(word2, 8);
      this.conveyorStatus.bit1 = getBit(word2, 9);
      this.conveyorStatus.bit2 = getBit(word2, 10);
      this.conveyorStatus.bit3 = getBit(word2, 11);
      this.conveyorStatus.bit4 = getBit(word2, 12);
      this.conveyorStatus.bit5 = getBit(word2, 13);
      this.conveyorStatus.bit6 = getBit(word2, 14);
      this.conveyorStatus.bit7 = getBit(word2, 15);
      this.conveyorStatus.bit8 = getBit(word2, 0);
      this.conveyorStatus.bit9 = getBit(word2, 1);
      this.conveyorStatus.bit10 = getBit(word2, 2);
      this.conveyorStatus.bit11 = getBit(word2, 3);
      this.conveyorStatus.bit12 = getBit(word2, 4);
      this.conveyorStatus.bit13 = getBit(word2, 5);
      this.conveyorStatus.bit14 = getBit(word2, 6);
      this.conveyorStatus.bit15 = getBit(word2, 7);

      // 1#机器人状态
      let word4 = this.convertToWord(values.DBW4);
      this.robotStatus.bit0 = getBit(word4, 8);
      this.robotStatus.bit1 = getBit(word4, 9);
      this.robotStatus.bit2 = getBit(word4, 10);
      this.robotStatus.bit3 = getBit(word4, 11);
      this.robotStatus.bit4 = getBit(word4, 12);
      this.robotStatus.bit5 = getBit(word4, 13);
      this.robotStatus.bit6 = getBit(word4, 14);
      this.robotStatus.bit7 = getBit(word4, 15);
      this.robotStatus.bit8 = getBit(word4, 0);
      this.robotStatus.bit9 = getBit(word4, 1);
      this.robotStatus.bit10 = getBit(word4, 2);
      this.robotStatus.bit11 = getBit(word4, 3);

      // 2#机器人状态
      let word6 = this.convertToWord(values.DBW6);
      this.robotStatus2.bit0 = getBit(word6, 8);
      this.robotStatus2.bit1 = getBit(word6, 9);
      this.robotStatus2.bit2 = getBit(word6, 10);
      this.robotStatus2.bit3 = getBit(word6, 11);
      this.robotStatus2.bit4 = getBit(word6, 12);
      this.robotStatus2.bit5 = getBit(word6, 13);
      this.robotStatus2.bit6 = getBit(word6, 14);
      this.robotStatus2.bit7 = getBit(word6, 15);
      this.robotStatus2.bit8 = getBit(word6, 0);
      this.robotStatus2.bit9 = getBit(word6, 1);
      this.robotStatus2.bit10 = getBit(word6, 2);
      this.robotStatus2.bit11 = getBit(word6, 3);

      // AGV调度条件
      let word8 = this.convertToWord(values.DBW8);
      this.agvScheduleCondition.bit0 = getBit(word8, 8);
      this.agvScheduleCondition.bit1 = getBit(word8, 9);
      this.agvScheduleCondition.bit2 = getBit(word8, 10);
      this.agvScheduleCondition.bit3 = getBit(word8, 11);
      this.agvScheduleCondition.bit4 = getBit(word8, 12);
      this.agvScheduleCondition.bit5 = getBit(word8, 13);

      // 2800接货处条码
      this.twoEightHundredPalletCode = values.DBB10 ?? '';
    });
  },
  watch: {
    isActive(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.updateMarkerPositions();
        });
      }
    },
    // 监听agvScheduleCondition.bit0,
    'agvScheduleCondition.bit0': {
      async handler(newVal) {
        if (newVal === '1') {
          this.addLog(`2800接货处扫码数据：${this.twoEightHundredPalletCode}`);
          // 检查条码信息是否为NoRead
          if (this.twoEightHundredPalletCode === 'NoRead') {
            this.addLog('2800接货处扫码失败：条码信息为NoRead', 'alarm');
            // 重置扫码信息为默认值
            this.resetScanInfo();
            return;
          }
          // 自动触发AGV运输任务，从2800到C区缓存位
          this.getTrayInfo(this.twoEightHundredPalletCode);
        }
      }
    },
    // 监听 agvScheduleCondition.bit5，如果变为1，则出发一段逻辑，我自己写
    'agvScheduleCondition.bit5': {
      async handler(newVal) {
        if (newVal === '1') {
          this.addLog('检测到一楼提升机出口有货需AGV接走');
          // 自动触发AGV运输任务，从AGV1-1到C区缓存位
          this.handleAGVToStorage('AGV2-2');
        }
      }
    },
    // 监听 agvScheduleCondition.bit4，3楼提升机出口有货需AGV接走
    'agvScheduleCondition.bit4': {
      async handler(newVal) {
        if (newVal === '1') {
          this.addLog('检测到三楼提升机出口有货需AGV接走');
          // 自动触发AGV运输任务，从AGV3-1到C区缓存位
          this.handleAGVToStorage('AGV2-3');
        }
      }
    },
    // 监听PLC系统故障信号
    'conveyorStatus.bit1': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('PLC系统故障信号', 'alarm');
        }
      }
    },
    // 监听1#机器人故障信号
    'conveyorStatus.bit2': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('1#机器人故障信号', 'alarm');
        }
      }
    },
    // 监听2#机器人故障信号
    'conveyorStatus.bit3': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('2#机器人故障信号', 'alarm');
        }
      }
    },
    // 监听去三楼托盘提升机故障信号
    'conveyorStatus.bit4': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('去三楼托盘提升机故障信号', 'alarm');
        }
      }
    },
    // 监听去一楼托盘提升机故障信号
    'conveyorStatus.bit5': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('去一楼托盘提升机故障信号', 'alarm');
        }
      }
    },
    // 监听去三楼灌装车间A输送线故障信号
    'conveyorStatus.bit6': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('去三楼灌装车间A输送线故障信号', 'alarm');
        }
      }
    },
    // 监听去三楼灌装车间B输送线故障信号
    'conveyorStatus.bit7': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('去三楼灌装车间B输送线故障信号', 'alarm');
        }
      }
    },
    // 监听去一楼灌装车间A输送线故障信号
    'conveyorStatus.bit8': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('去一楼灌装车间A输送线故障信号', 'alarm');
        }
      }
    },
    // 监听去一楼灌装车间B输送线故障信号
    'conveyorStatus.bit9': {
      handler(newVal) {
        if (newVal === '1') {
          this.addLog('去一楼灌装车间B输送线故障信号', 'alarm');
        }
      }
    }
  },
  methods: {
    handleRemoveFromAGVQueue(position) {
      // 仅用于 AGV2-2 / AGV2-3 队列的“真删”操作：只删除，不做其他动作
      this.$confirm(
        '确认从该队列中移除此托盘吗？此操作将永久删除该记录。',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(() => {
          const queueName = this.currentStorageArea; // 'AGV2-2' 或 'AGV2-3'
          const param = { id: position.id };
          HttpUtil.post('/queue_info/delete', param)
            .then((res) => {
              if (res.data == 1) {
                this.addLog(
                  `托盘${position.trayInfo}已从${queueName}队列删除。`
                );
                this.$message.success(
                  `托盘${position.trayInfo}已从${queueName}队列删除。`
                );
                this.loadPalletStorageByArea(queueName);
              } else {
                this.addLog(`托盘${position.trayInfo}删除失败，请检查。`);
                this.$message.error(
                  `托盘${position.trayInfo}删除失败，请检查。`
                );
              }
            })
            .catch((err) => {
              this.addLog(`托盘${position.trayInfo}删除失败，请检查。${err}`);
              this.$message.error(
                `托盘${position.trayInfo}删除失败，请检查。${err}`
              );
            });
        })
        .catch(() => {});
    },
    getStatusText(status) {
      const statusTexts = {
        0: '空闲中',
        1: '处理中'
      };
      return statusTexts[status];
    },
    // 处理一楼提升机出口有货需AGV接走的方法
    async handleAGVToStorage(queueName) {
      try {
        // 查询C队列托盘情况，查找第一个空闲的托盘位置
        const params = {
          queueName: queueName
        };
        let fromCode = '';
        if (queueName === 'AGV2-2') {
          fromCode = '202';
        } else if (queueName === 'AGV2-3') {
          fromCode = '302';
        }
        const res = await HttpUtil.post('/queue_info/queryQueueList', params);
        // 把trayStatus 为5的托盘保留下来
        const trayList = res.data.filter((item) => item.trayStatus === '5');
        if (trayList && trayList.length > 0) {
          // 输出日志
          this.addLog(`${queueName}托盘出库信息：${JSON.stringify(trayList)}`);
          // 调用AGV过来运货
          const robotTaskCode = await this.sendAgvCommand(
            'PF-FMR-COMMON-JH4',
            fromCode,
            trayList[0].targetPosition
          );
          if (robotTaskCode !== '') {
            // 更新托盘状态
            const param = {
              id: trayList[0].id,
              trayStatus: '6',
              robotTaskCode
            };
            await HttpUtil.post('/queue_info/update', param)
              .then((resUpdate) => {
                if (resUpdate.data == 1) {
                  this.addLog(
                    `已给${queueName}目的地：${trayList[0].targetPosition}，发送AGV运输任务`
                  );
                } else {
                  this.addLog(
                    `给${queueName}目的地：${trayList[0].targetPosition}，发送AGV运输任务失败`
                  );
                }
              })
              .catch((err) => {
                this.addLog(
                  `给${queueName}目的地：${trayList[0].targetPosition}，发送AGV运输任务失败：${err.message}`
                );
              });
          }
        }
      } catch (err) {
        this.addLog(
          `处理${queueName}提升机出口货物失败: ${err.message || '未知错误'}`,
          'alarm'
        );
      }
    },
    // 移除托盘
    async deleteAgv22Pallet(item) {
      const params = {
        id: item.id
      };
      await HttpUtil.post('/queue_info/delete', params)
        .then((res) => {
          if (res.data == 1) {
            this.addLog(`AGV2-2托盘出库成功：${item.trayInfo}`);
          } else {
            this.addLog(`AGV2-2托盘出库失败：${item.trayInfo}`);
          }
        })
        .catch((err) => {
          this.addLog(`AGV2-2托盘出库失败：${err.message}`);
        });
    },
    initializeMarkers() {
      this.$nextTick(() => {
        // 确保只选择当前组件内的元素
        this.updateMarkerPositions();
        window.addEventListener('resize', this.updateMarkerPositionsScoped);
      });
    },
    updateMarkerPositionsScoped() {
      // 确保只选择当前组件内的元素
      this.updateMarkerPositions();
    },
    updateMarkerPositions() {
      const images = this.$el.querySelectorAll('.floor-image'); // 限定在当前组件内查找
      images.forEach((image) => {
        const imageWrapper = image.parentElement;
        if (!imageWrapper) return;

        // 如果图片尚未加载完成或组件不可见，其渲染尺寸可能为0
        if (image.width === 0 || image.height === 0) {
          // 可以选择在此处等待图片加载完成，或者依赖isActive的watch来触发更新
          // console.warn("Image not ready or component not visible for marker positioning", image);
          if (this.isActive && !image.complete) {
            image.onload = () => {
              this.$nextTick(() => {
                // 确保DOM更新后再执行
                this.updateMarkerPositions();
              });
            };
            return;
          }
          if (this.isActive && (image.width === 0 || image.height === 0)) {
            // console.warn('FloorFirst: Image has 0 width/height even when active. Retrying updateMarkerPositions.');
            return;
          }
          if (!this.isActive) return; // 如果组件不是激活状态，不进行定位
        }

        const markers = imageWrapper.querySelectorAll(
          '.marker, .marker-with-panel, .marker-with-panel-machine, .marker-with-button, .marker-with-flow, .robot-status-indicators, .control-button-group'
        );
        const wrapperRect = imageWrapper.getBoundingClientRect();

        // 计算图片的实际显示区域
        const displayedWidth = image.width;
        const displayedHeight = image.height;
        // 检查 naturalWidth 和 naturalHeight 是否为0，避免除以0的错误
        if (image.naturalWidth === 0 || image.naturalHeight === 0) {
          console.warn(
            'Image naturalWidth or naturalHeight is 0. Skipping marker updates for this image.',
            image
          );
          return;
        }
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
      window.removeEventListener('resize', this.updateMarkerPositionsScoped);
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
            this.$set(this.palletStorageAreas, area, []); // 清空当前区域数据，显示加载状态
            // 如果API返回的数据需要格式化，进行处理
            this.$message.warning(`获取${area}区托盘数据格式不正确`);
          }
        })
        .catch((err) => {
          console.error(`获取${area}区托盘数据失败:`, err);
          this.$message.error(`获取${area}区托盘数据失败`);
          this.$set(this.palletStorageAreas, area, []); // 清空当前区域数据，显示加载状态
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
          HttpUtil.post('/queue_info/update', {
            id: position.id,
            trayInfo: '',
            trayStatus: '',
            robotTaskCode: '',
            trayInfoAdd: '',
            targetPosition: '',
            isWaitCancel: '',
            isLock: '',
            mudidi: '',
            targetId: 0
          })
            .then((res) => {
              if (res.data == 1) {
                this.addLog(
                  `${position.trayInfo}已从${this.currentStorageArea}区${position.queueName}${position.queueNum}移除托盘`
                );
                // 重新查询
                this.loadPalletStorageByArea(this.currentStorageArea);
              } else {
                this.addLog(
                  `移除托盘失败：${position.queueName}${position.queueNum}`
                );
              }
            })
            .catch((err) => {
              console.error(`${position.trayInfo}移除托盘失败:`, err);
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
    // 重置扫码信息为默认值
    resetScanInfo() {
      this.scanInfo = {
        descrC: '',
        mudidi: ''
      };
    },
    getTrayInfo(trayCode) {
      const params = {
        traceid: trayCode.trim(),
        zt: 'N',
        chejian: '2800'
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
            this.dealScanCode(trayCode, res.data[0]);
          } else {
            // 没查询到货物信息，直接报警
            this.addLog(`读取托盘失败：${trayCode}，请检查托盘是否存在`);
            // 重置扫码信息为默认值
            this.resetScanInfo();
          }
        })
        .catch((err) => {
          this.$message.error('查询托盘失败，请重试' + err);
          // 没查询到货物信息，直接报警
          this.addLog(`读取托盘失败：${trayCode}，请检查托盘是否存在`);
          // 重置扫码信息为默认值
          this.resetScanInfo();
        });
    },
    dealScanCode(trayCode, wmsInfo) {
      // 判断目的地-先不判断，先直接写死进入C队列
      // 查询C队列托盘情况，查找第一个空闲的托盘位置
      // 如果wmsInfo.mudidi为'2800-1'，进入C队列
      // 如果wmsInfo.mudidi为'2800-2'，进入A队列
      // 如果wmsInfo.mudidi为'2800-3'，进入B队列
      // 如果没有上面，则return 并输出日志
      let queueName = '';
      if (wmsInfo.mudidi === '2800-1') {
        queueName = 'C';
      } else if (wmsInfo.mudidi === '2800-2') {
        queueName = 'A';
      } else if (wmsInfo.mudidi === '2800-3') {
        queueName = 'B';
      } else {
        this.addLog(
          `托盘入库失败：${trayCode}，目的地为${wmsInfo.mudidi}，不支持的入库目的地`
        );
        return;
      }
      HttpUtil.post('/queue_info/queryQueueList', {
        queueName
      })
        .then(async (res) => {
          if (res.data && res.data.length > 0) {
            // 查找第一个空闲的托盘位置
            const emptyPosition = res.data.find(
              (item) =>
                (item.trayInfo === null || item.trayInfo === '') &&
                item.isLock !== '1'
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
                  trayInfoAdd: wmsInfo.descrC
                };
                HttpUtil.post('/queue_info/update', param)
                  .then(() => {
                    this.$message.success('托盘已入库');
                    this.addLog(
                      `托盘已入库：${trayCode}, 缓存区位置：${emptyPosition.queueName}${emptyPosition.queueNum}`
                    );
                    // 回更WMS信息
                    HttpUtil.post('/order_info/update', {
                      uuid: wmsInfo.uuid,
                      zt: 'Y'
                    })
                      .then(() => {
                        this.addLog(`已回更WMS信息成功`);
                      })
                      .catch((err) => {
                        this.addLog(`托盘入库成功，回更WMS信息失败：${err}`);
                      });
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
        unread: type === 'alarm' // 报警日志标记未读，运行日志默认已读
      };

      if (type === 'running') {
        this.runningLogs.unshift(log);
        // 保持日志数量在合理范围内
        if (this.runningLogs.length > 300) {
          this.runningLogs.pop();
        }
      } else {
        this.alarmLogs.unshift(log);
        if (this.alarmLogs.length > 300) {
          this.alarmLogs.pop();
        }

        // 如果是报警日志，推送到移动端（2800车间）
        this.pushAlarmToMobile(log);
      }

      // 同时写入本地文件
      const logTypeText = type === 'running' ? '运行日志' : '报警日志';
      const logMessage = `[${logTypeText}] ${message}`;
      ipcRenderer.send('writeLogToLocal', logMessage);
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

    async handleSingleModeChange() {
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

      // 添加确认对话框
      try {
        await this.$confirm(
          `确认执行AGV单次调度任务吗？\n起点：${this.agvSchedule.startPosition}\n终点：${this.agvSchedule.endPosition}`,
          '确认执行',
          {
            confirmButtonText: '确定执行',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
      } catch {
        // 用户取消了操作
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
          // todo 这种方式先不处理占位问题
          taskType = 'PF-FMR-COMMON-JH';
          toSiteCode = this.agvCodeMap[this.agvSchedule.endPosition];
          this.agvSchedule.status = 'singleRunning';
          // 调用发送AGV指令方法
          this.sendAgvCommand(taskType, fromSiteCode, toSiteCode);
        } else {
          // 转盘-缓存区，只有起点与plc进行安全交互
          taskType = 'PF-FMR-COMMON-JH1';
          toSiteCode = this.agvSchedule.endPosition;
          // 判断目的地缓存位有没有托盘占位，如果有直接报错提示，并返回
          const res = await HttpUtil.post('/queue_info/queryQueueList', {
            // toSiteCode的格式是C1,C2... 截取toSiteCode第一位为queueName，后面为queueNum
            queueName: toSiteCode.charAt(0),
            queueNum: toSiteCode.substring(1)
          });
          if (res.data && res.data.length > 0) {
            if (
              (res.data[0].trayInfo === null || res.data[0].trayInfo === '') &&
              res.data[0].isLock !== '1'
            ) {
              this.agvSchedule.status = 'singleRunning';
              // 调用发送AGV指令方法
              const robotTaskCode = await this.sendAgvCommand(
                taskType,
                fromSiteCode,
                toSiteCode
              );
              if (robotTaskCode !== '') {
                // 转盘-缓存区
                const param = {
                  id: res.data[0].id,
                  trayInfo: '1111111',
                  trayStatus: '0',
                  robotTaskCode,
                  trayInfoAdd: '临时托盘'
                };
                HttpUtil.post('/queue_info/update', param)
                  .then((returnRes) => {
                    if (returnRes.data == 1) {
                      this.addLog(`手动调度去往缓存区：${toSiteCode}成功！`);
                      this.$message.success(
                        `手动调度去往缓存区：${toSiteCode}成功！`
                      );
                    } else {
                      this.addLog(`手动调度去往缓存区：${toSiteCode}失败！`);
                      this.$message.error(
                        `手动调度去往缓存区：${toSiteCode}失败！`
                      );
                    }
                  })
                  .catch((err) => {
                    this.addLog(
                      `手动调度去往缓存区：${toSiteCode}失败！${err}`
                    );
                    this.$message.error(
                      `手动调度去往缓存区：${toSiteCode}失败！${err}`
                    );
                  });
              }
            } else {
              this.$message.error(
                `目的地：${toSiteCode}缓存位有托盘占位，请检查。`
              );
              this.addLog(`目的地：${toSiteCode}缓存位有托盘占位，请检查。`);
            }
          } else {
            this.addLog('没有此缓存区位置，请检查输入的缓存区位置是否正确');
            this.$message.error(
              '没有此缓存区位置，请检查输入的缓存区位置是否正确'
            );
          }
        }
      } else if (
        this.agvSchedule.startPosition === 'AGV1-1' ||
        this.agvSchedule.startPosition === 'AGV3-1'
      ) {
        // 说明起点是AGV1-1或AGV3-1
        fromSiteCode = this.agvCodeMap[this.agvSchedule.startPosition];
        if (
          (this.agvSchedule.startPosition === 'AGV1-1' &&
            this.agvSchedule.endPosition.includes('D')) ||
          (this.agvSchedule.startPosition === 'AGV3-1' &&
            this.agvSchedule.endPosition.includes('E'))
        ) {
          // AGV1-1-输送线，只有终点与plc进行安全交互
          taskType = 'PF-FMR-COMMON-JH4';
          toSiteCode = this.agvSchedule.endPosition;
          this.agvSchedule.status = 'singleRunning';
          // 调用发送AGV指令方法
          this.sendAgvCommand(taskType, fromSiteCode, toSiteCode);
        } else {
          // 目前没有这种类型，报错
          taskType = 'ERROR';
          this.addLog(
            `${this.agvSchedule.startPosition}发送到${this.agvSchedule.endPosition}，没有这种任务类型，请检查！`
          );
          this.$message.error(
            `${this.agvSchedule.startPosition}发送到${this.agvSchedule.endPosition}，没有这种任务类型，请检查！`
          );
        }
      } else {
        // 说明起点是缓存区
        fromSiteCode = this.agvSchedule.startPosition;
        if (this.agvSchedule.endPosition.includes('AGV')) {
          // 缓存区-输送线，只有终点与plc进行安全交互
          // taskType = 'PF-FMR-COMMON-JH2';
          // toSiteCode = this.agvCodeMap[this.agvSchedule.endPosition];
          // // 判断起点缓存位有没有托盘占位，如果没有直接报错提示，并返回
          // const res = await HttpUtil.post('/queue_info/queryQueueList', {
          //   // fromSiteCode的格式是C1,C2... 截取fromSiteCode第一位为queueName，后面为queueNum
          //   queueName: fromSiteCode.charAt(0),
          //   queueNum: fromSiteCode.substring(1)
          // });
          // if (res.data && res.data.length > 0) {
          //   if (res.data[0].trayInfo === null || res.data[0].trayInfo === '') {
          //     this.addLog(`起点：${fromSiteCode}没有信息，请扫码录入信息。`);
          //     this.$message.error(
          //       `起点：${fromSiteCode}没有信息，请扫码录入信息。`
          //     );
          //   } else {
          //     this.agvSchedule.status = 'singleRunning';
          //     // 调用发送AGV指令方法
          //     const robotTaskCode = await this.sendAgvCommand(
          //       taskType,
          //       fromSiteCode,
          //       toSiteCode
          //     );
          //     if (robotTaskCode !== '') {
          //       // 缓存区-输送线
          //       const param = {
          //         id: res.data[0].id,
          //         trayStatus: '3', // -在缓存区等待AGV取货
          //         robotTaskCode,
          //         targetPosition: this.agvSchedule.endPosition // 保存目的地信息
          //       };
          //       HttpUtil.post('/queue_info/update', param)
          //         .then((returnRes) => {
          //           if (returnRes.data == 1) {
          //             this.addLog(
          //               `从${fromSiteCode}手动调度去往${toSiteCode}成功！`
          //             );
          //             this.$message.success(
          //               `从${fromSiteCode}手动调度去往${toSiteCode}成功！`
          //             );
          //           } else {
          //             this.addLog(`手动调度去往缓存区：${toSiteCode}失败！`);
          //             this.$message.error(
          //               `手动调度去往缓存区：${toSiteCode}失败！`
          //             );
          //           }
          //         })
          //         .catch((err) => {
          //           this.addLog(
          //             `手动调度去往缓存区：${toSiteCode}失败！${err}`
          //           );
          //           this.$message.error(
          //             `手动调度去往缓存区：${toSiteCode}失败！${err}`
          //           );
          //         });
          //     }
          //   }
          // }
          this.$message.error('不可直接发送到输送线');
          this.addLog('不可直接发送到输送线');
        } else {
          // 缓存区-缓存区
          taskType = 'PF-FMR-COMMON-PY';
          toSiteCode = this.agvSchedule.endPosition;
          fromSiteCode = this.agvSchedule.startPosition;
          // 判断起点缓存位有没有托盘占位，如果没有直接报错提示，并返回
          const resQiDian = await HttpUtil.post('/queue_info/queryQueueList', {
            // fromSiteCode的格式是C1,C2... 截取fromSiteCode第一位为queueName，后面为queueNum
            queueName: fromSiteCode.charAt(0),
            queueNum: fromSiteCode.substring(1)
          });
          if (resQiDian.data && resQiDian.data.length > 0) {
            if (
              resQiDian.data[0].trayInfo === null ||
              resQiDian.data[0].trayInfo === ''
            ) {
              this.addLog(`起点：${fromSiteCode}没有信息，请扫码录入信息。`);
              this.$message.error(
                `起点：${fromSiteCode}没有信息，请扫码录入信息。`
              );
            } else {
              // 判断目的地缓存位有没有托盘占位，如果有直接报错提示，并返回
              const res = await HttpUtil.post('/queue_info/queryQueueList', {
                // toSiteCode的格式是C1,C2... 截取toSiteCode第一位为queueName，后面为queueNum
                queueName: toSiteCode.charAt(0),
                queueNum: toSiteCode.substring(1)
              });
              if (res.data && res.data.length > 0) {
                if (
                  (res.data[0].trayInfo === null ||
                    res.data[0].trayInfo === '') &&
                  res.data[0].isLock !== '1'
                ) {
                  this.agvSchedule.status = 'singleRunning';
                  // 调用发送AGV指令方法
                  const robotTaskCode = await this.sendAgvCommand(
                    taskType,
                    fromSiteCode,
                    toSiteCode
                  );
                  if (robotTaskCode !== '') {
                    // 缓存区-缓存区
                    const param = [
                      {
                        id: resQiDian.data[0].id,
                        trayStatus: '20',
                        robotTaskCode,
                        targetPosition: toSiteCode,
                        targetId: res.data[0].id
                      },
                      {
                        id: res.data[0].id,
                        isLock: '1'
                      }
                    ];
                    HttpUtil.post('/queue_info/updateByList', param)
                      .then((returnRes) => {
                        if (returnRes.data == 1) {
                          this.addLog(
                            `手动调度去往缓存区：${toSiteCode}成功！`
                          );
                          this.$message.success(
                            `手动调度去往缓存区：${toSiteCode}成功！`
                          );
                        } else {
                          this.addLog(
                            `手动调度去往缓存区：${toSiteCode}失败！`
                          );
                          this.$message.error(
                            `手动调度去往缓存区：${toSiteCode}失败！`
                          );
                        }
                      })
                      .catch((err) => {
                        this.addLog(
                          `手动调度去往缓存区：${toSiteCode}失败！${err}`
                        );
                        this.$message.error(
                          `手动调度去往缓存区：${toSiteCode}失败！${err}`
                        );
                      });
                  }
                } else {
                  this.$message.error(
                    `目的地：${toSiteCode}缓存位有托盘占位，请检查。`
                  );
                  this.addLog(
                    `目的地：${toSiteCode}缓存位有托盘占位，请检查。`
                  );
                }
              }
            }
          }
        }
      }
    },
    stopAgvSchedule() {
      if (this.agvSchedule.status === 'cycleRunning') {
        this.agvSchedule.status = 'idle';
        this.addLog('AGV调度已停止(循环)');
      }
    },
    async sendAgvCommand(taskType, fromSiteCode, toSiteCode) {
      // 测试用，返回当前时间戳
      // this.addLog(
      //   `发送AGV指令: 类型=${taskType}, 起点=${fromSiteCode}, 终点=${toSiteCode}`
      // );
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
          this.addLog(`AGV指令发送失败: ${errorMsg}`, 'alarm');
          return '';
        }
      } catch (err) {
        console.error('发送AGV指令失败:', err);
        this.addLog(`AGV指令发送失败: ${err.message || '未知错误'}`);
        this.addLog(`AGV指令发送失败: ${err.message || '未知错误'}`, 'alarm');
        return '';
      }
    },
    startPalletMovePolling() {
      if (this.pollingTimerCtoAGV) {
        clearInterval(this.pollingTimerCtoAGV);
      }
      // 每3秒轮询一次，并立即执行一次
      this.pollForPalletsToMove();
      this.pollingTimerCtoAGV = setInterval(this.pollForPalletsToMove, 5000);
      this.addLog('[轮询] B/C区到AGV2-2/AGV2-3队列的托盘移动轮询已启动。');
    },

    stopPalletMovePolling() {
      if (this.pollingTimerCtoAGV) {
        clearInterval(this.pollingTimerCtoAGV);
        this.pollingTimerCtoAGV = null;
        this.addLog('[轮询] B/C区到AGV2-2/AGV2-3队列的托盘移动轮询已停止。');
      }
    },
    // 轮询C区有没有能够移到AGV2-2队列的托盘
    pollForPalletsToMove() {
      HttpUtil.post('/queue_info/queryQueueList', {}).then((res) => {
        if (res && res.data.length > 0) {
          // 过滤出C队列状态为5的托盘
          const status5PalletsC = res.data.filter(
            (item) => item.trayStatus === '5' && item.queueName === 'C'
          );
          if (status5PalletsC.length > 0) {
            this.insertPalletToAGV(status5PalletsC, 'AGV2-2');
          }
          // 过滤出E队列状态为5的托盘
          const status5PalletsE = res.data.filter(
            (item) => item.trayStatus === '5' && item.queueName === 'B'
          );
          if (status5PalletsE.length > 0) {
            this.insertPalletToAGV(status5PalletsE, 'AGV2-3');
          }
          // 过滤出AGV2-2队列状态为7的托盘
          const status7Pallet2 = res.data.filter(
            (item) => item.trayStatus === '7' && item.queueName === 'AGV2-2'
          );
          if (status7Pallet2.length > 0) {
            this.deletePalletsWithStatus7(status7Pallet2, 'AGV2-2');
          }
          // 过滤出AGV2-3队列状态为7的托盘
          const status7Pallets3 = res.data.filter(
            (item) => item.trayStatus === '7' && item.queueName === 'AGV2-3'
          );
          if (status7Pallets3.length > 0) {
            this.deletePalletsWithStatus7(status7Pallets3, 'AGV2-3');
          }
        }
      });
    },
    // 预留处理状态为7的托盘的删除方法
    deletePalletsWithStatus7(pallets, queueName) {
      const param = {
        id: pallets[0].id
      };
      HttpUtil.post('/queue_info/delete', param)
        .then((res) => {
          if (res.data == 1) {
            // 设置第2位为1，保留其他位
            // 修改位操作，与读取时保持一致，使用第13位（对应bit5）
            if (queueName === 'AGV2-2') {
              this.currentDBW106Value |= 1 << 13; // 按位或，设置第13位为1
            } else if (queueName === 'AGV2-3') {
              this.currentDBW106Value |= 1 << 12; // 按位或，设置第14位为1
            }
            ipcRenderer.send(
              'writeValuesToPLC',
              'DBW106',
              this.currentDBW106Value
            );

            // 再过1秒后发送第三个命令
            setTimeout(() => {
              // 清除第2位为0，保留其他位
              // 修改位操作，与读取时保持一致，使用第13位（对应bit5）
              if (queueName === 'AGV2-2') {
                this.currentDBW106Value &= ~(1 << 13); // 按位与上第13位的反码，清除第13位
              } else if (queueName === 'AGV2-3') {
                this.currentDBW106Value &= ~(1 << 12); // 按位与上第12位的反码，清除第12位
              }
              ipcRenderer.send(
                'writeValuesToPLC',
                'DBW106',
                this.currentDBW106Value
              );
            }, 1000);
            this.addLog(
              `托盘${pallets[0].trayInfo}已从${queueName}队列删除，已给PLC触发取货完成信号。`
            );
          } else {
            this.addLog(`托盘${pallets[0].trayInfo}删除失败，请检查。`);
          }
        })
        .catch((err) => {
          this.addLog(`托盘${pallets[0].trayInfo}删除失败，请检查。${err}`);
        });
    },
    // 将托盘插入AGV2-2/AGV2-3队列
    insertPalletToAGV(pallets, queueName) {
      // pallets按照元素updateTime正序排序，pallets长度是大于等于一的
      pallets.sort((a, b) => a.updateTime - b.updateTime);
      // 取第一个元素
      const firstPallet = pallets[0];
      firstPallet.queueName = queueName;
      // 调用入库接口
      HttpUtil.post('/queue_info/updateAgvQueue', firstPallet)
        .then((res) => {
          if (res.data == 1) {
            // 给PLC写条码数据
            ipcRenderer.send(
              'writeValuesToPLC',
              queueName === 'AGV2-2' ? 'DBB120' : 'DBB130',
              firstPallet.trayInfo
            );
            // 1秒后发送第二个命令
            setTimeout(() => {
              // 设置第2位为1，保留其他位
              // 修改位操作，与读取时保持一致，使用第10位（对应bit2）
              if (queueName === 'AGV2-2') {
                this.currentDBW106Value |= 1 << 10; // 按位或，设置第10位为1
              } else if (queueName === 'AGV2-3') {
                this.currentDBW106Value |= 1 << 11; // 按位或，设置第11位为1
              }
              ipcRenderer.send(
                'writeValuesToPLC',
                'DBW106',
                this.currentDBW106Value
              );

              // 再过1秒后发送第三个命令
              setTimeout(() => {
                // 清除第2位为0，保留其他位
                // 修改位操作，与读取时保持一致，使用第10位（对应bit2）
                if (queueName === 'AGV2-2') {
                  this.currentDBW106Value &= ~(1 << 10); // 按位与上第10位的反码，清除第10位
                } else if (queueName === 'AGV2-3') {
                  this.currentDBW106Value &= ~(1 << 11); // 按位与上第11位的反码，清除第11位
                }
                ipcRenderer.send(
                  'writeValuesToPLC',
                  'DBW106',
                  this.currentDBW106Value
                );
              }, 1000);
            }, 1000);
            this.addLog(
              `收到AGV放货消息，托盘${firstPallet.trayInfo}已进入${queueName}队列，已给PLC发送条码数据。`
            );
          } else {
            this.addLog(
              `托盘${firstPallet.trayInfo}进入${queueName}队列失败，请检查。`
            );
          }
        })
        .catch((err) => {
          this.addLog(
            `托盘${firstPallet.trayInfo}进入${queueName}队列失败，请检查。${err}`
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
      // 判断是发往1楼还是3楼，一楼是D*，3楼是E*
      let taskType = '';
      let fromSiteCode = '';
      let toSiteCode = '';
      if (destination.startsWith('D')) {
        // 根据托盘信息给AGV小车发送指令
        this.addLog(
          `正在发送托盘 ${item.trayInfo} 至 ${destination}...先途径AGV2-2...`
        );
        // 调用发送AGV指令方法，确定任务类型和起点终点
        taskType = 'PF-FMR-COMMON-JH2'; // 假设是从缓存区到输送线
        fromSiteCode = item.queueName + item.queueNum;
        toSiteCode = '201';
      } else if (destination.startsWith('E')) {
        // 根据托盘信息给AGV小车发送指令
        this.addLog(
          `正在发送托盘 ${item.trayInfo} 至 ${destination}...先途径AGV2-3...`
        );
        // 调用发送AGV指令方法，确定任务类型和起点终点
        taskType = 'PF-FMR-COMMON-JH2'; // 假设是从缓存区到输送线
        fromSiteCode = item.queueName + item.queueNum;
        toSiteCode = '301';
      } else {
        this.$message.error('输入的目的地不支持，请输入D*或E*');
        return;
      }
      // 显示加载状态
      this.$set(item, 'showSendPanel', false);
      this.sendAgvCommand(taskType, fromSiteCode, toSiteCode)
        .then((robotTaskCode) => {
          if (robotTaskCode) {
            // 更新托盘状态为正在发送中
            const param = {
              id: item.id,
              trayStatus: '3', // -在缓存区等待AGV取货
              robotTaskCode,
              targetPosition: destination // 保存目的地信息
            };

            HttpUtil.post('/queue_info/update', param)
              .then((res) => {
                if (res.data == 1) {
                  this.$message.success(`托盘已发送至 ${destination}`);
                  this.addLog(`托盘 ${item.trayInfo} 已发送至 ${destination}`);
                  // 更新本地item的状态
                  this.$set(item, 'trayStatus', '3');
                  this.$set(item, 'targetPosition', destination);
                  // 重新加载当前区域数据
                  this.loadPalletStorageByArea(this.currentStorageArea);
                }
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
    },
    simulateAGV1Signal() {
      this.agvSignalLoading = true;
      // 设置bit5为1，触发监听器
      this.agvScheduleCondition.bit5 = '1';
      this.addLog('模拟一楼提升机出口有货信号已发送');

      // 1秒后恢复为0
      setTimeout(() => {
        this.agvScheduleCondition.bit5 = '0';
        this.agvSignalLoading = false;
        this.addLog('模拟一楼提升机出口有货信号已恢复');
      }, 1000);
    },
    simulateAGV3Signal() {
      this.agvSignalLoading = true;
      // 设置bit5为1，触发监听器
      this.agvScheduleCondition.bit4 = '1';
      this.addLog('模拟三楼提升机出口有货信号已发送');

      // 1秒后恢复为0
      setTimeout(() => {
        this.agvScheduleCondition.bit4 = '0';
        this.agvSignalLoading = false;
        this.addLog('模拟三楼提升机出口有货信号已恢复');
      }, 1000);
    },
    // --- 托盘移动功能方法 START ---
    handleOpenMovePalletDialog(item) {
      this.loadPalletStorageByArea(this.currentStorageArea); // 重新加载数据
      this.sourcePalletToMove = JSON.parse(JSON.stringify(item)); // 深拷贝
      this.selectedTargetPalletIdForMove = null; // 重置选择
      this.movePalletDialogVisible = true;
    },

    resetMovePalletDialog() {
      this.movePalletDialogVisible = false;
      this.sourcePalletToMove = null;
      this.selectedTargetPalletIdForMove = null;
    },

    async confirmPalletMove() {
      if (!this.sourcePalletToMove || !this.selectedTargetPalletIdForMove) {
        this.$message.warning('未选择源托盘或目标位置。');
        return;
      }

      const source = this.sourcePalletToMove;
      // 确保从最新的 currentStoragePositions 中查找目标，以防 stale data
      const currentTargetList =
        this.palletStorageAreas[this.currentStorageArea] || [];
      const target = currentTargetList.find(
        (p) => p.id === this.selectedTargetPalletIdForMove
      );

      if (!target) {
        this.$message.error('找不到目标位置信息，请刷新后重试。');
        return;
      }

      if (source.id === target.id) {
        this.$message.warning('源位置和目标位置不能相同。');
        return;
      }
      const fieldsToHandle = [
        'trayInfo',
        'trayStatus',
        'robotTaskCode',
        'trayInfoAdd',
        'targetPosition'
      ];
      const updates = [];

      if (target.trayInfo) {
        const sourceUpdate = { id: source.id };
        const targetUpdate = { id: target.id };

        fieldsToHandle.forEach((field) => {
          sourceUpdate[field] = target[field];
          targetUpdate[field] = source[field];
        });
        updates.push(sourceUpdate, targetUpdate);
      } else {
        const targetUpdate = { id: target.id };
        fieldsToHandle.forEach((field) => {
          targetUpdate[field] = source[field];
        });

        const sourceClearUpdate = { id: source.id };
        fieldsToHandle.forEach((field) => {
          sourceClearUpdate[field] = ''; // 清空字段，与移除操作保持一致
        });
        updates.push(targetUpdate, sourceClearUpdate);
      }

      try {
        const res = await HttpUtil.post('/queue_info/updateByList', updates);
        // 根据实际API返回结果判断成功，这里假设 res.data > 0 表示成功更新记录数
        if (res.data == 1) {
          // 假设后端返回的成功标识
          this.$message.success('托盘移动成功！');
          this.loadPalletStorageByArea(this.currentStorageArea); // 刷新列表
          this.resetMovePalletDialog();
        } else {
          const errorMsg = res && res.message ? res.message : '未知错误';
          this.$message.error(`托盘移动失败: ${errorMsg}`);
        }
      } catch (error) {
        const errorMsg = error && error.message ? error.message : '操作异常';
        this.$message.error(`托盘移动操作异常: ${errorMsg}`);
      }
    },
    // --- 托盘移动功能方法 END ---
    showAgvTaskManagement() {
      this.agvTaskDialogVisible = true;
      this.refreshAgvTasks();
    },

    refreshAgvTasks() {
      this.agvTasksLoading = true;
      HttpUtil.post('/queue_info/queryQueueList', {})
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            // 筛选出trayStatus为'0'、'1'、'3'、'4'、'6'、'7'状态的数据
            const runningTasks = res.data.filter((item) =>
              ['0', '1', '20', '21', '3', '4', '6', '7'].includes(
                item.trayStatus
              )
            );

            // 根据楼层分类
            const floor1Tasks = runningTasks.filter(
              (item) =>
                item.queueName === 'AGV2-2' &&
                ['6', '7'].includes(item.trayStatus)
            );
            const floor2Tasks = runningTasks.filter((item) =>
              ['0', '1', '20', '21', '3', '4'].includes(item.trayStatus)
            );
            const floor3Tasks = runningTasks.filter(
              (item) =>
                item.queueName === 'AGV2-3' &&
                ['6', '7'].includes(item.trayStatus)
            );

            // 根据当前选中的楼层显示对应的数据
            switch (this.currentAgvTaskFloor) {
              case 'floor1':
                this.currentAgvTasks = floor1Tasks;
                break;
              case 'floor2':
                this.currentAgvTasks = floor2Tasks;
                break;
              case 'floor3':
                this.currentAgvTasks = floor3Tasks;
                break;
              default:
                this.currentAgvTasks = [];
            }
            console.log(this.currentAgvTasks);
          } else {
            this.currentAgvTasks = [];
            this.$message.warning('未获取到任务数据');
          }
        })
        .catch((err) => {
          console.error('获取AGV任务数据失败:', err);
          this.$message.error('获取AGV任务数据失败');
          this.currentAgvTasks = [];
        })
        .finally(() => {
          this.agvTasksLoading = false;
        });
    },

    handleAgvTaskTabChange() {
      this.refreshAgvTasks();
    },

    cancelAgvTask(task) {
      this.$confirm(`确认取消托盘"${task.trayInfo}"的任务吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          const robotTaskCode = await this.sendCancelAgvCommand(
            task.robotTaskCode,
            task.trayInfo
          );
          if (robotTaskCode !== '') {
            // 调用取消AGV任务的API
            HttpUtil.post('/queue_info/update', {
              id: task.id,
              isWaitCancel: '1'
            })
              .then((res) => {
                if (res.data == 1) {
                  this.$message.success('任务取消请求已发送');
                  this.addLog(`托盘"${task.trayInfo}"的任务取消请求已发送`);
                  // 刷新任务列表
                  this.refreshAgvTasks();
                } else {
                  this.$message.error('任务取消请求失败');
                }
              })
              .catch((err) => {
                console.error('取消AGV任务失败:', err);
                this.$message.error('取消AGV任务失败');
              });
          }
        })
        .catch(() => {
          // 取消操作
        });
    },

    getAgvTaskStatusText(row) {
      // 根据trayStatus状态返回对应的文本描述
      const statusMap = {
        0: '在2800等待AGV取货',
        1: '已在2800取货，正往缓存区运送',
        2: '已送至2楼缓存区',
        20: '在缓存区等待AGV取货',
        21: '已在缓存区取货，正往运往目的地',
        3: '在缓存区等待AGV取货',
        4: '已在缓存区取货，正往运往目的地',
        5: '已送至2楼目的地',
        6: row.queueName === 'AGV2-2' ? '等待一楼AGV取货' : '等待三楼AGV取货',
        7:
          row.queueName === 'AGV2-2'
            ? 'AGV已在一楼AGV1-1取货，正运往目的地'
            : 'AGV已在三楼AGV3-1取货，正运往目的地'
      };

      return statusMap[row.trayStatus] || '未知状态';
    },
    async sendCancelAgvCommand(robotTaskCode, trayInfo) {
      // 测试用，返回当前时间戳
      // this.addLog(
      //   `发送AGV取消指令: 机器人任务编码=${robotTaskCode}, 托盘信息=${trayInfo}`
      // );
      // return Date.now().toString();
      // 组装入参
      const params = {
        robotTaskCode: robotTaskCode,
        cancelType: 'CANCEL'
      };
      this.addLog(
        `发送AGV取消指令: 机器人任务编码=${robotTaskCode}, 托盘信息=${trayInfo}`
      );
      try {
        // 发送AGV指令
        const res = await HttpUtilAGV.post(
          '/rcs/rtas/api/robot/controller/task/cancel',
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
            case 'Err_TaskFinished':
              errorMsg = '任务已结束';
              break;
            case 'Err_TaskNotFound':
              errorMsg = '任务找不到';
              break;
            case 'Err_TaskModifyReject':
              errorMsg = '任务当前无法变更';
              break;
            case 'Err_TaskTypeNotSupport':
              errorMsg = '新任务任务类型不支持';
              break;
            case 'Err_RobotGroupsNotMatch':
              errorMsg = '机器人资源组编号与新任务不匹配，无法调度';
              break;
            case 'Err_RobotCodesNotMatch':
              errorMsg = '机器人编号与新任务不匹配，无法调度';
              break;
            default:
              errorMsg = res.message || '未知错误';
          }
          this.addLog(`AGV指令发送失败: ${errorMsg}`);
          this.addLog(`AGV指令发送失败: ${errorMsg}`, 'alarm');
          return '';
        }
      } catch (err) {
        console.error('发送AGV指令失败:', err);
        this.addLog(`AGV指令发送失败: ${err.message || '未知错误'}`);
        this.addLog(`AGV指令发送失败: ${err.message || '未知错误'}`, 'alarm');
        return '';
      }
    },
    // 触发故障信号测试
    simulateFaultSignal() {
      if (!this.selectedFaultSignal) {
        this.$message.warning('请选择要测试的故障信号');
        return;
      }

      this.faultSignalLoading = true;

      // 获取选中故障信号的描述
      const faultOption = this.faultSignalOptions.find(
        (option) => option.value === this.selectedFaultSignal
      );
      const faultDescription = faultOption
        ? faultOption.label
        : this.selectedFaultSignal;

      // 设置对应的故障信号为1
      this.conveyorStatus[this.selectedFaultSignal] = '1';
      this.addLog(`模拟故障信号已触发：${faultDescription}`);

      // 2秒后自动恢复为0
      setTimeout(() => {
        this.conveyorStatus[this.selectedFaultSignal] = '0';
        this.addLog(`模拟故障信号已恢复：${faultDescription}`);
        this.faultSignalLoading = false;
      }, 2000);
    },
    // 切换到报警日志时清除未读状态
    switchToAlarmLog() {
      this.activeLogType = 'alarm';
      // 清除所有报警日志的未读状态
      this.alarmLogs.forEach((log) => {
        log.unread = false;
      });
    },

    // ============ WebSocket相关方法 ============
    // 初始化WebSocket连接（项目启动时WebSocket服务器已自动启动）
    initWebSocketServer() {
      try {
        // 监听服务器状态更新
        ipcRenderer.on('websocket-status-update', (event, status) => {
          this.wsServerStatus = status;
        });

        // 立即获取一次状态
        ipcRenderer.send('get-websocket-status');

        // 定期请求服务器状态
        setInterval(() => {
          ipcRenderer.send('get-websocket-status');
        }, 5000);

        this.addLog('已连接到WebSocket服务器', 'running');
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        this.addLog(`WebSocket连接失败: ${error.message}`, 'alarm');
      }
    },

    // updateWsServerStatus方法已移除，状态通过IPC获取

    // 推送报警到移动端（通过IPC）
    pushAlarmToMobile(logData) {
      const alarmData = {
        id: logData.id,
        message: logData.message,
        timestamp: logData.timestamp,
        type: logData.type,
        source: '2800车间',
        unread: true
      };

      // 发送IPC消息到主进程，请求推送报警
      ipcRenderer.send('push-alarm-to-workshop', '2800', alarmData);
      console.log('报警推送请求已发送到主进程');
    },

    // 显示移动端连接状态
    showMobileConnectionStatus() {
      this.mobileConnectionDialogVisible = true;
      this.refreshMobileConnections();
    },

    // 刷新移动端连接状态（通过IPC）
    refreshMobileConnections() {
      this.refreshingConnections = true;

      // 发送IPC消息到主进程，请求获取连接的客户端
      ipcRenderer.send('get-websocket-clients');

      // 监听客户端列表响应
      ipcRenderer.once('websocket-clients-list', (event, clients) => {
        // 只显示2800车间的连接
        this.mobileConnections = (clients || []).filter(
          (client) => client.workshop === '2800'
        );
        this.refreshingConnections = false;
      });
    },

    // 格式化时间
    formatTime(timeValue) {
      if (!timeValue) return '--';
      return moment(timeValue).format('YYYY-MM-DD HH:mm:ss');
    },

    // 切换机器人指示灯状态（三种状态循环切换）
    toggleRobotIndicator(robotId) {
      if (robotId === 'robot1') {
        // 当前状态：停止 -> 启动 -> 暂停 -> 停止
        if (
          this.conveyorStatus.bit14 === '0' &&
          this.conveyorStatus.bit10 === '0'
        ) {
          // 停止状态 -> 启动中
          this.conveyorStatus.bit14 = '1';
          this.conveyorStatus.bit10 = '0';
          this.addLog('1#机器人状态切换为：启动中');
        } else if (this.conveyorStatus.bit14 === '1') {
          // 启动中 -> 暂停中
          this.conveyorStatus.bit14 = '0';
          this.conveyorStatus.bit10 = '1';
          this.addLog('1#机器人状态切换为：暂停中');
        } else if (this.conveyorStatus.bit10 === '1') {
          // 暂停中 -> 停止
          this.conveyorStatus.bit14 = '0';
          this.conveyorStatus.bit10 = '0';
          this.addLog('1#机器人状态切换为：已停止');
        }
      } else if (robotId === 'robot2') {
        // 当前状态：停止 -> 启动 -> 暂停 -> 停止
        if (
          this.conveyorStatus.bit15 === '0' &&
          this.conveyorStatus.bit11 === '0'
        ) {
          // 停止状态 -> 启动中
          this.conveyorStatus.bit15 = '1';
          this.conveyorStatus.bit11 = '0';
          this.addLog('2#机器人状态切换为：启动中');
        } else if (this.conveyorStatus.bit15 === '1') {
          // 启动中 -> 暂停中
          this.conveyorStatus.bit15 = '0';
          this.conveyorStatus.bit11 = '1';
          this.addLog('2#机器人状态切换为：暂停中');
        } else if (this.conveyorStatus.bit11 === '1') {
          // 暂停中 -> 停止
          this.conveyorStatus.bit15 = '0';
          this.conveyorStatus.bit11 = '0';
          this.addLog('2#机器人状态切换为：已停止');
        }
      }
    },
    // 获取位位置和动作名称
    getBitPositionAndActionName(line, action) {
      const lineName = `${line}#拆垛线`;
      let bitPosition = 0;
      let actionName = '';

      // 根据line和action确定要设置的位
      if (line === 1) {
        switch (action) {
          case 'start':
            bitPosition = 12; // bit12：1#拆垛线启动按钮
            actionName = `${lineName}启动`;
            break;
          case 'stop':
            bitPosition = 13; // bit13：1#拆垛线停止按钮
            actionName = `${lineName}停止`;
            break;
          case 'reset':
            bitPosition = 10; // bit10：1#机器人复位按钮
            actionName = `1#机器人复位`;
            break;
        }
      } else if (line === 2) {
        switch (action) {
          case 'start':
            bitPosition = 14; // bit14：2#拆垛线启动按钮
            actionName = `${lineName}启动`;
            break;
          case 'stop':
            bitPosition = 15; // bit15：2#拆垛线停止按钮
            actionName = `${lineName}停止`;
            break;
          case 'reset':
            bitPosition = 11; // bit11：2#机器人复位按钮
            actionName = `2#机器人复位`;
            break;
        }
      }

      return { bitPosition, actionName };
    },

    // 按钮按下时调用
    controlLinePress(line, action) {
      const { bitPosition, actionName } = this.getBitPositionAndActionName(
        line,
        action
      );

      // 设置对应位为1（按下按钮）
      this.currentDBW102Value |= 1 << bitPosition;
      this.addLog(`发送PLC命令：${actionName}按钮按下`);
      ipcRenderer.send('writeValuesToPLC', 'DBW102', this.currentDBW102Value);
    },

    // 按钮松开时调用
    controlLineRelease(line, action) {
      const { bitPosition, actionName } = this.getBitPositionAndActionName(
        line,
        action
      );

      // 设置对应位为0（松开按钮）
      this.currentDBW102Value &= ~(1 << bitPosition);
      ipcRenderer.send('writeValuesToPLC', 'DBW102', this.currentDBW102Value);

      this.addLog(`发送PLC命令：${actionName}按钮松开`);
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
            .marker-with-panel-machine,
            .marker-with-flow {
              position: absolute;
              transform: translate(-50%, -50%);
              z-index: 1;
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

      // 添加上锁状态样式
      &.is-locked {
        position: relative;
      }

      // 上锁蒙版样式
      .lock-overlay {
        position: absolute;
        top: 49px; // 跳过标题区域的高度
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: not-allowed;
        z-index: 10;
        border-radius: 0 0 8px 8px; // 只有底部圆角
        transition: all 0.3s ease;

        &:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        .lock-content {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          font-size: 16px;
          font-weight: 500;

          .lock-icon {
            font-size: 24px;
            color: #e6a23c;
          }

          .lock-text {
            font-size: 16px;
            color: #fff;
          }
        }
      }

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

/* 托盘移动对话框样式 */
.move-pallet-dialog {
  .target-pallet-list {
    max-height: 350px; /* 增加列表最大高度 */
    overflow-y: auto;
    padding-right: 5px; /* For scrollbar, if thin */
    margin-top: 0px; /* 调整与上方文字间距 */
  }

  .target-pallet-item {
    margin-bottom: 8px;
    /* padding: 2px; */ /* 移除或调整内边距，el-radio[border]自带一些 */
    border-radius: 4px;
    transition: background-color 0.2s;

    .el-radio.is-bordered {
      width: 100%;
      padding: 8px 15px; /* 调整el-radio的内边距 */
      border: 1px solid rgba(255, 255, 255, 0.2);
      background-color: rgba(255, 255, 255, 0.03); /* 略微调暗背景 */
      &:hover {
        border-color: #409eff;
        background-color: rgba(64, 158, 255, 0.05);
      }
    }
    .el-radio.is-bordered.is-checked {
      border-color: #409eff;
      background-color: rgba(64, 158, 255, 0.1);
    }
    .el-radio__label {
      color: #e0e0e0; /* 标签文字颜色稍亮 */
      font-size: 13px; /* 调整字体大小 */
    }
    .el-radio__input.is-disabled .el-radio__inner {
      /* 禁用项样式 */
      background-color: rgba(128, 128, 128, 0.2);
      border-color: rgba(128, 128, 128, 0.3);
    }
    &.is-source .el-radio.is-bordered {
      /* 源托盘的特殊样式 */
      background-color: rgba(100, 100, 100, 0.2); /* 暗化背景表示禁用 */
      border-color: rgba(100, 100, 100, 0.4);
      cursor: not-allowed;
    }
    &.is-source .el-radio__label {
      color: #888; /* 暗化文字 */
    }
  }
  /* 滚动条样式 */
  .target-pallet-list::-webkit-scrollbar {
    width: 6px;
  }
  .target-pallet-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  .target-pallet-list::-webkit-scrollbar-thumb {
    background: rgba(64, 158, 255, 0.3);
    border-radius: 3px;
  }
  .target-pallet-list::-webkit-scrollbar-thumb:hover {
    background: rgba(64, 158, 255, 0.5);
  }
}

/* 流动箭头样式 - 从index.vue index.less完整复制 */
.arrow-item {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 34px;
}
.arrow-item::before {
  content: '';
  display: inline-block;
  position: relative;
  width: 20px;
  height: 16px;
  background-color: #1dbb50;
}
.arrow-item::after {
  content: '';
  position: relative;
  top: 4px;
  right: 12px;
  display: inline-block;
  width: 0;
  height: 0;
  border-right: 24px solid #1dbb50;
  border-bottom: 24px solid transparent;
  transform: rotate(45deg);
}

/* 一楼箭头样式 - 使用动感蓝色 */
.arrow-item-first-floor {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 34px;
}
.arrow-item-first-floor::before {
  content: '';
  display: inline-block;
  position: relative;
  width: 20px;
  height: 16px;
  background-color: #2a57fb;
}
.arrow-item-first-floor::after {
  content: '';
  position: relative;
  top: 4px;
  right: 12px;
  display: inline-block;
  width: 0;
  height: 0;
  border-right: 24px solid #2a57fb;
  border-bottom: 24px solid transparent;
  transform: rotate(45deg);
}

.flow-item {
  height: 34px;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  backface-visibility: hidden; /* 防止闪烁 */
  .arrow-item {
    position: relative;
    animation: carousel 1s linear infinite;
    will-change: transform;
  }
  .arrow-item-first-floor {
    position: relative;
    animation: carousel 1s linear infinite;
    will-change: transform;
  }
}

@keyframes carousel {
  0% {
    transform: translateX(-45px) translateZ(0);
  }
  100% {
    transform: translateX(0px) translateZ(0);
  }
}

/* 机器人状态指示灯样式 */
.robot-status-indicators {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 3;
}

.robot-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(30, 42, 56, 0.9);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.status-light {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  position: relative;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

/* 绿灯 - 启动中 */
.status-light.light-green {
  background: radial-gradient(circle at 30% 30%, #4ade80, #16a34a);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.3),
    inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.status-light.light-green::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
}

/* 黄灯闪烁 - 暂停中 */
.status-light.light-yellow-flash {
  background: radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b);
  animation: yellowFlash 1.5s infinite;
}

.status-light.light-yellow-flash::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
}

@keyframes yellowFlash {
  0%,
  50% {
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.8),
      0 0 16px rgba(251, 191, 36, 0.4), inset 0 1px 3px rgba(0, 0, 0, 0.3);
    opacity: 1;
  }
  25%,
  75% {
    box-shadow: 0 0 4px rgba(251, 191, 36, 0.4), 0 0 8px rgba(251, 191, 36, 0.2),
      inset 0 1px 3px rgba(0, 0, 0, 0.3);
    opacity: 0.4;
  }
}

/* 灯灭 - 停止状态 */
.status-light.light-off {
  background: radial-gradient(circle at 30% 30%, #6b7280, #4b5563);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.robot-label {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.agv-task-dialog {
  background: rgba(24, 29, 47, 0.95) !important;

  :deep(.el-dialog__header) {
    padding: 12px 20px;
    background: rgba(64, 158, 255, 0.1);
    border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  }

  :deep(.el-dialog__title) {
    color: #409eff;
    font-size: 18px;
    font-weight: 500;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    color: #fff;
  }

  :deep(.el-tabs__item) {
    color: rgba(255, 255, 255, 0.6);
    padding: 0 16px;
    height: 36px;
    line-height: 36px;
    &.is-active {
      color: #409eff;
    }
    &:hover {
      color: #66b1ff;
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: #409eff;
  }

  :deep(.el-tabs__nav-wrap::after) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :deep(.el-table) {
    background-color: transparent !important;
  }

  :deep(.el-table__header-wrapper th) {
    background-color: rgba(64, 158, 255, 0.2) !important;
    color: #fff !important;
  }

  :deep(.el-table__row) {
    background-color: rgba(255, 255, 255, 0.9) !important;
  }

  :deep(.el-table__body td) {
    background-color: rgba(255, 255, 255, 0.9) !important;
    color: #333 !important;
  }

  :deep(.cell) {
    color: #333 !important;
  }

  :deep(.el-button--danger) {
    color: #fff;
  }
}

.agv-task-management {
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .el-tabs {
      flex: 1;
    }

    .el-button {
      margin-left: 16px;
    }
  }

  .task-table {
    :deep(.el-table) {
      background-color: transparent;

      :deep(.el-table__header-wrapper) {
        th {
          background-color: rgba(64, 158, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 8px 0;
        }
      }

      :deep(.el-table__body-wrapper) {
        background-color: transparent;

        tr {
          background-color: rgba(30, 42, 56, 0.95);
          &:hover > td {
            background-color: rgba(64, 158, 255, 0.1) !important;
          }
        }

        td {
          border-bottom-color: rgba(255, 255, 255, 0.1);
          color: #e0e0e0;
          padding: 8px 0;
        }
      }

      :deep(.el-table--border),
      :deep(.el-table--border::after),
      :deep(.el-table--border::before) {
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      :deep(.el-table--border th),
      :deep(.el-table--border td) {
        border-right: 1px solid rgba(255, 255, 255, 0.2);
      }

      :deep(.el-table__empty-block) {
        background-color: rgba(30, 42, 56, 0.95);

        .el-table__empty-text {
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }
  }
}

.waiting-cancel-text {
  color: #f56c6c;
  font-size: 12px;
  white-space: nowrap;
}

/* 移动端连接状态对话框样式 */
:deep(.mobile-connection-dialog) {
  .connection-status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    border: 1px solid #e4e7ed;
  }

  .server-status {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .server-info {
    color: #606266;
    font-size: 14px;
    padding: 4px 8px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #dcdfe6;
  }
}

.control-button-group {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  background: rgba(7, 41, 62, 0.85);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(10, 197, 168, 0.25);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
  z-index: 5;

  .control-panel-title {
    grid-column: 1 / -1; /* Span all columns */
    text-align: left;
    color: #0ac5a8;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(10, 197, 168, 0.25);
  }

  .el-button {
    margin: 0 !important;
    font-weight: 500;
    font-size: 13px;
    transition: all 0.3s ease;
    border-radius: 6px;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    }
  }

  .el-button--success {
    background: linear-gradient(145deg, #189a51, #13773d);
    border-color: #1a8f4b;
  }
  .el-button--danger {
    background: linear-gradient(145deg, #c53d41, #a32b2e);
    border-color: #b83438;
  }
  .el-button--warning {
    background: linear-gradient(145deg, #e38c15, #b86f0d);
    border-color: #d18111;
  }
}
</style>
