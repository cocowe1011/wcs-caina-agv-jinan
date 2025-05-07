<template>
  <div class="smart-workshop">
    <!-- 添加标题区域 -->
    <div class="header">
      <img src="@/assets/jinan-agv/header.png" alt="header" class="header-bg" />
      <div class="header-content">
        <div class="title">智慧大屏监控</div>
        <div class="floor-switch">
          <button
            :class="['switch-btn', currentFloor === 1 ? 'active' : '']"
            @click="switchFloor(1)"
          >
            2800车间
          </button>
          <button
            :class="['switch-btn', currentFloor === 2 ? 'active' : '']"
            @click="switchFloor(2)"
          >
            2500车间
          </button>
        </div>
        <div class="current-time">{{ currentTime }}</div>
      </div>
    </div>
    <!-- 左侧区域 -->
    <div class="floor-left">
      <FloorFirst v-if="currentFloor === 1" />
      <FloorTwo v-if="currentFloor === 2" />
    </div>
  </div>
</template>

<script>
import FloorFirst from './FloorFirst.vue';
import FloorTwo from './FloorTwo.vue';
export default {
  name: 'MainPage',
  components: {
    FloorFirst,
    FloorTwo
  },
  data() {
    return {
      currentTime: '',
      currentFloor: 1
    };
  },
  computed: {},
  mounted() {
    this.updateTime();
    setInterval(this.updateTime, 1000);
  },
  methods: {
    updateTime() {
      this.currentTime = new Date().toLocaleString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },
    switchFloor(floor) {
      this.currentFloor = floor;
    }
  }
};
</script>

<style scoped>
/* 只保留必要的样式 */
.smart-workshop {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle, #83b3de, #ffffff);
  padding: 0;
  font-family: 'Roboto', sans-serif;
  overflow: hidden;
  box-sizing: border-box;
}

.floor-left {
  flex: 1;
  color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.header {
  position: relative;
  width: 100%;
  height: 100px;
  overflow: hidden;
  flex-shrink: 0;
}

.header-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-content {
  position: relative;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  z-index: 1;
  margin-top: -9px;
  padding: 0 20px;
}

.title {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

.floor-switch {
  display: flex;
  gap: 10px;
}

.switch-btn {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.switch-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.switch-btn.active {
  background: rgba(0, 123, 255, 0.5);
  border-color: rgba(0, 123, 255, 0.8);
}

.current-time {
  font-size: 24px;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  min-width: 120px;
  text-align: center;
}
</style>
