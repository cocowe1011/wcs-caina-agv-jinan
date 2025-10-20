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
              <!-- 三楼灌装线2803 -->
              <div class="marker-with-panel" data-x="520" data-y="840">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-left', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>三楼灌装线2803</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 三楼灌装线2804 -->
              <div class="marker-with-panel" data-x="2980" data-y="850">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-right', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>三楼灌装线2804</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 一楼灌装线2802 -->
              <div class="marker-with-panel" data-x="600" data-y="1020">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-bottom', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>一楼灌装线2802</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">产品名称：</span>
                      <span>{{ '--' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 一楼灌装线2801 -->
              <div class="marker-with-panel" data-x="2980" data-y="1030">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-bottom', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>一楼灌装线2801</span>
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
              <div class="marker-with-button" data-x="670" data-y="380">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('z', 'z队列-空托盘缓存区')"
                >
                  空托
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
                  :class="[
                    'arm-label',
                    { 'has-pallet': armHasPallet(arm.name) }
                  ]"
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
                      <span class="data-panel-label">产品描述：</span>
                      <span>{{ arm.currentDesc || '暂无' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 机械臂 -->
              <!-- 三楼流动箭头 -->
              <div
                v-for="(arrow, index) in thirdFloorArrows"
                :key="'third-floor-' + index"
                v-show="
                  (arrow.line === 'A' && robotStatus.bit10 === '1') ||
                  (arrow.line === 'B' && robotStatus.bit11 === '1')
                "
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
                v-show="
                  (arrow.line === 'A' && robotStatus2.bit10 === '1') ||
                  (arrow.line === 'B' && robotStatus2.bit11 === '1')
                "
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
              <div class="robot-status-indicators" data-x="1330" data-y="730">
                <div
                  class="robot-indicator"
                  @click="toggleRobotIndicator('robot1')"
                >
                  <div
                    class="status-light"
                    :class="{
                      'light-green': conveyorStatus.bit14 === '1',
                      'light-yellow-flash': conveyorStatus.bit14 === '0'
                    }"
                  ></div>
                  <span class="robot-label">1#</span>
                </div>
              </div>

              <!-- 2#机器人状态指示灯 -->
              <div class="robot-status-indicators" data-x="1330" data-y="1100">
                <div
                  class="robot-indicator"
                  @click="toggleRobotIndicator('robot2')"
                >
                  <div
                    class="status-light"
                    :class="{
                      'light-green': conveyorStatus.bit15 === '1',
                      'light-yellow-flash': conveyorStatus.bit15 === '0'
                    }"
                  ></div>
                  <span class="robot-label">2#</span>
                </div>
              </div>

              <!-- 拆垛线控制按钮 -->
              <div class="control-button-group" data-x="50" data-y="1400">
                <div class="control-panel-title">
                  <i class="el-icon-share" style="margin-right: 5px"></i
                  >机械手控制操作
                </div>
                <button
                  class="el-button el-button--success el-button--mini"
                  :class="{ 'button-pressed': buttonStates['1-start'] }"
                  @mousedown="controlLinePress(1, 'start')"
                  @mouseup="controlLineRelease(1, 'start')"
                  @mouseleave="controlLineRelease(1, 'start')"
                >
                  {{ buttonStates['1-start'] ? '正在执行中' : '1# 机械手启动' }}
                </button>
                <button
                  class="el-button el-button--success el-button--mini"
                  :class="{ 'button-pressed': buttonStates['2-start'] }"
                  @mousedown="controlLinePress(2, 'start')"
                  @mouseup="controlLineRelease(2, 'start')"
                  @mouseleave="controlLineRelease(2, 'start')"
                >
                  {{ buttonStates['2-start'] ? '正在执行中' : '2# 机械手启动' }}
                </button>
                <button
                  class="el-button el-button--danger el-button--mini"
                  :class="{ 'button-pressed': buttonStates['1-stop'] }"
                  @mousedown="controlLinePress(1, 'stop')"
                  @mouseup="controlLineRelease(1, 'stop')"
                  @mouseleave="controlLineRelease(1, 'stop')"
                >
                  {{ buttonStates['1-stop'] ? '正在执行中' : '1# 机械手停止' }}
                </button>
                <button
                  class="el-button el-button--danger el-button--mini"
                  :class="{ 'button-pressed': buttonStates['2-stop'] }"
                  @mousedown="controlLinePress(2, 'stop')"
                  @mouseup="controlLineRelease(2, 'stop')"
                  @mouseleave="controlLineRelease(2, 'stop')"
                >
                  {{ buttonStates['2-stop'] ? '正在执行中' : '2# 机械手停止' }}
                </button>
                <button
                  class="el-button el-button--warning el-button--mini"
                  :class="{ 'button-pressed': buttonStates['1-reset'] }"
                  @mousedown="controlLinePress(1, 'reset')"
                  @mouseup="controlLineRelease(1, 'reset')"
                  @mouseleave="controlLineRelease(1, 'reset')"
                >
                  {{ buttonStates['1-reset'] ? '正在执行中' : '1# 机械手复位' }}
                </button>
                <button
                  class="el-button el-button--warning el-button--mini"
                  :class="{ 'button-pressed': buttonStates['2-reset'] }"
                  @mousedown="controlLinePress(2, 'reset')"
                  @mouseup="controlLineRelease(2, 'reset')"
                  @mouseleave="controlLineRelease(2, 'reset')"
                >
                  {{ buttonStates['2-reset'] ? '正在执行中' : '2# 机械手复位' }}
                </button>
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
              ><el-tag
                v-if="item.trayStatus === '23'"
                size="small"
                style="margin-left: 15px"
                >等待AGV取货（送往机械臂）</el-tag
              ><el-tag
                v-if="item.trayStatus === '24'"
                size="small"
                type="warning"
                style="margin-left: 15px"
                >已在缓存区取货，正运往机械臂</el-tag
              ><el-tag
                v-if="item.trayStatus === '16'"
                size="small"
                type="warning"
                style="margin-left: 15px"
                >空托盘区等待AGV取货</el-tag
              ><el-tag
                v-if="item.trayStatus === '17'"
                size="small"
                type="warning"
                style="margin-left: 15px"
                >空托盘区已取货，正运往C区</el-tag
              >
              <el-tag
                v-if="item.trayStatus === '18'"
                size="small"
                type="warning"
                style="margin-left: 15px"
                >空托盘或者隔板已经送到目的地</el-tag
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
                    <span class="value"
                      >{{ item.trayInfo }}{{ '（' + item.mudidi + '）' }}</span
                    >
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

        <!-- 机器人位置缺货信号测试 -->
        <div class="test-section">
          <h3>机器人位置缺货信号测试</h3>
          <div class="test-form">
            <el-form label-width="70px" size="small">
              <el-form-item label="1#机器人">
                <el-button-group>
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(1, 'a')"
                    >A位置缺货</el-button
                  >
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(1, 'b')"
                    >B位置缺货</el-button
                  >
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(1, 'd')"
                    >D位置缺货</el-button
                  >
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(1, 'e')"
                    >E位置缺货</el-button
                  >
                </el-button-group>
              </el-form-item>
              <el-form-item label="2#机器人">
                <el-button-group>
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(2, 'a')"
                    >A位置缺货</el-button
                  >
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(2, 'b')"
                    >B位置缺货</el-button
                  >
                  <el-button
                    type="warning"
                    size="mini"
                    @click="simulateRobotShortage(2, 'd')"
                    >D位置缺货</el-button
                  >
                </el-button-group>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 机器人位置清理信号测试 -->
        <div class="test-section">
          <h3>机器人位置清理信号测试</h3>
          <div class="test-form">
            <el-form label-width="70px" size="small">
              <el-form-item label="1#机器人">
                <el-button-group>
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(1, 'a')"
                    >A位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(1, 'b')"
                    >B位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(1, 'd')"
                    >D位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(1, 'e')"
                    >E位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateDebrisClear(1, 'c')"
                    >C位置杂物清理</el-button
                  >
                </el-button-group>
              </el-form-item>
              <el-form-item label="2#机器人">
                <el-button-group>
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(2, 'a')"
                    >A位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(2, 'b')"
                    >B位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateEmptyPalletClear(2, 'd')"
                    >D位置空托盘清理</el-button
                  >
                  <el-button
                    type="info"
                    size="mini"
                    @click="simulateDebrisClear(2, 'c')"
                    >C位置杂物清理</el-button
                  >
                </el-button-group>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 输送线信号测试 -->
        <div class="test-section">
          <h3>输送线信号测试</h3>
          <div class="test-form">
            <el-form label-width="70px" size="small">
              <el-form-item label="三楼A线">
                <el-button
                  type="primary"
                  size="small"
                  @click="toggleConveyorSignal('third', 'A')"
                  :class="{ 'is-active': robotStatus.bit10 === '1' }"
                >
                  {{ robotStatus.bit10 === '1' ? '停止' : '启动' }}
                </el-button>
              </el-form-item>
              <el-form-item label="三楼B线">
                <el-button
                  type="primary"
                  size="small"
                  @click="toggleConveyorSignal('third', 'B')"
                  :class="{ 'is-active': robotStatus.bit11 === '1' }"
                >
                  {{ robotStatus.bit11 === '1' ? '停止' : '启动' }}
                </el-button>
              </el-form-item>
              <el-form-item label="一楼A线">
                <el-button
                  type="primary"
                  size="small"
                  @click="toggleConveyorSignal('first', 'A')"
                  :class="{ 'is-active': robotStatus2.bit10 === '1' }"
                >
                  {{ robotStatus2.bit10 === '1' ? '停止' : '启动' }}
                </el-button>
              </el-form-item>
              <el-form-item label="一楼B线">
                <el-button
                  type="primary"
                  size="small"
                  @click="toggleConveyorSignal('first', 'B')"
                  :class="{ 'is-active': robotStatus2.bit11 === '1' }"
                >
                  {{ robotStatus2.bit11 === '1' ? '停止' : '启动' }}
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- AGV点位绑定/解绑测试 -->
        <div class="test-section">
          <h3>AGV点位绑定/解绑</h3>
          <div class="test-form">
            <el-form label-width="70px" size="small">
              <el-form-item label="站点代码">
                <el-input
                  v-model="agvBindStationId"
                  placeholder="输入站点代码"
                  clearable
                ></el-input>
              </el-form-item>
              <el-form-item>
                <div style="display: flex; gap: 8px">
                  <el-button
                    type="success"
                    size="small"
                    @click="bindAgvStation"
                    :loading="agvBindLoading"
                    style="flex: 1"
                  >
                    绑定
                  </el-button>
                  <el-button
                    type="warning"
                    size="small"
                    @click="unbindAgvStation"
                    :loading="agvBindLoading"
                    style="flex: 1"
                  >
                    解绑
                  </el-button>
                </div>
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
        {
          x: 1065,
          y: 457,
          width: 230,
          rotation: 180,
          arrowCount: 7,
          line: 'A'
        }, // 三楼A
        { x: 822, y: 635, width: 180, rotation: 95, arrowCount: 6, line: 'A' }, // 三楼A
        { x: 1565, y: 575, width: 180, rotation: 0, arrowCount: 6, line: 'B' }, // 三楼B
        { x: 2430, y: 606, width: 280, rotation: 0, arrowCount: 8, line: 'B' }, // 三楼B
        { x: 2790, y: 777, width: 60, rotation: 5, arrowCount: 4, line: 'B' }, // 三楼B
        { x: 2707, y: 685, width: 70, rotation: 85, arrowCount: 4, line: 'B' } // 三楼B
      ],
      // 一楼流动箭头配置
      firstFloorArrows: [
        {
          x: 1050,
          y: 1053,
          width: 220,
          rotation: 180,
          arrowCount: 7,
          line: 'A'
        }, // 一楼A
        { x: 800, y: 990, width: 100, rotation: 225, arrowCount: 4, line: 'A' }, // 一楼A
        { x: 2050, y: 658, width: 550, rotation: 0, arrowCount: 15, line: 'B' }, // 一楼B
        {
          x: 1453,
          y: 841,
          width: 130,
          rotation: 270,
          arrowCount: 5,
          line: 'B'
        }, // 一楼B
        { x: 2653, y: 790, width: 90, rotation: 90, arrowCount: 4, line: 'B' }, // 一楼B
        { x: 2780, y: 926, width: 60, rotation: 0, arrowCount: 3, line: 'B' } // 一楼B
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
      // 机器人区域固定ID映射
      robotAreaIdMap: {
        a1: 602,
        b1: 603,
        c1: 604,
        d1: 605,
        e1: 606,
        a2: 607,
        b2: 608,
        c2: 609,
        d2: 610,
        e2: 611
      },
      // 机械臂点位到站点ID的映射
      stationIdMap: {
        a1: '11',
        b1: '12',
        c1: '13',
        d1: '14',
        e1: '15',
        a2: '21',
        b2: '22',
        c2: '23',
        d2: '24'
      },
      // 跟踪DBW102的当前值
      currentDBW102Value: 0,
      // 按钮按下状态管理
      buttonStates: {
        '1-start': false,
        '1-stop': false,
        '1-reset': false,
        '2-start': false,
        '2-stop': false,
        '2-reset': false
      },
      mechanicalArms: [
        {
          name: 'a1',
          x: 1285,
          y: 625,

          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'top-left'
        },
        {
          name: 'b1',
          x: 1220,
          y: 558,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'top-right'
        },
        {
          name: 'c1',
          x: 1363,
          y: 635,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'left'
        },
        {
          name: 'd1',
          x: 1300,
          y: 415,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'bottom-left'
        },
        {
          name: 'e1',
          x: 1450,
          y: 500,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'bottom-right'
        },
        {
          name: 'a2',
          x: 1300,
          y: 853,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'top-left'
        },
        {
          name: 'b2',
          x: 1387,
          y: 858,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'top-right'
        },
        {
          name: 'c2',
          x: 1226,
          y: 930,
          status: 0,
          currentPallet: null,
          position: 'left'
        },
        {
          name: 'd2',
          x: 1226,
          y: 1010,
          status: 0,
          currentPallet: null,
          currentDesc: null,
          position: 'bottom-left'
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
        { name: '三楼灌装线2803', plan: 0, completed: 0 },
        { name: '三楼灌装线2804', plan: 0, completed: 0 },
        { name: '一楼灌装线2802', plan: 0, completed: 0 },
        { name: '一楼灌装线2801', plan: 0, completed: 0 }
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
      // AGV绑定解绑测试相关
      agvBindStationId: '',
      agvBindLoading: false,
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
      this.conveyorStatus.bit10 = getBit(word2, 2); // 1#机器人暂停中信号（AGV送货暂停、门安全暂停）
      this.conveyorStatus.bit11 = getBit(word2, 3); // 2#机器人暂停中信号（AGV送货暂停、门安全暂停）
      this.conveyorStatus.bit12 = getBit(word2, 4); // 1#机器人安全门被打开（信号为1时，不能复位暂停）
      this.conveyorStatus.bit13 = getBit(word2, 5); // 2#机器人安全门被打开（信号为1时，不能复位暂停）
      this.conveyorStatus.bit14 = getBit(word2, 6); // 1#拆垛线机器人启动中
      this.conveyorStatus.bit15 = getBit(word2, 7); // 2#拆垛线机器人启动中

      // 1#机器人状态
      let word4 = this.convertToWord(values.DBW4);
      this.robotStatus.bit0 = getBit(word4, 8); // 值为1时，2#机器人A缺货
      this.robotStatus.bit1 = getBit(word4, 9); // 值为1时，2#机器人A需要清理空托盘
      this.robotStatus.bit2 = getBit(word4, 10); // 值为1时，2#机器人B缺货
      this.robotStatus.bit3 = getBit(word4, 11); // 值为1时，2#机器人B需要清理空托盘
      this.robotStatus.bit4 = getBit(word4, 12); // 值为1时，2#机器人C缺货
      this.robotStatus.bit5 = getBit(word4, 13); // 值为1时，2#机器人C需要清理杂物托盘
      this.robotStatus.bit6 = getBit(word4, 14); // 值为1时，2#机器人D缺货
      this.robotStatus.bit7 = getBit(word4, 15); // 值为1时，2#机器人D需要清理托盘
      this.robotStatus.bit8 = getBit(word4, 0); // 值为1时，2#机器人E缺货
      this.robotStatus.bit9 = getBit(word4, 1); // 值为1时，2#机器人E需要清理托盘
      this.robotStatus.bit10 = getBit(word4, 2); // 值为1时，去三楼灌装车间A输送线启动中
      this.robotStatus.bit11 = getBit(word4, 3); // 值为1时，去三楼灌装车间B输送线启动中

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
      this.robotStatus2.bit10 = getBit(word6, 2); // 值为1时，去一楼灌装车间A输送线启动中
      this.robotStatus2.bit11 = getBit(word6, 3); // 值为1时，去一楼灌装车间B输送线启动中

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
          if (
            !this.twoEightHundredPalletCode ||
            this.twoEightHundredPalletCode === '' ||
            this.twoEightHundredPalletCode.toLowerCase().includes('noread')
          ) {
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
    },
    // 监听1#机器人A位置缺货
    'robotStatus.bit0': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人A位置缺货');
          await this.handleRobotShortage(1, 'a');
        }
      }
    },
    // 监听1#机器人B位置缺货
    'robotStatus.bit2': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人B位置缺货');
          await this.handleRobotShortage(1, 'b');
        }
      }
    },
    // 监听1#机器人D位置缺货
    'robotStatus.bit6': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人D位置缺货');
          await this.handleRobotShortage(1, 'd');
        }
      }
    },
    // 监听1#机器人E位置缺货
    'robotStatus.bit8': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人E位置缺货');
          await this.handleRobotShortage(1, 'e');
        }
      }
    },
    // 监听2#机器人A位置缺货
    'robotStatus2.bit0': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人A位置缺货');
          await this.handleRobotShortage(2, 'a');
        }
      }
    },
    // 监听2#机器人B位置缺货
    'robotStatus2.bit2': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人B位置缺货');
          await this.handleRobotShortage(2, 'b');
        }
      }
    },
    // 监听2#机器人D位置缺货
    'robotStatus2.bit6': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人D位置缺货');
          await this.handleRobotShortage(2, 'd');
        }
      }
    },
    // 监听1#机器人A位置空托盘清理信号
    'robotStatus.bit1': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人A位置需要清理空托盘');
          await this.handleEmptyPalletClear('a1', 1);
        }
      }
    },
    // 监听1#机器人B位置空托盘清理信号
    'robotStatus.bit3': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人B位置需要清理空托盘');
          await this.handleEmptyPalletClear('b1', 1);
        }
      }
    },
    // 监听1#机器人D位置空托盘清理信号
    'robotStatus.bit7': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人D位置需要清理空托盘');
          await this.handleEmptyPalletClear('d1', 1);
        }
      }
    },
    // 监听1#机器人E位置空托盘清理信号
    'robotStatus.bit9': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人E位置需要清理空托盘');
          await this.handleEmptyPalletClear('e1', 1);
        }
      }
    },
    // 监听2#机器人A位置空托盘清理信号
    'robotStatus2.bit1': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人A位置需要清理空托盘');
          await this.handleEmptyPalletClear('a2', 2);
        }
      }
    },
    // 监听2#机器人B位置空托盘清理信号
    'robotStatus2.bit3': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人B位置需要清理空托盘');
          await this.handleEmptyPalletClear('b2', 2);
        }
      }
    },
    // 监听2#机器人D位置空托盘清理信号
    'robotStatus2.bit7': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人D位置需要清理空托盘');
          await this.handleEmptyPalletClear('d2', 2);
        }
      }
    },
    // 监听1#机器人C位置杂物托盘清理信号
    'robotStatus.bit5': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到1#机器人C位置需要清理杂物托盘');
          await this.handleDebrisClear('c1', 1);
        }
      }
    },
    // 监听2#机器人C位置杂物托盘清理信号
    'robotStatus2.bit5': {
      async handler(newVal, oldVal) {
        if (newVal === '1' && oldVal === '0') {
          this.addLog('检测到2#机器人C位置需要清理杂物托盘');
          await this.handleDebrisClear('c2', 2);
        }
      }
    }
  },
  methods: {
    handleRemoveFromAGVQueue(position) {
      // 仅用于 AGV2-2 / AGV2-3 队列的"真删"操作：只删除，不做其他动作
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

          // 先调用AGV解绑接口（AGV2-2对应201，AGV2-3对应301），先去掉吧，这里是否需要对接还不一定
          // const slotCode = queueName === 'AGV2-2' ? '201' : '301';
          // const unbindSuccess = await this.sendAgvUnbindCommand(slotCode);

          // if (!unbindSuccess) {
          //   this.$message.warning('AGV解绑失败，但将继续删除托盘');
          // }

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
        const trayList = res.data.filter(
          (item) =>
            item.trayStatus === '5' ||
            item.trayStatus === '18' ||
            item.trayStatus === '19'
        );
        if (trayList && trayList.length > 0) {
          // 输出日志
          this.addLog(`${queueName}托盘出库信息：${JSON.stringify(trayList)}`);
          // 调用AGV过来运货
          // 如果targetPosition不是D*，则默认D1
          const targetPosition =
            trayList[0].targetPosition &&
            trayList[0].targetPosition.startsWith('D')
              ? trayList[0].targetPosition
              : 'D1';

          const robotTaskCode = await this.sendAgvCommand(
            'PF-FMR-COMMON-JH4',
            fromCode,
            targetPosition
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
                    `已给${queueName}目的地：${targetPosition}，发送AGV运输任务`
                  );
                } else {
                  this.addLog(
                    `给${queueName}目的地：${targetPosition}，发送AGV运输任务失败`
                  );
                }
              })
              .catch((err) => {
                this.addLog(
                  `给${queueName}目的地：${targetPosition}，发送AGV运输任务失败：${err.message}`
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
        .then(async () => {
          // 先调用AGV解绑接口
          const slotCode = position.queueName + position.queueNum;
          const unbindSuccess = await this.sendAgvUnbindCommand(slotCode);

          if (!unbindSuccess) {
            this.$message.warning('AGV解绑失败，但将继续移除托盘');
          }

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
    // 切换输送线信号
    toggleConveyorSignal(floor, line) {
      const floorName = floor === 'third' ? '三楼' : '一楼';
      const lineName = line === 'A' ? 'A线' : 'B线';

      if (floor === 'third') {
        if (line === 'A') {
          // 切换三楼A线状态
          this.robotStatus.bit10 = this.robotStatus.bit10 === '1' ? '0' : '1';
          this.addLog(
            `${floorName}${lineName}输送线状态切换为：${
              this.robotStatus.bit10 === '1' ? '启动中' : '停止'
            }`
          );
        } else {
          // 切换三楼B线状态
          this.robotStatus.bit11 = this.robotStatus.bit11 === '1' ? '0' : '1';
          this.addLog(
            `${floorName}${lineName}输送线状态切换为：${
              this.robotStatus.bit11 === '1' ? '启动中' : '停止'
            }`
          );
        }
      } else {
        if (line === 'A') {
          // 切换一楼A线状态
          this.robotStatus2.bit10 = this.robotStatus2.bit10 === '1' ? '0' : '1';
          this.addLog(
            `${floorName}${lineName}输送线状态切换为：${
              this.robotStatus2.bit10 === '1' ? '启动中' : '停止'
            }`
          );
        } else {
          // 切换一楼B线状态
          this.robotStatus2.bit11 = this.robotStatus2.bit11 === '1' ? '0' : '1';
          this.addLog(
            `${floorName}${lineName}输送线状态切换为：${
              this.robotStatus2.bit11 === '1' ? '启动中' : '停止'
            }`
          );
        }
      }
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
      // 如果wmsInfo.mudidi为'2800-2801'、'2800-2802'、'2800-2803'、'2800-2804'，进入A队列
      // 如果没有上面，则return 并输出日志
      let queueName = '';
      if (wmsInfo.mudidi === '2800-1') {
        queueName = 'C';
      } else if (wmsInfo.mudidi === '2800-2') {
        queueName = 'A';
      } else if (wmsInfo.mudidi === '2800-3') {
        queueName = 'B';
      } else if (
        wmsInfo.mudidi === '2800-2801' ||
        wmsInfo.mudidi === '2800-2802' ||
        wmsInfo.mudidi === '2800-2803' ||
        wmsInfo.mudidi === '2800-2804'
      ) {
        queueName = 'A';
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
                  trayInfoAdd: wmsInfo.descrC,
                  mudidi: wmsInfo.mudidi
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
    // 处理机器人缺货自动调度
    async handleRobotShortage(robotNum, position) {
      try {
        // 目标机械臂位置
        let targetPosition = position + robotNum;

        // 检查机械手队列是否已锁定
        const robotQueueRes = await HttpUtil.post(
          '/queue_info/queryQueueList',
          {
            id: this.robotAreaIdMap[targetPosition]
          }
        );

        if (robotQueueRes.data && robotQueueRes.data.length > 0) {
          const robotQueue = robotQueueRes.data[0];
          if (robotQueue.isLock === '1') {
            this.addLog(
              `${robotNum}#机器人${position.toUpperCase()}位置队列已锁定，跳过缺货处理`
            );
            return;
          }
        }

        // 根据目的地与机械臂位置的对照关系选择允许的目的地
        const destinationByArm = {
          a2: ['2800-2801'],
          b2: ['2800-2801'],
          d2: ['2800-2802'],
          a1: ['2800-2803'],
          b1: ['2800-2803'],
          d1: ['2800-2804'],
          e1: ['2800-2804']
        };
        const allowedDestinations = destinationByArm[targetPosition] || [];

        this.addLog(
          `开始为${robotNum}#机器人${position.toUpperCase()}位置（${targetPosition}）查找目的地为${
            allowedDestinations.join('或') || '无匹配目的地'
          }且状态为2的托盘`
        );

        // 查询A队列的所有托盘
        const res = await HttpUtil.post('/queue_info/queryQueueList', {
          queueName: 'A'
        });

        if (res.data && res.data.length > 0) {
          // 查找目的地匹配且状态为'2'（已送至2楼缓存区）的托盘
          const matchedPallet = res.data.find(
            (item) =>
              item.trayInfo &&
              item.trayInfo !== '' &&
              item.trayStatus === '2' &&
              allowedDestinations.includes(item.mudidi)
          );

          if (matchedPallet) {
            this.addLog(
              `找到匹配托盘：${matchedPallet.trayInfo}，目的地：${matchedPallet.mudidi}，准备发送AGV送货任务`
            );

            this.addLog(
              `AGV目标位置：${targetPosition}（${robotNum}#机器人${position.toUpperCase()}位置）`
            );

            // 获取目标机器人区域的固定ID
            const targetId = this.robotAreaIdMap[targetPosition];

            // 发送AGV送货指令
            const robotTaskCode = await this.sendAgvCommand(
              'PF-FMR-COMMON-JH2',
              matchedPallet.queueName + matchedPallet.queueNum,
              this.convertToStationId(targetPosition)
            );

            if (robotTaskCode !== '') {
              // 同时更新托盘状态和锁定机械手队列
              const params = [
                {
                  id: matchedPallet.id,
                  trayStatus: '23',
                  robotTaskCode,
                  targetPosition: targetPosition,
                  targetId: targetId // 目的地的id
                },
                {
                  id: targetId, // 给目标机械手位置上锁
                  isLock: '1'
                }
              ];

              await HttpUtil.post('/queue_info/updateByList', params)
                .then(() => {
                  this.addLog(
                    `已为${robotNum}#机器人${position.toUpperCase()}位置发送AGV送货任务，托盘：${
                      matchedPallet.trayInfo
                    }，并锁定机械手队列`
                  );
                  this.$message.success(
                    `已为${robotNum}#机器人${position.toUpperCase()}位置自动调度托盘${
                      matchedPallet.trayInfo
                    }`
                  );
                })
                .catch((err) => {
                  this.addLog(
                    `为${robotNum}#机器人${position.toUpperCase()}位置发送AGV送货任务失败：${
                      err.message
                    }`
                  );
                });
            }
          } else {
            this.addLog(
              `A队列中未找到目的地为${allowedDestinations.join('或')}的可用托盘`
            );
            this.$message.warning(
              `${robotNum}#机器人${position.toUpperCase()}位置缺货，但A队列中无匹配托盘`
            );
          }
        } else {
          this.addLog(
            `A队列为空，无法为${robotNum}#机器人${position.toUpperCase()}位置补货`
          );
        }
      } catch (err) {
        console.error('处理机器人缺货失败:', err);
        this.addLog(
          `处理${robotNum}#机器人${position.toUpperCase()}位置缺货失败：${
            err.message || '未知错误'
          }`
        );
      }
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
    armHasPallet(armName) {
      const arm = this.mechanicalArms.find(
        (m) => m.name.toLowerCase() === armName.toLowerCase()
      );
      return !!(arm && arm.currentPallet);
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
      ipcRenderer.send('writeLogToLocal', logMessage, '2800');
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
      } else if (
        this.agvSchedule.startPosition.startsWith('A') &&
        ['a1', 'a2', 'b1', 'b2', 'd1', 'd2', 'e1', 'c1', 'c2'].includes(
          this.agvSchedule.endPosition
        )
      ) {
        // A区到机械臂（PF-FMR-COMMON-JH2）
        taskType = 'PF-FMR-COMMON-JH2';
        fromSiteCode = this.agvSchedule.startPosition;
        toSiteCode = this.convertToStationId(this.agvSchedule.endPosition);
        this.agvSchedule.status = 'singleRunning';

        // 发送时判断队列数据，如果有队列数据则一起处理
        await this.handleAgvSendWithQueueCheck(
          taskType,
          fromSiteCode,
          toSiteCode,
          this.agvSchedule.endPosition
        );
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
                        targetPosition: toSiteCode, // 目的地
                        targetId: res.data[0].id // 目的地的id
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
    // 将机械臂点位转换为站点ID的辅助方法
    convertToStationId(siteCode) {
      // 检查是否是机械臂点位（a1, b1, c1, d1, e1, a2, b2, c2, d2）
      const lowerSiteCode = siteCode.toLowerCase();
      if (this.stationIdMap[lowerSiteCode]) {
        return this.stationIdMap[lowerSiteCode];
      }
      return siteCode; // 如果不是机械臂点位，返回原始值
    },
    async sendAgvCommand(taskType, fromSiteCode, toSiteCode) {
      // 测试用，返回当前时间戳
      // this.addLog(
      //   `发送AGV指令: 类型=${taskType}, 起点=${fromSiteCode}, 终点=${toSiteCode}`
      // );
      // return Date.now().toString();
      // 组装入参;
      // 特殊处理PF - FMR - COMMON - JH6任务类型;
      let params;
      if (taskType === 'PF-FMR-COMMON-JH6') {
        params = {
          taskType: taskType,
          targetRoute: [
            {
              type: 'MIX_CONDITION',
              code: `[{"type":"SITE","code":"${fromSiteCode}"},{"type":"PILE_COUNT","code":"4"}]`
            },
            {
              type: 'SITE',
              code: toSiteCode
            }
          ]
        };
      } else {
        // 其他任务类型的标准格式
        params = {
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
      }
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
          // 同步各机械臂位置信息（a1、b1、d1、e1、a2、b2、d2：取该队列第一个有托盘的记录）
          const armAreas = ['a1', 'b1', 'd1', 'e1', 'a2', 'b2', 'd2'];
          armAreas.forEach((area) => {
            const list = res.data
              .filter((x) => x.queueName + x.queueNum == area)
              .sort((a, b) => (a.queueNum || 0) - (b.queueNum || 0));
            const firstWithPallet = list.find(
              (x) => x.trayInfo && x.trayInfo !== ''
            );
            const idx = this.mechanicalArms.findIndex(
              (m) => m.name.toLowerCase() == area
            );
            if (idx !== -1) {
              this.$set(
                this.mechanicalArms[idx],
                'currentPallet',
                firstWithPallet ? firstWithPallet.trayInfo : null
              );
              this.$set(
                this.mechanicalArms[idx],
                'currentDesc',
                firstWithPallet ? firstWithPallet.trayInfoAdd : null
              );
            }
          });
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

          // 处理机械臂队列状态为25的托盘（已送至机械臂目的地，需发送送货完成信号）
          this.handleStatus25RobotPallets(res.data);

          // 处理z队列状态为13的托盘（已送至空托盘区域，需发送清理完成信号）
          this.handleStatus13EmptyPallets(res.data);

          // 处理z队列状态为15的托盘（空托盘区域集满，需发送到AGV2-2输送线）
          this.handleFullEmptyPalletArea(res.data);

          // 处理z队列状态为18的托盘（空托盘已送至输送线，插入AGV2-2队列）
          const status18PalletsZ = res.data.filter(
            (item) => item.trayStatus === '18' && item.queueName === 'z'
          );
          if (status18PalletsZ.length > 0) {
            this.insertPalletToAGV(status18PalletsZ, 'AGV2-2');
          }

          // 处理机械臂c1/c2队列状态为19的托盘（杂物托盘已送至输送线，插入AGV2-2队列并发送清理完成信号）
          this.handleStatus19DebrisPallets(res.data);
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
              // 先写入控制按钮值1
              ipcRenderer.send('writeSingleValueToPLC', 'DBW106_BIT5', true);
              // 2秒后取消写入
              setTimeout(() => {
                ipcRenderer.send('writeSingleValueToPLC', 'DBW106_BIT5', false);
              }, 2000);
            } else if (queueName === 'AGV2-3') {
              // 先写入控制按钮值1
              ipcRenderer.send('writeSingleValueToPLC', 'DBW106_BIT4', true);
              // 2秒后取消写入
              setTimeout(() => {
                ipcRenderer.send('writeSingleValueToPLC', 'DBW106_BIT4', false);
              }, 2000);
            }
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

    // 处理机械臂队列状态为25的托盘（已送至机械臂目的地，发送送货完成信号）
    handleStatus25RobotPallets(allData) {
      // 定义机械臂队列与PLC送货完成命令的映射关系
      const robotMapping = {
        a1: { robot: 1, completeCmd: 'DBW102_BIT0' },
        b1: { robot: 1, completeCmd: 'DBW102_BIT2' },
        d1: { robot: 1, completeCmd: 'DBW102_BIT6' },
        e1: { robot: 1, completeCmd: 'DBW102_BIT8' },
        a2: { robot: 2, completeCmd: 'DBW104_BIT0' },
        b2: { robot: 2, completeCmd: 'DBW104_BIT2' },
        d2: { robot: 2, completeCmd: 'DBW104_BIT6' },
        e2: { robot: 2, completeCmd: 'DBW104_BIT8' }
      };

      // 过滤出状态为25的机械臂队列托盘（只包括a/b/d/e机械手位置）
      const status25Pallets = allData.filter(
        (item) =>
          item.trayStatus === '25' &&
          robotMapping[item.queueName.toLowerCase() + item.queueNum]
      );

      status25Pallets.forEach((pallet) => {
        const queueKey = pallet.queueName.toLowerCase() + pallet.queueNum;
        const mapping = robotMapping[queueKey];

        if (mapping) {
          // 发送送货完成信号，持续2秒
          ipcRenderer.send('writeSingleValueToPLC', mapping.completeCmd, true);
          setTimeout(() => {
            ipcRenderer.send(
              'writeSingleValueToPLC',
              mapping.completeCmd,
              false
            );
          }, 2000);

          this.addLog(
            `检测到托盘${pallet.trayInfo}在${pallet.queueName}${pallet.queueNum}位置送货完成（状态25），已发送机器人${mapping.robot}送货完成信号。`
          );

          // 更新托盘状态为10（已发送送货完成指令）并解除机械手队列锁定状态
          const param = {
            id: pallet.id,
            trayStatus: '10',
            isLock: ''
          };
          HttpUtil.post('/queue_info/update', param)
            .then((res) => {
              if (res.data == 1) {
                this.addLog(
                  `托盘${pallet.trayInfo}状态已更新为10（已发送送货完成指令），机械手队列${pallet.queueName}${pallet.queueNum}锁定状态已解除。`
                );
              }
            })
            .catch((err) => {
              this.addLog(`托盘${pallet.trayInfo}状态更新失败：${err}`);
            });
        }
      });
    },

    // 处理z队列状态为13的托盘（已送至空托盘区域，发送清理完成信号）
    handleStatus13EmptyPallets(allData) {
      // 过滤出z队列状态为13的托盘
      const status13Pallets = allData.filter(
        (item) => item.trayStatus === '13' && item.queueName === 'z'
      );

      status13Pallets.forEach((pallet) => {
        // 根据targetPosition确定来源位置，发送清理完成信号
        const targetId = pallet.targetId; // 例如：602, 603, 605, 606, 607, 608, 610

        if (targetId) {
          // 定义清理完成信号映射
          const clearCompleteMapping = {
            602: 'DBW102_BIT1',
            603: 'DBW102_BIT3',
            605: 'DBW102_BIT7',
            606: 'DBW102_BIT9',
            607: 'DBW104_BIT1',
            608: 'DBW104_BIT3',
            610: 'DBW104_BIT7'
          };

          const clearCmd = clearCompleteMapping[targetId];

          if (clearCmd) {
            // 发送清理完成信号，持续2秒
            ipcRenderer.send('writeSingleValueToPLC', clearCmd, true);
            setTimeout(() => {
              ipcRenderer.send('writeSingleValueToPLC', clearCmd, false);
            }, 2000);

            this.addLog(
              `检测到z${pallet.queueNum}位置空托盘已送达（状态13），来源${targetId}，已发送清理完成信号${clearCmd}。`
            );

            // 同时更新z队列托盘状态和解除z队列及源机械手位置的锁定
            const params = [
              {
                id: pallet.id,
                trayStatus: '14', // 已经给PLC发送过清理托盘完成命令
                isLock: '' // 解除z队列的锁定
              }
            ];

            // 如果找到了源机械手位置的ID，也解除其锁定
            params.push({
              id: targetId,
              isLock: '' // 解除源机械手位置的锁定
            });

            HttpUtil.post('/queue_info/updateByList', params)
              .then((res) => {
                if (res.data == 1) {
                  this.addLog(
                    `z${pallet.queueNum}状态已更新为14（已发送清理完成指令），z队列和机械手队列${targetId}锁定状态已解除。`
                  );
                }
              })
              .catch((err) => {
                this.addLog(`z${pallet.queueNum}状态更新失败：${err}`);
              });
          }
        }
      });
    },

    // 处理机械臂c1/c2队列状态为19的托盘（杂物托盘已送至输送线，插入AGV2-2队列并发送清理完成信号）
    handleStatus19DebrisPallets(allData) {
      // 定义机械臂C位置与PLC清理完成命令的映射关系
      const clearCompleteMapping = {
        604: { robot: 1, clearCmd: 'DBW102_BIT5', type: '杂物托盘' }, // C1杂物托盘清理完成
        609: { robot: 2, clearCmd: 'DBW104_BIT5', type: '杂物托盘' } // C2杂物托盘清理完成
      };

      console.log(allData);

      // 过滤出机械臂c1/c2位置状态为19的托盘
      const status19Pallets = allData.filter(
        (item) =>
          item.trayStatus === '19' && (item.id === '604' || item.id === '609') // c1和c2的固定ID
      );
      console.log(status19Pallets);

      status19Pallets.forEach((pallet) => {
        const mapping = clearCompleteMapping[pallet.id];

        if (mapping) {
          // 先插入AGV2-2队列
          this.insertPalletToAGV([pallet], 'AGV2-2');

          // 发送清理完成信号，持续2秒
          ipcRenderer.send('writeSingleValueToPLC', mapping.clearCmd, true);
          setTimeout(() => {
            ipcRenderer.send('writeSingleValueToPLC', mapping.clearCmd, false);
          }, 2000);

          this.addLog(
            `检测到托盘${pallet.trayInfo}在${pallet.queueName}${pallet.queueNum}位置已送达AGV2-2输送线（状态19），已插入AGV2-2队列并发送${mapping.clearCmd}杂物清理完成信号。`
          );

          // 更新托盘状态为14（已发送清理完成指令）并解除机械手队列锁定
          const param = {
            id: pallet.id,
            trayStatus: '14', // 已发送清理完成指令
            trayInfo: '', // 清空托盘信息
            robotTaskCode: '',
            targetPosition: '',
            trayInfoAdd: '',
            isLock: '' // 解除机械手C位置的锁定
          };

          HttpUtil.post('/queue_info/update', param)
            .then((res) => {
              if (res.data == 1) {
                this.addLog(
                  `托盘${pallet.trayInfo}状态已更新为14（已发送清理完成指令），机械手队列${pallet.queueName}${pallet.queueNum}锁定状态已解除。`
                );
              }
            })
            .catch((err) => {
              this.addLog(`托盘${pallet.trayInfo}状态更新失败：${err}`);
            });
        }
      });
    },

    // 处理空托盘区域集满（状态15），发送到AGV2-2输送线
    async handleFullEmptyPalletArea(allData) {
      // 过滤出z队列状态为15的托盘
      const status15Pallets = allData.filter(
        (item) => item.trayStatus === '15' && item.queueName === 'z'
      );

      for (const pallet of status15Pallets) {
        try {
          // 直接发送到AGV2-2输送线
          const fromSiteCode = 'z' + pallet.queueNum;
          const toSiteCode = '201'; // AGV2-2输送线站点ID

          const robotTaskCode = await this.sendAgvCommand(
            'PF-FMR-COMMON-JH6', // 空托盘区到输送线的任务类型
            fromSiteCode,
            toSiteCode
          );

          if (robotTaskCode) {
            // 更新z队列位置状态为16-空托盘处理命令已发送，正在等待AGV取货
            const param = {
              id: pallet.id,
              trayStatus: '16', // 16-空托盘处理命令已发送，正在等待AGV取货
              robotTaskCode: robotTaskCode,
              targetPosition: 'AGV2-2' // 目的地为AGV2-2输送线
            };

            HttpUtil.post('/queue_info/update', param)
              .then((updateRes) => {
                if (updateRes.data == 1) {
                  this.addLog(
                    `检测到z${pallet.queueNum}位置空托盘区域集满（状态15），已发送AGV指令到AGV2-2输送线，状态更新为16（空托盘处理命令已发送，正在等待AGV取货）。`
                  );
                }
              })
              .catch((err) => {
                this.addLog(`z队列状态更新失败：${err}`);
              });
          }
        } catch (err) {
          this.addLog(`处理z${pallet.queueNum}空托盘区域集满失败：${err}`);
        }
      }
    },

    // 处理空托盘清理
    async handleEmptyPalletClear(position, robotNum) {
      // 机械手→z区：更新源机械手位置记录
      try {
        // 获取源位置（机械臂位置）的固定ID
        const sourceId = this.robotAreaIdMap[position.toLowerCase()];

        // 检查机械手队列是否已锁定
        const robotQueueRes = await HttpUtil.post(
          '/queue_info/queryQueueList',
          {
            id: sourceId
          }
        );

        if (robotQueueRes.data && robotQueueRes.data.length > 0) {
          const robotQueue = robotQueueRes.data[0];
          if (robotQueue.isLock === '1') {
            this.addLog(
              `${robotNum}#机器人${position.toUpperCase()}位置队列已锁定，跳过空托盘清理处理`
            );
            return;
          }
        }

        // 查询z队列，找到第一个不是状态15（集满）的位置
        const res = await HttpUtil.post('/queue_info/queryQueueList', {
          queueName: 'z'
        });

        if (res.code === '200' && res.data && res.data.length > 0) {
          // 找到第一个状态不是15的位置
          const availablePosition = res.data.find(
            (item) => item.trayStatus !== '15'
          );

          if (availablePosition) {
            // 发送AGV指令：从机械臂位置到z队列位置
            const fromSiteCode = position.toUpperCase(); // 例如：A1
            const toSiteCode = 'z' + availablePosition.queueNum;

            const robotTaskCode = await this.sendAgvCommand(
              'PF-FMR-COMMON-JH5', // 机械臂到空托盘区域的任务类型
              this.convertToStationId(fromSiteCode),
              toSiteCode
            );

            if (robotTaskCode) {
              // 同时更新源机械手位置和z队列目标位置，并锁定两个位置
              const params = [
                {
                  id: sourceId, // 源机械手位置的id
                  trayStatus: '11',
                  robotTaskCode: robotTaskCode,
                  targetPosition: toSiteCode, // 目的地队列名
                  targetId: availablePosition.id, // 目的地的id
                  trayInfoAdd: `${robotNum}#机器人${position.toUpperCase()}位置空托盘`,
                  isLock: '1' // 锁定源机械手位置
                },
                {
                  id: availablePosition.id, // 目标z队列位置的id
                  isLock: '1' // 锁定目标z队列位置
                }
              ];

              HttpUtil.post('/queue_info/updateByList', params)
                .then((updateRes) => {
                  if (updateRes.data == 1) {
                    this.addLog(
                      `检测到${robotNum}#机器人${position.toUpperCase()}位置需要清理空托盘，已发送AGV指令到${toSiteCode}位置，源位置状态更新为11，机械手队列和z队列已锁定。`
                    );
                  }
                })
                .catch((err) => {
                  this.addLog(`机械手位置状态更新失败：${err}`);
                });
            }
          } else {
            this.addLog(`z队列所有位置都已集满（状态15），无法清理空托盘。`);
          }
        }
      } catch (err) {
        this.addLog(`查询z队列失败：${err}`);
      }
    },

    // 处理杂物托盘清理（C位置）
    async handleDebrisClear(position, robotNum) {
      // 机械手C→AGV2-2输送线：更新源机械手C位置记录
      try {
        // 获取源位置（机械臂C位置）的固定ID
        const sourceId = this.robotAreaIdMap[position.toLowerCase()];

        // 检查机械手队列是否已锁定
        const robotQueueRes = await HttpUtil.post(
          '/queue_info/queryQueueList',
          {
            id: sourceId
          }
        );

        if (robotQueueRes.data && robotQueueRes.data.length > 0) {
          const robotQueue = robotQueueRes.data[0];
          if (robotQueue.isLock === '1') {
            this.addLog(
              `${robotNum}#机器人${position.toUpperCase()}位置队列已锁定，跳过杂物托盘清理处理`
            );
            return;
          }
        }

        // 直接发送到AGV2-2输送线
        const fromSiteCode = position.toUpperCase(); // 例如：C1, C2
        const toSiteCode = '201'; // AGV2-2输送线站点ID

        const robotTaskCode = await this.sendAgvCommand(
          'PF-FMR-COMMON-JH20', // 机械臂到输送线的任务类型
          this.convertToStationId(fromSiteCode),
          toSiteCode
        );

        if (robotTaskCode) {
          // 更新源机械手C位置记录，状态改为8-在c1 c2等待AGV取货
          const param = {
            id: sourceId, // 源机械手C位置的id
            trayInfo: robotTaskCode, // 使用任务号作为托盘信息
            trayStatus: '8', // 8-在c1 c2等待AGV取货
            robotTaskCode: robotTaskCode,
            targetPosition: 'AGV2-2', // 目的地为AGV2-2输送线
            trayInfoAdd: `${robotNum}#机器人${position.toUpperCase()}位置杂物托盘`,
            isLock: '1' // 锁定源机械手C位置
          };

          HttpUtil.post('/queue_info/update', param)
            .then((updateRes) => {
              if (updateRes.data == 1) {
                this.addLog(
                  `检测到${robotNum}#机器人${position.toUpperCase()}位置需要清理杂物托盘，已发送AGV指令到AGV2-2输送线，源位置状态更新为8（在c1 c2等待AGV取货），机械手队列已锁定。`
                );
              }
            })
            .catch((err) => {
              this.addLog(`机械手位置状态更新失败：${err}`);
            });
        }
      } catch (err) {
        this.addLog(`杂物托盘清理失败：${err}`);
      }
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
              queueName === 'AGV2-2' ? 'DBB120' : 'DBB110',
              firstPallet.trayInfo
            );
            // 1秒后发送第二个命令
            setTimeout(() => {
              // 设置第2位为1，保留其他位
              // 修改位操作，与读取时保持一致，使用第10位（对应bit2）
              if (queueName === 'AGV2-2') {
                // 先写入控制按钮值1
                ipcRenderer.send('writeSingleValueToPLC', 'DBW106_BIT2', true);
                // 2秒后取消写入
                setTimeout(() => {
                  ipcRenderer.send(
                    'writeSingleValueToPLC',
                    'DBW106_BIT2',
                    false
                  );
                }, 2000);
              } else if (queueName === 'AGV2-3') {
                // 先写入控制按钮值1
                ipcRenderer.send('writeSingleValueToPLC', 'DBW106_BIT3', true);
                // 2秒后取消写入
                setTimeout(() => {
                  ipcRenderer.send(
                    'writeSingleValueToPLC',
                    'DBW106_BIT3',
                    false
                  );
                }, 2000);
              }
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
        // 发往1楼D的命令，起点只能是C队列
        if (!item.queueName.startsWith('C')) {
          this.$message.error('只有一楼缓存库位可以发往一楼目的地');
          return;
        }
        // 根据托盘信息给AGV小车发送指令
        this.addLog(
          `正在发送托盘 ${item.trayInfo} 至 ${destination}...先途径AGV2-2...`
        );
        // 调用发送AGV指令方法，确定任务类型和起点终点
        taskType = 'PF-FMR-COMMON-JH2'; // 假设是从缓存区到输送线
        fromSiteCode = item.queueName + item.queueNum;
        toSiteCode = '201';
      } else if (destination.startsWith('E')) {
        // 发往3楼E的命令，起点只能是B队列
        if (!item.queueName.startsWith('B')) {
          this.$message.error('只有三楼缓存库位可以发往三楼目的地');
          return;
        }
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

    // 处理AGV发送时判断队列数据的方法
    async handleAgvSendWithQueueCheck(
      taskType,
      fromSiteCode,
      toSiteCode,
      targetPosition
    ) {
      try {
        // 1. 首先查询A区的队列数据
        const aQueueRes = await HttpUtil.post('/queue_info/queryQueueList', {
          queueName: 'A'
        });

        let queueDataToProcess = null;

        if (aQueueRes.data && aQueueRes.data.length > 0) {
          // 查找匹配的队列数据
          const matchedQueueItem = aQueueRes.data.find(
            (item) =>
              item.queueName + item.queueNum === fromSiteCode &&
              item.trayInfo &&
              item.trayInfo !== '' &&
              item.trayStatus === '2' // 已送至2楼缓存区的状态
          );

          if (matchedQueueItem) {
            queueDataToProcess = matchedQueueItem;
            this.addLog(
              `找到队列数据：托盘${matchedQueueItem.trayInfo}，目的地${matchedQueueItem.mudidi}`
            );
          }
        }

        // 2. 发送AGV指令
        const robotTaskCode = await this.sendAgvCommand(
          taskType,
          fromSiteCode,
          toSiteCode
        );

        if (robotTaskCode && robotTaskCode !== '') {
          // 3. 如果有队列数据，一起处理队列数据
          if (queueDataToProcess) {
            await this.updateQueueDataWithAgvTask(
              queueDataToProcess,
              robotTaskCode,
              targetPosition
            );
          } else {
            this.addLog(`AGV指令发送成功，任务码：${robotTaskCode}`);
          }
        } else {
          this.addLog('AGV指令发送失败');
          this.$message.error('AGV指令发送失败');
        }
      } catch (error) {
        this.addLog(`处理AGV发送和队列数据时出错：${error.message}`);
        this.$message.error(`处理AGV发送和队列数据时出错：${error.message}`);
      }
    },

    // 更新队列数据与AGV任务关联
    async updateQueueDataWithAgvTask(queueItem, robotTaskCode, targetPosition) {
      try {
        // 获取目标机械臂位置的固定ID
        const targetId = this.robotAreaIdMap[targetPosition];

        if (!targetId) {
          this.addLog(`未找到目标位置${targetPosition}的ID映射`);
          return;
        }

        // 更新队列数据状态
        const updateParams = [
          {
            id: queueItem.id,
            trayStatus: '23', // 送往机械臂目的地，正在等待AGV取货
            robotTaskCode: robotTaskCode,
            targetPosition: targetPosition,
            targetId: targetId
          },
          {
            id: targetId, // 给目标机械手位置上锁
            isLock: '1'
          }
        ];

        await HttpUtil.post('/queue_info/updateByList', updateParams)
          .then((res) => {
            if (res.data == 1) {
              this.addLog(
                `已为${targetPosition}位置发送AGV送货任务，托盘：${queueItem.trayInfo}，并锁定机械手队列`
              );
              this.$message.success(
                `已为${targetPosition}位置自动调度托盘${queueItem.trayInfo}`
              );
            } else {
              this.addLog(`队列数据更新失败`);
              this.$message.error('队列数据更新失败');
            }
          })
          .catch((err) => {
            this.addLog(`队列数据更新失败：${err.message}`);
            this.$message.error(`队列数据更新失败：${err.message}`);
          });
      } catch (error) {
        this.addLog(`更新队列数据时出错：${error.message}`);
        this.$message.error(`更新队列数据时出错：${error.message}`);
      }
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
    // AGV站点绑定方法
    async bindAgvStation() {
      if (!this.agvBindStationId || this.agvBindStationId.trim() === '') {
        this.$message.warning('请输入站点代码');
        return;
      }

      // 转换站点ID（处理特殊站点）
      const convertedStationId = this.convertStationIdForAgv(
        this.agvBindStationId.trim()
      );

      this.agvBindLoading = true;
      this.addLog(
        `开始绑定AGV站点：${this.agvBindStationId} -> ${convertedStationId}`
      );

      try {
        const bindSuccess = await this.sendAgvBindCommand(convertedStationId);

        if (bindSuccess) {
          this.$message.success(`站点 ${this.agvBindStationId} 绑定成功`);
          this.addLog(
            `站点 ${this.agvBindStationId} (${convertedStationId}) 绑定成功`
          );
          this.agvBindStationId = ''; // 清空输入框
        } else {
          this.$message.error(`站点 ${this.agvBindStationId} 绑定失败`);
          this.addLog(
            `站点 ${this.agvBindStationId} (${convertedStationId}) 绑定失败`
          );
        }
      } catch (error) {
        console.error('绑定AGV站点失败:', error);
        this.$message.error(`绑定失败：${error.message || '请求异常'}`);
        this.addLog(
          `站点 ${this.agvBindStationId} (${convertedStationId}) 绑定失败：${error.message}`
        );
      } finally {
        this.agvBindLoading = false;
      }
    },
    // AGV站点解绑方法
    async unbindAgvStation() {
      if (!this.agvBindStationId || this.agvBindStationId.trim() === '') {
        this.$message.warning('请输入站点代码');
        return;
      }

      // 转换站点ID（处理特殊站点）
      const convertedStationId = this.convertStationIdForAgv(
        this.agvBindStationId.trim()
      );

      this.agvBindLoading = true;
      this.addLog(
        `开始解绑AGV站点：${this.agvBindStationId} -> ${convertedStationId}`
      );

      try {
        const unbindSuccess = await this.sendAgvUnbindCommand(
          convertedStationId
        );

        if (unbindSuccess) {
          this.$message.success(`站点 ${this.agvBindStationId} 解绑成功`);
          this.addLog(
            `站点 ${this.agvBindStationId} (${convertedStationId}) 解绑成功`
          );
          this.agvBindStationId = ''; // 清空输入框
        } else {
          this.$message.error(`站点 ${this.agvBindStationId} 解绑失败`);
          this.addLog(
            `站点 ${this.agvBindStationId} (${convertedStationId}) 解绑失败`
          );
        }
      } catch (error) {
        console.error('解绑AGV站点失败:', error);
        this.$message.error(`解绑失败：${error.message || '请求异常'}`);
        this.addLog(
          `站点 ${this.agvBindStationId} (${convertedStationId}) 解绑失败：${error.message}`
        );
      } finally {
        this.agvBindLoading = false;
      }
    },
    // 转换站点ID（处理特殊站点映射）
    convertStationIdForAgv(inputStationId) {
      // 特殊站点映射表：用户输入的站点名称 -> 站点ID
      const specialStationMap = {
        // 转盘/输送线位置（用户输入的位置名称 -> 呼叫站点ID）
        'AGV2-1': '102',
        'AGV2-2': '201',
        'AGV2-3': '301',
        'AGV5-1': '101',
        'AGV1-1': '202',
        'AGV3-1': '302',
        // 机械臂位置（只支持小写字母，用户输入 -> 站点ID）
        a1: '11',
        b1: '12',
        c1: '13',
        d1: '14',
        e1: '15',
        a2: '21',
        b2: '22',
        c2: '23',
        d2: '24'
      };

      // 直接匹配映射表（机械臂位置只接受小写）
      if (specialStationMap[inputStationId]) {
        return specialStationMap[inputStationId];
      }

      // 如果不在映射表中，直接返回原值（用户已经输入的是站点ID）
      return inputStationId;
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

      const sourceSlotCode = source.queueName + source.queueNum;
      const targetSlotCode = target.queueName + target.queueNum;

      const fieldsToHandle = [
        'trayInfo',
        'trayStatus',
        'robotTaskCode',
        'trayInfoAdd',
        'targetPosition'
      ];
      const updates = [];

      if (target.trayInfo) {
        // 情况：两个位置互换托盘，AGV只需要知道这两个位置都有托盘，不需要额外绑定/解绑
        const sourceUpdate = { id: source.id };
        const targetUpdate = { id: target.id };

        fieldsToHandle.forEach((field) => {
          sourceUpdate[field] = target[field];
          targetUpdate[field] = source[field];
        });
        updates.push(sourceUpdate, targetUpdate);
        this.addLog(
          `托盘互换：${sourceSlotCode} ↔ ${targetSlotCode}，无需AGV绑定操作`
        );
      } else {
        // 情况：源位置托盘移到空位置
        // 需要：在目标位置绑定，在源位置解绑

        // 先在目标位置绑定
        const bindSuccess = await this.sendAgvBindCommand(targetSlotCode);
        if (!bindSuccess) {
          this.$message.warning('目标位置AGV绑定失败，但将继续移动托盘');
        }

        // 再在源位置解绑
        const unbindSuccess = await this.sendAgvUnbindCommand(sourceSlotCode);
        if (!unbindSuccess) {
          this.$message.warning('源位置AGV解绑失败，但将继续移动托盘');
        }

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
            // 筛选出运行中的任务状态
            const runningTasks = res.data.filter((item) =>
              [
                '0',
                '1',
                '20',
                '21',
                '3',
                '4',
                '6',
                '7',
                '23',
                '24',
                '11',
                '12',
                '16',
                '17'
              ].includes(item.trayStatus)
            );

            // 根据楼层分类
            const floor1Tasks = runningTasks.filter(
              (item) =>
                item.queueName === 'AGV2-2' &&
                ['6', '7'].includes(item.trayStatus)
            );
            const floor2Tasks = runningTasks.filter((item) =>
              [
                '0',
                '1',
                '20',
                '21',
                '3',
                '4',
                '23',
                '24',
                '11',
                '12',
                '16',
                '17'
              ].includes(item.trayStatus)
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
            : 'AGV已在三楼AGV3-1取货，正运往目的地',
        23: '在缓存区等待AGV取货（送往机械臂）',
        24: '已在缓存区取货，正运往机械臂',
        11: '在机械臂位置等待AGV取货',
        12: 'AGV已在机械臂位置取货，正运往目的地',
        16: '在空托盘区等待AGV取货',
        17: 'AGV已在空托盘区取货，正运往C区'
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
        cancelType: 'DROP'
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
    // AGV托盘绑定
    async sendAgvBindCommand(slotCode) {
      const params = {
        carrierCategory: 'PALLET',
        carrierType: '2',
        colCount: 1,
        invoke: 'BIND',
        slotCategory: 'SITE',
        slotCode: slotCode,
        temporary: 1
      };
      this.addLog(`发送AGV绑定指令: 位置=${slotCode}`);
      try {
        const res = await HttpUtilAGV.post(
          '/rcs/rtas/api/robot/controller/site/bind',
          params
        );
        if (res.code === 'SUCCESS') {
          this.addLog(`AGV绑定成功: 位置${slotCode}`);
          return true;
        } else {
          const errorMsg = res.message || '未知错误';
          this.addLog(`AGV绑定失败: ${errorMsg}`);
          this.addLog(`AGV绑定失败: ${errorMsg}`, 'alarm');
          return false;
        }
      } catch (err) {
        console.error('发送AGV绑定指令失败:', err);
        this.addLog(`AGV绑定失败: ${err.message || '未知错误'}`);
        this.addLog(`AGV绑定失败: ${err.message || '未知错误'}`, 'alarm');
        return false;
      }
    },
    // AGV托盘解绑
    async sendAgvUnbindCommand(slotCode) {
      const params = {
        carrierCategory: 'PALLET',
        carrierType: '2',
        colCount: 1,
        invoke: 'UNBIND',
        slotCategory: 'SITE',
        slotCode: slotCode,
        temporary: 1
      };
      this.addLog(`发送AGV解绑指令: 位置=${slotCode}`);
      try {
        const res = await HttpUtilAGV.post(
          '/rcs/rtas/api/robot/controller/site/bind',
          params
        );
        if (res.code === 'SUCCESS') {
          this.addLog(`AGV解绑成功: 位置${slotCode}`);
          return true;
        } else {
          const errorMsg = res.message || '未知错误';
          this.addLog(`AGV解绑失败: ${errorMsg}`);
          this.addLog(`AGV解绑失败: ${errorMsg}`, 'alarm');
          return false;
        }
      } catch (err) {
        console.error('发送AGV解绑指令失败:', err);
        this.addLog(`AGV解绑失败: ${err.message || '未知错误'}`);
        this.addLog(`AGV解绑失败: ${err.message || '未知错误'}`, 'alarm');
        return false;
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
    // 模拟机器人位置缺货信号
    simulateRobotShortage(robotNum, position) {
      const robotStatusKey = robotNum === 1 ? 'robotStatus' : 'robotStatus2';
      const bitMap = {
        a: 'bit0',
        b: 'bit2',
        d: 'bit6',
        e: 'bit8'
      };

      const bitKey = bitMap[position];
      if (!bitKey) {
        this.$message.error('无效的位置参数');
        return;
      }

      // 模拟触发缺货信号
      this[robotStatusKey][bitKey] = '1';

      // 2秒后自动恢复
      setTimeout(() => {
        this[robotStatusKey][bitKey] = '0';
      }, 1000);
    },
    // 模拟机器人位置空托盘清理信号
    simulateEmptyPalletClear(robotNum, position) {
      const robotStatusKey = robotNum === 1 ? 'robotStatus' : 'robotStatus2';
      const bitMap = {
        a: 'bit1',
        b: 'bit3',
        d: 'bit7',
        e: 'bit9'
      };

      const bitKey = bitMap[position];
      if (!bitKey) {
        this.$message.error('无效的位置参数');
        return;
      }

      // 模拟触发空托盘清理信号
      this[robotStatusKey][bitKey] = '1';

      // 2秒后自动恢复
      setTimeout(() => {
        this[robotStatusKey][bitKey] = '0';
      }, 1000);
    },
    // 模拟机器人位置杂物清理信号
    simulateDebrisClear(robotNum, position) {
      const robotStatusKey = robotNum === 1 ? 'robotStatus' : 'robotStatus2';
      const bitKey = 'bit5'; // C位置杂物清理信号

      // 模拟触发杂物清理信号
      this[robotStatusKey][bitKey] = '1';

      // 2秒后自动恢复
      setTimeout(() => {
        this[robotStatusKey][bitKey] = '0';
      }, 1000);
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

    // 切换机器人指示灯状态（启动/暂停两种状态切换）
    toggleRobotIndicator(robotId) {
      if (robotId === 'robot1') {
        // 启动/暂停两种状态切换
        if (this.conveyorStatus.bit14 === '1') {
          // 启动中 -> 暂停中
          this.conveyorStatus.bit14 = '0';
          this.addLog('1#机器人状态切换为：暂停中');
        } else {
          // 暂停中 -> 启动中
          this.conveyorStatus.bit14 = '1';
          this.addLog('1#机器人状态切换为：启动中');
        }
      } else if (robotId === 'robot2') {
        // 启动/暂停两种状态切换
        if (this.conveyorStatus.bit15 === '1') {
          // 启动中 -> 暂停中
          this.conveyorStatus.bit15 = '0';
          this.addLog('2#机器人状态切换为：暂停中');
        } else {
          // 暂停中 -> 启动中
          this.conveyorStatus.bit15 = '1';
          this.addLog('2#机器人状态切换为：启动中');
        }
      }
    },
    // 获取PLC变量名和动作名称（单点写入）
    getButtonPlcVarAndActionName(line, action) {
      const lineName = `${line}#机械手`;
      let plcVar = '';
      let actionName = '';

      if (line === 1) {
        switch (action) {
          case 'start':
            plcVar = 'DBW102_BIT12'; // 1#机械手启动按钮
            actionName = `${lineName}启动`;
            break;
          case 'stop':
            plcVar = 'DBW102_BIT13'; // 1#机械手停止按钮
            actionName = `${lineName}停止`;
            break;
          case 'reset':
            plcVar = 'DBW102_BIT10'; // 1#机器人复位按钮
            actionName = `1#机器人复位`;
            break;
        }
      } else if (line === 2) {
        switch (action) {
          case 'start':
            plcVar = 'DBW102_BIT14'; // 2#机械手启动按钮
            actionName = `${lineName}启动`;
            break;
          case 'stop':
            plcVar = 'DBW102_BIT15'; // 2#机械手停止按钮
            actionName = `${lineName}停止`;
            break;
          case 'reset':
            plcVar = 'DBW102_BIT11'; // 2#机器人复位按钮
            actionName = `2#机器人复位`;
            break;
        }
      }

      return { plcVar, actionName };
    },

    // 按钮按下时调用（单次发送：置1）
    controlLinePress(line, action) {
      const { plcVar, actionName } = this.getButtonPlcVarAndActionName(
        line,
        action
      );
      if (!plcVar) return;

      // 设置按钮按下状态
      const buttonKey = `${line}-${action}`;
      this.buttonStates[buttonKey] = true;

      this.addLog(`${actionName}按钮被按下，发送PLC值：${plcVar}=1`);
      ipcRenderer.send('writeSingleValueToPLC', plcVar, true);
    },

    // 按钮松开时调用（单次发送：置0）
    controlLineRelease(line, action) {
      const { plcVar, actionName } = this.getButtonPlcVarAndActionName(
        line,
        action
      );
      if (!plcVar) return;

      // 设置按钮松开状态
      const buttonKey = `${line}-${action}`;

      // 如果按钮已经是松开状态，则不重复执行
      if (!this.buttonStates[buttonKey]) return;

      this.buttonStates[buttonKey] = false;

      this.addLog(`${actionName}按钮松开，发送PLC值：${plcVar}=0`);
      ipcRenderer.send('writeSingleValueToPLC', plcVar, false);
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
              .arm-label.has-pallet {
                color: #3a940d; /* 绿色：有货 */
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

/* 测试面板按钮组样式 */
:deep(.test-panel-dialog .el-button-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:deep(.test-panel-dialog .el-button-group .el-button) {
  margin: 0;
  flex: 1;
  min-width: 60px;
  max-width: 80px;
  padding: 4px 6px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.test-panel-dialog .el-button-group .el-button + .el-button) {
  margin-left: 0;
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
  animation: yellowFlash 3s infinite;
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
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
    &:active {
      transform: translateY(1px);
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
      filter: brightness(0.95);
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

  // 机械手控制按钮按下特效
  .button-pressed {
    transform: translateY(2px) scale(0.98);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    opacity: 0.8;
    transition: all 0.1s ease;
  }

  .button-pressed.el-button--success {
    background-color: #52c41a;
    border-color: #52c41a;
  }

  .button-pressed.el-button--danger {
    background-color: #ff4d4f;
    border-color: #ff4d4f;
  }

  .button-pressed.el-button--warning {
    background-color: #faad14;
    border-color: #faad14;
  }
}
</style>
