<template>
  <div id="app" style="position: fixed; width: 100%; height: 100%">
    <!-- <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav> -->
    <router-view />
    <LockScreen :isLocked="isLocked" @unlock="handleUnlock" />
  </div>
</template>

<script>
import LockScreen from '@/components/LockScreen.vue';
import { mapGetters } from 'vuex';

const LOCK_TIMEOUT = 15 * 60 * 1000; // 15分钟

export default {
  name: 'App',
  components: {
    LockScreen
  },
  data() {
    return {
      lockTimer: null,
      lastActivityTime: Date.now(),
      activityEvents: [
        'mousedown',
        'mousemove',
        'keydown',
        'scroll',
        'touchstart',
        'click'
      ]
    };
  },
  computed: {
    ...mapGetters(['isLocked'])
  },
  watch: {
    $route(newRoute) {
      if (newRoute.path === '/login') {
        this.stopLockTimer();
        this.$store.commit('SET_LOCKED', false);
      } else if (newRoute.path.startsWith('/homePage')) {
        this.resetLockTimer();
      }
    }
  },
  methods: {
    resetLockTimer() {
      this.stopLockTimer();
      if (!this.$route.path.startsWith('/homePage')) {
        return;
      }
      this.lastActivityTime = Date.now();
      this.lockTimer = setTimeout(() => {
        this.$store.commit('SET_LOCKED', true);
      }, LOCK_TIMEOUT);
    },
    stopLockTimer() {
      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
      }
    },
    handleUnlock() {
      this.$store.commit('SET_LOCKED', false);
      this.resetLockTimer();
    },
    onUserActivity() {
      if (this.isLocked) return;
      this.lastActivityTime = Date.now();
      this.resetLockTimer();
    },
    onVisibilityChange() {
      if (this.isLocked) return;
      if (!this.$route.path.startsWith('/homePage')) return;
      // 页面从后台恢复时，检查是否已超过15分钟
      if (!document.hidden) {
        const elapsed = Date.now() - this.lastActivityTime;
        if (elapsed >= LOCK_TIMEOUT) {
          this.$store.commit('SET_LOCKED', true);
        }
      }
    }
  },
  mounted() {
    this.activityEvents.forEach((event) => {
      document.addEventListener(event, this.onUserActivity, {
        passive: true
      });
    });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  },
  beforeDestroy() {
    this.stopLockTimer();
    this.activityEvents.forEach((event) => {
      document.removeEventListener(event, this.onUserActivity);
    });
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
};
</script>

<style lang="less">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  // color: #2c3e50;
}
</style>
