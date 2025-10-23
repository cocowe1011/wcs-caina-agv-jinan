<template>
  <div class="content-wrapper">
    <!-- 左侧面板 -->
    <div class="side-info-panel">
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
                src="@/assets/jinan-agv/2500.png"
                alt="一楼平面图"
                class="floor-image"
                @load="updateMarkerPositions"
              />
              <!-- 上货扫码区域提示 -->
              <div class="marker-with-panel" data-x="370" data-y="780">
                <div class="pulse"></div>
                <div
                  class="data-panel"
                  :class="['position-top', { 'always-show': true }]"
                >
                  <div class="data-panel-header">
                    <span>立库来料</span>
                  </div>
                  <div class="data-panel-content">
                    <div class="data-panel-row">
                      <span class="data-panel-label">当前扫码信息：</span>
                      <span>{{ twoFiveHundredPalletCode || '--' }}</span>
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
              <!-- 添加带按钮的点位示例 -->
              <div class="marker-with-button" data-x="200" data-y="1360">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('H', '来料缓存区(H1-H20)')"
                >
                  来料缓存区(H1-H8)
                </button>
              </div>
              <!-- <div class="marker-with-button" data-x="720" data-y="250">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('H', '2500-1(H21-H40)')"
                >
                  2500-1(H21-H49)
                </button>
              </div> -->
              <!-- <div class="marker-with-button" data-x="980" data-y="880">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('H', '2500-2(H41-H60)')"
                >
                  2500-2(H50-H69)
                </button>
              </div> -->
              <!-- <div class="marker-with-button" data-x="1800" data-y="980">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('H', '2500-3(H70-H99)')"
                >
                  2500-3(H70-H99)
                </button>
              </div> -->
              <!-- <div class="marker-with-button" data-x="2260" data-y="250">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('H', '2500-4(H150-H199)')"
                >
                  2500-4(H150-H199)
                </button>
              </div> -->
              <!-- <div class="marker-with-button" data-x="2820" data-y="880">
                <div class="pulse"></div>
                <button
                  class="marker-button"
                  @click="handlePalletStorageClick('H', '2500-5(H100-H119)')"
                >
                  2500-5(H100-H119)
                </button>
              </div> -->
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
          <!-- 添加批量解锁按钮 -->
          <div
            v-if="
              currentStorageArea === 'H' &&
              currentStorageTitle.includes('来料缓存区')
            "
            class="title-actions"
          >
            <el-button
              type="warning"
              size="mini"
              icon="el-icon-unlock"
              @click="batchUnlockPallets"
              class="title-action-button"
            >
              批量解锁
            </el-button>
          </div>
          <el-button
            type="primary"
            size="mini"
            icon="el-icon-refresh"
            @click="refreshPalletStorage()"
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
          <!-- 上锁蒙版 -->
          <div
            v-if="
              item.isLock === '1' &&
              (parseInt(item.queueNum) >= 1 && parseInt(item.queueNum) <= 20
                ? item.trayInfo
                : true)
            "
            class="lock-overlay"
            :class="{
              'no-unlock': !(
                parseInt(item.queueNum) >= 1 && parseInt(item.queueNum) <= 20
              )
            }"
            @click.stop="
              parseInt(item.queueNum) >= 1 && parseInt(item.queueNum) <= 20
                ? handleUnlockCard(item)
                : null
            "
          >
            <div class="lock-content">
              <i class="el-icon-unlock lock-icon"></i>
              <span class="lock-text">
                {{
                  parseInt(item.queueNum) >= 1 && parseInt(item.queueNum) <= 20
                    ? '锁定中，点击解锁'
                    : '此位置已被占用，正在等待AGV运输'
                }}
              </span>
            </div>
          </div>
          <div class="storage-card-header">
            <div class="card-title">
              <span
                >位置 {{ item.queueName + item.queueNum
                }}<el-tag
                  v-if="item.trayStatus === '0'"
                  size="small"
                  style="margin-left: 15px"
                  >在AGV5-1等待取货</el-tag
                ><el-tag
                  v-if="item.trayStatus === '1'"
                  type="warning"
                  size="small"
                  style="margin-left: 15px"
                  >正运往来料缓存区</el-tag
                ><el-tag
                  v-if="item.trayStatus === '2'"
                  size="small"
                  type="success"
                  style="margin-left: 15px"
                  >已送至来料缓存区</el-tag
                ><el-tag
                  v-if="item.trayStatus === '3'"
                  size="small"
                  style="margin-left: 15px"
                  >在来料缓存区等待取货</el-tag
                ><el-tag
                  v-if="item.trayStatus === '4'"
                  size="small"
                  type="warning"
                  style="margin-left: 15px"
                  >正运往最终目的地</el-tag
                ><el-tag
                  v-if="item.trayStatus === '5'"
                  size="small"
                  type="success"
                  style="margin-left: 15px"
                  >已送至目的地终点</el-tag
                >
              </span>
            </div>
            <div class="card-actions" v-if="item.trayInfo">
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
                  <div class="storage-info-row" v-if="item.mudidi">
                    <span class="label">目的地：</span>
                    <span class="value">{{ item.mudidi || '--' }}</span>
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
                  v-model="twoFiveHundredPalletCode"
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
                  v-model="twoFiveHundredPalletTestCode"
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
                <span>{{ getAgvTaskStatusText(scope.row.trayStatus) }}</span>
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

    <!-- 批量解锁确认弹窗 -->
    <el-dialog
      title="批量解锁确认"
      :visible.sync="batchUnlockDialogVisible"
      width="500px"
      append-to-body
      :close-on-click-modal="false"
      custom-class="batch-unlock-dialog"
    >
      <div class="batch-unlock-content">
        <ul>
          <li v-for="pallet in unlockablePallets" :key="pallet.id">
            {{ pallet.queueName }}{{ pallet.queueNum }} -
            {{ pallet.trayInfo }} - {{ pallet.trayInfoAdd || '暂无描述' }}
          </li>
        </ul>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="batchUnlockDialogVisible = false" size="small"
          >取消</el-button
        >
        <el-button
          type="warning"
          @click="confirmBatchUnlock"
          size="small"
          :loading="batchUnlockLoading"
        >
          确认解锁
        </el-button>
      </span>
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
            >2500车间在线客户端: {{ workshop2500ClientCount }}</span
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
  name: 'FloorTwo',
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      currentStorageTitle: '', // 新增：用于抽屉标题
      palletStorageDrawerVisible: false,
      currentStorageArea: 'H', // 当前选中的缓存区
      palletStorageAreas: {
        H: []
      },
      testPanelVisible: false,
      scanInfo: {
        descrC: '',
        mudidi: ''
      },
      activeLogType: 'running',
      runningLogs: [], // 修改为空数组
      alarmLogs: [], // 修改为空数组
      logId: 0, // 添加日志ID计数器
      // AGV调度条件
      agvScheduleCondition: {
        bit1: '0' // 2500接驳口允许接货（同时允许上位机读取扫码结果）
      },
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
        { value: 'AGV5-1' },
        { value: 'H1' },
        { value: 'H2' },
        { value: 'H3' },
        { value: 'H4' },
        { value: 'H5' },
        { value: 'H6' },
        { value: 'H7' },
        { value: 'H8' }
      ],
      // 新增终点点位列表
      endAgvPositions: [
        { value: 'H1' },
        { value: 'H2' },
        { value: 'H3' },
        { value: 'H4' },
        { value: 'H5' },
        { value: 'H6' },
        { value: 'H7' },
        { value: 'H8' },
        { value: '25001' },
        { value: '25002' },
        { value: '25003' },
        { value: '25004' },
        { value: '25005' },
        { value: '25006' },
        { value: '25007' },
        { value: '25008' },
        { value: '25009' },
        { value: '25010' },
        { value: '25011' },
        { value: '25012' },
        { value: '25013' }
      ],
      // 定义一个map，可以通过type获取到code
      agvCodeMap: {
        'AGV5-1': '101'
      },
      twoFiveHundredPalletTestCode: '',
      // 托盘移动功能所需数据
      movePalletDialogVisible: false,
      sourcePalletToMove: null,
      selectedTargetPalletIdForMove: null,
      agvTaskDialogVisible: false,
      currentAgvTasks: [],
      agvTasksLoading: false,
      // 新增定时器相关
      agvTimerInterval: null,
      // 批量解锁相关
      batchUnlockDialogVisible: false,
      unlockablePallets: [],
      batchUnlockLoading: false,
      // 序号发送辅助变量
      currentSendIndex: {
        '2500-1': 21, // 2500-1的起始序号
        '2500-4': 150 // 2500-4的起始序号
      },
      // WebSocket相关数据
      // wsServer: null, // 已移动到主进程，通过IPC通信
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
    // 2500车间的客户端数量
    workshop2500ClientCount() {
      return this.mobileConnections.length;
    }
  },
  mounted() {
    this.initializeMarkers();
    // 启动定时器
    this.connectToWebSocketServer(); // 连接到WebSocket服务器
    ipcRenderer.on('receivedMsg', (event, values, values2) => {
      // 使用位运算优化赋值
      const getBit = (word, bitIndex) => ((word >> bitIndex) & 1).toString();

      // AGV调度条件
      let word8 = this.convertToWord(values.DBW8);
      this.agvScheduleCondition.bit1 = getBit(word8, 9);

      // 2500接货处条码
      this.twoFiveHundredPalletCode = values.DBB20 ?? '';
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
    // 监听agvScheduleCondition.bit1,
    'agvScheduleCondition.bit1': {
      async handler(newVal) {
        if (newVal === '1') {
          this.addLog(`2500接货处扫码数据：${this.twoFiveHundredPalletCode}`);
          // 检查条码信息是否为NoRead
          if (
            !this.twoFiveHundredPalletCode ||
            this.twoFiveHundredPalletCode === '' ||
            this.twoFiveHundredPalletCode.toLowerCase().includes('noread')
          ) {
            this.addLog('2500接货处扫码失败：条码信息为NoRead', 'alarm');
            // 重置扫码信息为默认值
            this.resetScanInfo();
            return;
          }
          // 自动触发AGV运输任务，从2800到C区缓存位
          this.getTrayInfo(this.twoFiveHundredPalletCode);
        }
      }
    }
  },
  methods: {
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
          // 如果在isActive变为true后首次调用，可以尝试强制等待图片加载
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
            // console.warn('FloorTwo: Image has 0 width/height even when active. Retrying updateMarkerPositions.');
            // 这种情况可能需要更复杂的处理，例如设置一个短暂的延迟重试，或者确保图片源正确
            // 为了简单起见，这里暂时只打印警告，依赖后续可能的resize事件或isActive变化
            return;
          }
          if (!this.isActive) return; // 如果组件不是激活状态，不进行定位
        }

        const markers = imageWrapper.querySelectorAll(
          '.marker, .marker-with-panel, .marker-with-panel-machine, .marker-with-button'
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
      // 清除定时器
      window.removeEventListener('resize', this.updateMarkerPositionsScoped);
    },
    handlePalletStorageClick(area, title) {
      this.currentStorageArea = area;
      this.currentStorageTitle = title; // 设置抽屉标题

      // 从标题中提取H区范围
      const rangeInfo = this.extractRangeFromTitle(title);

      // 打开抽屉前重新查询数据，并传入范围信息
      this.loadPalletStorageByArea(area, rangeInfo);
      this.palletStorageDrawerVisible = true;
    },

    // 从标题中提取H区的范围
    extractRangeFromTitle(title) {
      // 匹配类似 "H1-H20", "H21-H49" 这样的格式
      const rangeMatch = title.match(/H(\d+)-H(\d+)/i);
      if (rangeMatch && rangeMatch.length === 3) {
        return {
          start: parseInt(rangeMatch[1], 10),
          end: parseInt(rangeMatch[2], 10)
        };
      }
      return null;
    },
    // 加载指定区域的托盘存储数据
    loadPalletStorageByArea(area, rangeInfo) {
      this.isRefreshing = true;

      const params = {
        queueName: area
      };

      HttpUtil.post('/queue_info/queryQueueList', params)
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            // 为每个托盘项添加showSendPanel属性
            let dataWithSendPanel = res.data.map((item) => {
              return {
                ...item,
                showSendPanel: false
              };
            });

            // 如果有范围信息，按范围过滤数据
            if (
              rangeInfo &&
              rangeInfo.start !== undefined &&
              rangeInfo.end !== undefined
            ) {
              dataWithSendPanel = dataWithSendPanel.filter((item) => {
                // 从queueNum字段提取数字，进行范围筛选
                const queueNum = parseInt(item.queueNum, 10);
                return (
                  !isNaN(queueNum) &&
                  queueNum >= rangeInfo.start &&
                  queueNum <= rangeInfo.end
                );
              });
            }

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
    testDatabase() {
      if (!this.twoFiveHundredPalletTestCode) {
        this.$message.warning('请填写完整的测试托盘码');
        return;
      }
      // 调用接口读取托盘信息
      this.getTrayInfo(this.twoFiveHundredPalletTestCode);
      // 关闭测试面板
      this.testPanelVisible = false;
    },
    simulateScan() {
      if (!this.twoFiveHundredPalletCode) {
        this.$message.warning('请填写完整的扫码信息');
        return;
      }
      // 调用接口读取托盘信息
      this.getTrayInfo(this.twoFiveHundredPalletCode);
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
        chejian: '2500'
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
      // 2500车间扫码后只有一个目的地：H队列(来料缓存区H1-H20)
      HttpUtil.post('/queue_info/queryQueueList', {
        queueName: 'H'
      })
        .then(async (res) => {
          if (res.data && res.data.length > 0) {
            // 查找第一个空闲的托盘位置在来料缓存区(H1-H20)
            const emptyPosition = res.data.find(
              (item) =>
                (item.trayInfo === null || item.trayInfo === '') &&
                parseInt(item.queueNum) >= 1 &&
                parseInt(item.queueNum) <= 8
            );
            if (emptyPosition) {
              // 说明有空缓存位置
              // 根据托盘信息给AGV小车发送指令
              const robotTaskCode = await this.sendAgvCommand(
                'PF-FMR-COMMON-JH11',
                '101',
                emptyPosition.queueName + emptyPosition.queueNum
              );
              if (robotTaskCode !== '') {
                // 更新托盘信息
                const param = {
                  id: emptyPosition.id,
                  trayInfo: trayCode,
                  trayStatus: '0',
                  robotTaskCode: robotTaskCode,
                  trayInfoAdd: wmsInfo.descrC,
                  isLock: '1', // 默认上锁
                  targetPosition: '', // 保存目的地信息
                  mudidi: wmsInfo.mudidi // 保存目的地信息
                };
                HttpUtil.post('/queue_info/update', param)
                  .then((res) => {
                    if (res.data == 1) {
                      this.$message.success('托盘已入库到来料缓存区');
                      this.addLog(
                        `托盘已入库：${trayCode}, 来料缓存区位置：${emptyPosition.queueName}${emptyPosition.queueNum}, 目的地：${wmsInfo.mudidi}`
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
                    } else {
                      this.$message.error('托盘入库失败，请重试');
                      this.addLog(`托盘入库失败：${trayCode}`);
                    }
                  })
                  .catch((err) => {
                    this.$message.error('托盘入库失败，请重试');
                    this.addLog(`托盘入库失败：${trayCode},${err}`);
                  });
              }
            } else {
              this.$message.error('来料缓存区(H1-H8)没有空闲位置');
              this.addLog(
                `${trayCode} 托盘入库失败，来料缓存区(H1-H8)没有空闲位置`
              );
            }
          }
        })
        .catch((err) => {
          console.error('查询H队列托盘情况失败:', err);
        });
    },
    switchStorageArea(area) {
      this.currentStorageArea = area;
      // 切换区域时重新加载数据
      const rangeInfo = this.extractRangeFromTitle(this.currentStorageTitle);
      this.loadPalletStorageByArea(area, rangeInfo);
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

        // 如果是报警日志，推送到移动端（2500车间）
        this.pushAlarmToMobile(log);
      }

      // 同时写入本地文件
      const logTypeText = type === 'running' ? '运行日志' : '报警日志';
      const logMessage = `[${logTypeText}] ${message}`;
      ipcRenderer.send('writeLogToLocal', logMessage, '2500');
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

      const startPos = this.agvSchedule.startPosition.trim().toUpperCase();
      const endPos = this.agvSchedule.endPosition.trim().toUpperCase();

      // 情况1：AGV5-1（101）To H1 H2 ... H8，taskType：PF-FMR-COMMON-JH11
      if (startPos === 'AGV5-1' && this.isHPosition(endPos)) {
        await this.handleAgv5ToH(startPos, endPos);
      }
      // 情况2：H1 H2 ... H8 To 25001-25013，taskType：PF-FMR-STACK-ALGO-QC
      else if (this.isHPosition(startPos) && this.isStackPosition(endPos)) {
        await this.handleHToStack(startPos, endPos);
      } else {
        this.$message.warning('不支持的操作路径，请检查起点和终点');
        this.addLog('不支持的操作路径，请检查起点和终点');
      }
    },

    // 判断是否为H1-H8位置
    isHPosition(position) {
      return /^H[1-8]$/i.test(position);
    },

    // 判断是否为25001-25013堆栈位置
    isStackPosition(position) {
      return /^250(0[1-9]|1[0-3])$/i.test(position);
    },

    // 处理AGV5-1到H1-H8的情况
    async handleAgv5ToH(startPos, endPos) {
      this.agvSchedule.status = 'singleRunning';

      try {
        // 发送AGV指令
        const robotTaskCode = await this.sendAgvCommand(
          'PF-FMR-COMMON-JH11',
          '101', // AGV5-1对应的站点码
          endPos
        );

        // 显示AGV接口返回信息
        if (robotTaskCode !== '') {
          console.log(
            `AGV5-1到${endPos}指令发送成功，任务码：${robotTaskCode}`
          );
          this.addLog(
            `AGV5-1到${endPos}指令发送成功，任务码：${robotTaskCode}`
          );
          this.$message.success(`AGV指令发送成功，任务码：${robotTaskCode}`);
        } else {
          console.log(`AGV5-1到${endPos}指令发送失败`);
          this.addLog(`AGV5-1到${endPos}指令发送失败`);
          this.$message.error('AGV指令发送失败');
        }
      } catch (e) {
        console.log(`AGV5-1到${endPos}指令发送异常：${e}`);
        this.addLog(`AGV5-1到${endPos}指令发送异常：${e}`);
        this.$message.error('AGV指令发送异常');
      } finally {
        // 重置状态
        this.agvSchedule.status = 'idle';
      }
    },

    // 处理H1-H8到25001-25013的情况
    async handleHToStack(startPos, endPos) {
      this.agvSchedule.status = 'singleRunning';

      try {
        // 发送AGV指令
        const robotTaskCode = await this.sendAgvCommand(
          'PF-FMR-STACK-ALGO-QC',
          startPos,
          endPos
        );

        // 显示AGV接口返回信息
        if (robotTaskCode !== '') {
          console.log(
            `从${startPos}到${endPos}指令发送成功，任务码：${robotTaskCode}`
          );
          this.addLog(
            `从${startPos}到${endPos}指令发送成功，任务码：${robotTaskCode}`
          );
          this.$message.success(`AGV指令发送成功，任务码：${robotTaskCode}`);
        } else {
          console.log(`从${startPos}到${endPos}指令发送失败`);
          this.addLog(`从${startPos}到${endPos}指令发送失败`);
          this.$message.error('AGV指令发送失败');
        }
      } catch (e) {
        console.log(`从${startPos}到${endPos}指令发送异常：${e}`);
        this.addLog(`从${startPos}到${endPos}指令发送异常：${e}`);
        this.$message.error('AGV指令发送异常');
      } finally {
        // 重置状态
        this.agvSchedule.status = 'idle';
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

      // 根据巷道类型确定type值
      const getRouteType = (siteCode) => {
        // H1-H8 巷道使用 SITE 类型
        if (this.isHPosition(siteCode)) {
          return 'SITE';
        }
        // 25001-25013 巷道使用 STACK 类型
        if (this.isStackPosition(siteCode)) {
          return 'STACK';
        }
        // 其他位置默认为 SITE 类型
        return 'SITE';
      };

      // 组装入参
      const params = {
        taskType: taskType,
        targetRoute: [
          {
            type: getRouteType(fromSiteCode),
            code: fromSiteCode
          },
          {
            type: getRouteType(toSiteCode),
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
    // --- 托盘移动功能方法 START ---
    handleOpenMovePalletDialog(item) {
      this.refreshPalletStorage(); // 使用新方法重新加载数据
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
        'targetPosition',
        'isLock',
        'mudidi',
        'targetId'
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
          this.refreshPalletStorage(); // 使用新方法刷新列表
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

    // 根据区域和标题刷新托盘存储数据
    refreshPalletStorage() {
      const rangeInfo = this.extractRangeFromTitle(this.currentStorageTitle);
      this.loadPalletStorageByArea(this.currentStorageArea, rangeInfo);
    },

    refreshAgvTasks() {
      this.agvTasksLoading = true;
      HttpUtil.post('/queue_info/queryQueueList', {
        queueName: 'H'
      })
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            // 2500车间：仅保留 id > 300 的运行中任务
            this.currentAgvTasks = res.data
              .filter((item) => ['0', '1', '3', '4'].includes(item.trayStatus))
              .filter((item) => Number(item.id) > 300);
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

    getAgvTaskStatusText(status) {
      // 根据trayStatus状态返回对应的文本描述
      const statusMap = {
        0: '在AGV5-1等待取货',
        1: '正运往来料缓存区',
        3: '在来料缓存区等待取货',
        4: '正运往最终目的地'
      };

      return statusMap[status] || '未知状态';
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
    handleUnlockCard(item) {
      // 单个卡片解锁
      this.$confirm(`确认解锁托盘"${item.trayInfo}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          HttpUtil.post('/queue_info/update', {
            id: item.id,
            isLock: '0'
          })
            .then((res) => {
              if (res.data == 1) {
                this.$message.success('托盘已解锁');
                this.addLog(`托盘${item.trayInfo}已解锁`);
                item.isLock = '0';
              } else {
                this.$message.error('解锁失败');
              }
            })
            .catch((err) => {
              this.$message.error(`解锁失败: ${err}`);
            });
        })
        .catch(() => {});
    },

    // 批量解锁选中托盘
    batchUnlockPallets() {
      // 获取可解锁的托盘（来料缓存区H1-H20中有托盘且已上锁的）
      const unlockableItems = this.currentStoragePositions.filter(
        (item) =>
          item.trayInfo &&
          item.isLock === '1' &&
          parseInt(item.queueNum) >= 1 &&
          parseInt(item.queueNum) <= 20
      );

      if (unlockableItems.length === 0) {
        this.$message.warning('来料缓存区(H1-H20)没有可解锁的托盘');
        return;
      }

      // 显示确认弹窗
      this.unlockablePallets = unlockableItems;
      this.batchUnlockDialogVisible = true;
    },

    // 确认批量解锁
    confirmBatchUnlock() {
      this.batchUnlockLoading = true;

      const updates = this.unlockablePallets.map((item) => ({
        id: item.id,
        isLock: '0' // 解锁
      }));

      HttpUtil.post('/queue_info/updateByList', updates)
        .then((res) => {
          if (res.data > 0) {
            this.$message.success(
              `成功解锁${this.unlockablePallets.length}个托盘`
            );
            this.addLog(`批量解锁了${this.unlockablePallets.length}个托盘`);

            // 关闭弹窗
            this.batchUnlockDialogVisible = false;

            // 刷新列表
            this.refreshPalletStorage();
          } else {
            this.$message.error('批量解锁失败');
          }
        })
        .catch((err) => {
          this.$message.error(`批量解锁出错: ${err}`);
        })
        .finally(() => {
          this.batchUnlockLoading = false;
        });
    },

    // ============ WebSocket相关方法 ============
    // 连接到WebSocket服务器（通过IPC与主进程通信）
    connectToWebSocketServer() {
      // FloorTwo不需要创建WebSocket服务器，直接初始化IPC连接
      this.initWebSocketServer();
    },

    // 初始化WebSocket连接（项目启动时WebSocket服务器已自动启动）
    initWebSocketServer() {
      try {
        // 监听WebSocket服务器状态更新
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
        source: '2500车间',
        unread: true
      };

      // 发送IPC消息到主进程，请求推送报警
      ipcRenderer.send('push-alarm-to-workshop', '2500', alarmData);
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
        // 只显示2500车间的连接
        this.mobileConnections = (clients || []).filter(
          (client) => client.workshop === '2500'
        );
        this.refreshingConnections = false;
      });
    },

    // 格式化时间
    formatTime(timeValue) {
      if (!timeValue) return '--';
      return moment(timeValue).format('YYYY-MM-DD HH:mm:ss');
    },

    // 切换到报警日志时清除未读状态
    switchToAlarmLog() {
      this.activeLogType = 'alarm';
      // 清除所有报警日志的未读状态
      this.alarmLogs.forEach((log) => {
        log.unread = false;
      });
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
        cursor: pointer;
        z-index: 10;
        border-radius: 0 0 8px 8px; // 只有底部圆角
        transition: all 0.3s ease;

        &:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        &.no-unlock {
          cursor: not-allowed;

          &:hover {
            background: rgba(0, 0, 0, 0.6);
          }
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

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

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

            .lock-tag {
              margin-left: 10px;
              font-size: 10px;
              padding: 0 4px;
              height: 18px;
              line-height: 16px;

              i {
                margin-right: 2px;
                font-size: 10px;
              }
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

  .title-actions {
    margin-left: auto;
    margin-right: 10px;
    display: flex;
    gap: 8px;
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
</style>
