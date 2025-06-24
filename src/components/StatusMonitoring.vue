<template>
  <div :class="['sm-main', plcStatus ? '' : 'offline']" v-drag>
    <el-tooltip
      class="item"
      effect="dark"
      :content="sendStr"
      placement="bottom"
    >
      <div class="inner">
        <i
          class="el-icon-check icon"
          style="font-size: 28px; color: #fff"
          v-if="plcStatus"
        ></i>
        <i
          class="el-icon-close icon"
          style="font-size: 28px; color: #fff"
          v-else
        ></i>
        {{ plcStatus ? 'PLC已连接' : 'PLC未连接' }}
      </div>
    </el-tooltip>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron';
export default {
  name: 'StatusMonitor',
  components: {},
  directives: {
    drag: {
      bind: function (el) {
        const oDiv = el; // 获取当前元素
        oDiv.onmousedown = (e) => {
          // 算出鼠标相对元素的位置
          const disX = e.clientX - oDiv.offsetLeft;
          const disY = e.clientY - oDiv.offsetTop;

          document.onmousemove = (e) => {
            // 用鼠标的位置减去鼠标相对元素的位置，得到元素的位置
            let left = e.clientX - disX;
            let top = e.clientY - disY;

            // 活动最小范围
            const minLeft = 65;
            const minTop = 46;

            if (left <= minLeft) {
              left = minLeft;
            } else if (
              left >=
              document.documentElement.clientWidth - oDiv.clientWidth
            ) {
              // document.documentElement.clientWidth 屏幕的可视宽度
              left = document.documentElement.clientWidth - oDiv.clientWidth;
            }
            if (top <= minTop) {
              top = minTop;
            } else if (
              top >=
              document.documentElement.clientHeight - oDiv.clientHeight
            ) {
              // document.documentElement.clientHeight 屏幕的可视高度
              top = document.documentElement.clientHeight - oDiv.clientHeight;
            }

            oDiv.style.left = left + 'px';
            oDiv.style.top = top + 'px';
          };

          document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
          };
        };

        window.addEventListener('resize', function () {
          if (
            oDiv.offsetLeft + oDiv.clientWidth >=
            document.documentElement.clientWidth
          ) {
            oDiv.style.left =
              document.documentElement.clientWidth - oDiv.clientWidth + 'px';
          }
          if (
            oDiv.offsetTop + oDiv.clientHeight >=
            document.documentElement.clientHeight
          ) {
            oDiv.style.top =
              document.documentElement.clientHeight - oDiv.clientHeight + 'px';
          }
        });
      }
    }
  },
  props: [],
  data() {
    return {
      watchDog: '0',
      warningTimeOut: null,
      plcStatus: false,
      sendStr: ''
    };
  },
  watch: {
    watchDog: {
      handler(newVal, oldVal) {
        // console.log(new Date() + '心跳变化!' + newVal)
        this.plcStatus = true;
        if (this.warningTimeOut) {
          clearTimeout(this.warningTimeOut);
        }
        this.warningTimeOut = setTimeout(() => {
          // 说明已经2s没有更新数据，PLC断连了，报警
          this.plcStatus = false;
          if (this.$route.path != '/login') {
            this.$message.error('PLC断开连接！');
          }
        }, 3000);
      }
    }
  },
  computed: {},
  methods: {},
  created() {},
  mounted() {
    // receivedMsg接收到消息发送事件通知
    ipcRenderer.on('receivedMsg', (event, values, values2) => {
      // 处理看门狗心跳
      this.watchDog = values.DBW0;
      this.sendStr = values2;
      // console.log(this.watchDog)
    });
  }
};
</script>
<style lang="less" scoped>
.sm-main {
  background-color: #51a351;
  box-shadow: 0 0 12px #999;
  font-size: 13px;
  // background: #1bb09d;
  // box-shadow: 0 0 5px #61c0b3;
  width: 85px;
  height: 85px;
  border-radius: 50%;
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 4000;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  user-select: none;
  opacity: 0.85;
  .inner {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}
.sm-main:hover {
  -moz-box-shadow: 0 0 12px black;
  -webkit-box-shadow: 0 0 12px black;
  box-shadow: 0 0 12px black;
  opacity: 1;
  -ms-filter: alpha(opacity=100);
  filter: alpha(opacity=100);
  cursor: pointer;
}
.offline {
  background-color: #f56c6c !important;
}
.icon {
  animation: icon-animation 2s infinite;
}
@keyframes icon-animation {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
</style>
