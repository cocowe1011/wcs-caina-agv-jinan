import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  dialog,
  Tray,
  screen
} from 'electron';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import nodes7 from 'nodes7';
import HttpUtil from '@/utils/HttpUtil';
import logger from 'electron-log';
import AlarmWebSocketServer from './utils/WebSocketServer';
// 设置日志文件的保存路径
logger.transports.file.file = app.getPath('userData') + '/app.log';

// 初始化日志记录器
logger.transports.file.level = 'info';
logger.transports.console.level = 'info';
// 日期样式
logger.transports.file.format =
  '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}';
console.log(app.getPath('userData'));
logger.transports.file.file = app.getPath('userData') + '/app.log';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
var appTray = null;
let closeStatus = false;
var conn = new nodes7();

// WebSocket服务器实例
let alarmWebSocketServer = null;

// 记录日志的辅助函数
function logToFile(message) {
  const timestamp = new Date().toLocaleString();
  const logPath =
    'D://wcs_temp_data/log/' +
    new Date().toLocaleDateString().replaceAll('/', '-') +
    'runlog.txt';
  fs.appendFile(logPath, `[${timestamp}] ${message}\n`, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
}

// 日志缓冲相关变量
let logBuffer = {
  2800: [], // 2800车间日志缓冲区
  2500: [] // 2500车间日志缓冲区
};
let logBufferTimer = null;
const LOG_BUFFER_SIZE = 10; // 缓冲区大小
const LOG_FLUSH_INTERVAL = 5000; // 5秒刷新一次

// 优化的日志写入函数
function writeLogToLocalOptimized(logData, workshop = '2800') {
  // 添加时间戳
  const timestamp = new Date().toLocaleString();
  const logEntry = `[${timestamp}] ${logData}\n`;

  // 添加到对应车间的缓冲区
  if (!logBuffer[workshop]) {
    logBuffer[workshop] = [];
  }
  logBuffer[workshop].push(logEntry);

  // 如果缓冲区满了，立即刷新
  if (logBuffer[workshop].length >= LOG_BUFFER_SIZE) {
    flushLogBuffer(workshop);
  } else if (!logBufferTimer) {
    // 设置定时器，定期刷新缓冲区
    logBufferTimer = setTimeout(() => {
      flushAllLogBuffers();
    }, LOG_FLUSH_INTERVAL);
  }
}

// 刷新指定车间的日志缓冲区
function flushLogBuffer(workshop) {
  if (!logBuffer[workshop] || logBuffer[workshop].length === 0) return;

  const logPath = getLogPath(workshop);

  // 确保日志目录存在
  const logDir = 'D://wcs_temp_data/log';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // 检查日志文件大小，如果超过10MB则进行轮转
  try {
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 10) {
        // 创建备份文件
        const backupPath = logPath.replace('.txt', `_${Date.now()}.txt`);
        fs.renameSync(logPath, backupPath);
        console.log(`${workshop}车间日志文件过大，已轮转到: ${backupPath}`);
      }
    }
  } catch (error) {
    console.error(`检查${workshop}车间日志文件大小时出错:`, error);
  }

  // 批量写入日志
  const logContent = logBuffer[workshop].join('');
  fs.appendFile(logPath, logContent, (err) => {
    if (err) {
      console.error(`Error writing to ${workshop} workshop log file:`, err);
    }
  });

  // 清空缓冲区
  logBuffer[workshop] = [];
}

// 刷新所有车间的日志缓冲区
function flushAllLogBuffers() {
  Object.keys(logBuffer).forEach((workshop) => {
    flushLogBuffer(workshop);
  });

  // 清除定时器
  if (logBufferTimer) {
    clearTimeout(logBufferTimer);
    logBufferTimer = null;
  }
}

// 获取指定车间的日志文件路径
function getLogPath(workshop) {
  const dateStr = new Date().toLocaleDateString().replaceAll('/', '-');
  return `D://wcs_temp_data/log/${workshop}_${dateStr}.txt`;
}
// electron 开启热更新
try {
  require('electron-reloader')(module, {});
} catch (_) {
  // 忽略electron-reloader加载失败的错误
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出时确保所有日志都被写入
app.on('before-quit', () => {
  flushAllLogBuffers();
});

// 单实例锁，防止应用被多开 - 必须在app.ready之前检查
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // 直接退出，不创建任何窗口，避免白色背景框
  console.log('检测到已有程序运行，直接退出');
  // 使用 process.exit 确保立即退出，避免任何延迟
  process.exit(0);
} else {
  app.on('second-instance', (event, argv, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

global.sharedObject = {
  userInfo: {}
};
let mainWindow = null;
app.on('ready', () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: './build/icons/icon.ico'
  });

  // 项目启动时自动启动WebSocket服务器
  try {
    alarmWebSocketServer = new AlarmWebSocketServer(8081);
    logger.info('WebSocket服务器自动启动成功，端口: 8081');
  } catch (error) {
    logger.error('WebSocket服务器自动启动失败:', error);
  }
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
  } else {
    createProtocol('app');
    // Load the index.html when not in development
    mainWindow.loadURL('app://./index.html');
    // mainWindow.webContents.openDevTools();
  }
  ipcMain.on('logStatus', (event, arg) => {
    console.log(arg);
    if (arg === 'login') {
      mainWindow.setResizable(true);
      mainWindow.setBounds({
        x: 0,
        y: 0,
        width: screen.getPrimaryDisplay().workAreaSize.width,
        height: screen.getPrimaryDisplay().workAreaSize.height
      });
    } else {
      // 太几把坑了，windows系统setSize center方法失效 必须先mainWindow.unmaximize()
      mainWindow.unmaximize();
      mainWindow.setSize(1100, 600);
      mainWindow.center();
      global.sharedObject.userInfo = {};
      // mainWindow.setResizable(false)
    }
  });
  // 定义自定义事件
  ipcMain.on('close-window', function () {
    mainWindow.close();
  });
  // 定义自定义事件
  ipcMain.on('min-window', (event, arg) => {
    mainWindow.minimize();
  });
  // writeValuesToPLC
  ipcMain.on('writeValuesToPLC', (event, arg1, arg2) => {
    writeValuesToPLC(arg1, arg2);
  });
  // writeSingleValueToPLC - 单独给PLC某个变量写值，通过批量写入数组实现
  ipcMain.on('writeSingleValueToPLC', (event, arg1, arg2) => {
    writeSingleValueToPLC(arg1, arg2);
  });
  // cancelWriteToPLC - 取消PLC某个变量的写入
  ipcMain.on('cancelWriteToPLC', (event, arg1) => {
    cancelWriteToPLC(arg1);
  });

  // ============ WebSocket服务器IPC处理 ============

  // 获取WebSocket服务器状态
  ipcMain.on('get-websocket-status', (event) => {
    if (alarmWebSocketServer) {
      event.reply('websocket-status-update', alarmWebSocketServer.getStatus());
    }
  });

  // 推送报警到指定车间
  ipcMain.on('push-alarm-to-workshop', (event, workshop, alarmData) => {
    if (alarmWebSocketServer) {
      const success = alarmWebSocketServer.pushAlarmToWorkshop(
        workshop,
        alarmData
      );
      logger.info(`推送${workshop}车间报警: ${success ? '成功' : '失败'}`);
    }
  });

  // 获取连接的客户端列表
  ipcMain.on('get-websocket-clients', (event) => {
    if (alarmWebSocketServer) {
      const clients = alarmWebSocketServer.getConnectedClients();
      event.reply('websocket-clients-list', clients);
    } else {
      event.reply('websocket-clients-list', []);
    }
  });
  // 定义自定义事件
  ipcMain.on('max-window', (event, arg) => {
    if (arg === 'max-window') {
      return mainWindow.maximize();
    }
    mainWindow.unmaximize();
    mainWindow.setBounds({
      x: 10,
      y: 10,
      width: screen.getPrimaryDisplay().workAreaSize.width - 20,
      height: screen.getPrimaryDisplay().workAreaSize.height - 20
    });
  });
  // 启动plc conPLC
  ipcMain.on('conPLC', (event, arg1, arg2) => {
    if (process.env.NODE_ENV === 'production') {
      conPLC();
    }
    // setInterval(() => {
    //   console.log(writeStrArr.toString());
    // }, 50);
    // sendHeartToPLC()
  });
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('mainWin-max', 'max-window');
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('mainWin-max', 'unmax-window');
  });
  mainWindow.on('close', (e) => {
    closeStatus = true;
    e.preventDefault(); //先阻止一下默认行为，不然直接关了，提示框只会闪一下
    dialog
      .showMessageBox({
        type: 'warning',
        title: '提醒！',
        message: '确认关闭程序吗？',
        buttons: ['关闭程序', '放入托盘', '取消'], //选择按钮，点击确认则下面的idx为0，取消为1
        cancelId: 2 //这个的值是如果直接把提示框×掉返回的值，这里设置成和“取消”按钮一样的值，下面的idx也会是1
      })
      .then((idx) => {
        if (idx.response == 2) {
          e.preventDefault();
        } else if (idx.response == 0) {
          mainWindow = null;
          app.exit();
        } else {
          mainWindow.setSkipTaskbar(true);
          mainWindow.hide();
        }
      });
  });
  if (process.env.NODE_ENV === 'development') {
    let revert = false;
    setInterval(() => {
      if (mainWindow) {
        if (revert) {
          mainWindow.webContents.send(
            'receivedMsg',
            {
              DBW0: 0,
              DBW2: 0,
              DBW4: 35580,
              DBW6: 512,
              DBW8: -1793,
              DBB10: '20240101',
              DBB20: '83048880004868800784'
            },
            writeStrArr.toString()
          );
        } else {
          mainWindow.webContents.send(
            'receivedMsg',
            {
              DBW0: 1,
              DBW2: 0,
              DBW4: 35580,
              DBW6: 512,
              DBW8: -1793,
              DBB10: '20240101',
              DBB20: '83048880004868800784'
            },
            writeStrArr.toString()
          );
        }
        revert = !revert;
      }
    }, 100);
  }
  setAppTray();
  if (process.env.NODE_ENV === 'production') {
    try {
      const javaPath = path.join(
        __static,
        './jre',
        'jre1.8.0_251',
        'bin',
        'java'
      );
      const jarPath = path.join(
        __static,
        './jarlib',
        'wcs-agv-jinan-middle-anxin.jar'
      );

      // 优化的Java启动参数
      const javaOpts = [
        // 内存设置
        '-Xmx4096m', // 最大堆内存
        '-Xms4096m', // 初始堆内存
        '-XX:MaxMetaspaceSize=512m', // 最大元空间大小
        '-XX:MetaspaceSize=256m', // 初始元空间大小

        // GC设置
        '-XX:+UseG1GC', // 使用G1垃圾收集器
        '-XX:MaxGCPauseMillis=200', // 最大GC停顿时间
        '-XX:+HeapDumpOnOutOfMemoryError', // 内存溢出时导出堆转储
        '-XX:HeapDumpPath=D://wcs_temp_data/dump', // 堆转储文件路径

        // 性能优化
        '-XX:+DisableExplicitGC', // 禁止显式GC调用
        '-XX:+UseStringDeduplication', // 开启字符串去重
        '-XX:+OptimizeStringConcat', // 优化字符串连接

        // 监控和调试
        '-XX:+PrintGCDetails', // 打印GC详细信息
        '-XX:+PrintGCDateStamps', // 打印GC时间戳
        '-Xloggc:D://wcs_temp_data/log/gc.log', // GC日志文件
        '-XX:+HeapDumpBeforeFullGC', // Full GC前生成堆转储
        '-XX:+PrintGCApplicationStoppedTime', // 打印应用暂停时间

        // 错误处理
        '-XX:+ExitOnOutOfMemoryError', // 发生OOM时退出
        '-XX:ErrorFile=D://wcs_temp_data/log/hs_err_%p.log', // JVM错误日志
        // 编码
        '-Dfile.encoding=UTF-8',
        // 应用参数
        '-jar',
        jarPath
      ];
      // 确保日志目录存在
      const logDir = 'D://wcs_temp_data/log';
      const dumpDir = 'D://wcs_temp_data/dump';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      if (!fs.existsSync(dumpDir)) {
        fs.mkdirSync(dumpDir, { recursive: true });
      }

      logToFile(`启动Java进程，使用参数: ${javaOpts.join(' ')}`);
      const process = spawn(javaPath, javaOpts);

      process.on('error', (err) => {
        logToFile(`Java程序启动错误: ${err.message}`);
      });

      process.on('exit', (code, signal) => {
        logToFile(`Java程序退出，退出码: ${code}, 信号: ${signal}`);
      });
    } catch (error) {
      logToFile(`Java程序启动异常: ${error.message}`);
    }
  }

  // 开发者工具
  globalShortcut.register('CommandOrControl+L', () => {
    mainWindow.webContents.openDevTools();
  });
  globalShortcut.register('CommandOrControl+F11', () => {
    mainWindow.isFullScreen()
      ? mainWindow.setFullScreen(false)
      : mainWindow.setFullScreen(true);
  });
  // 定义自定义事件
  ipcMain.on('full_screen', function () {
    mainWindow.isFullScreen()
      ? mainWindow.setFullScreen(false)
      : mainWindow.setFullScreen(true);
  });
  // 定义自定义事件 - 优化后的日志写入
  ipcMain.on('writeLogToLocal', (event, logData, workshop = '2800') => {
    writeLogToLocalOptimized(logData, workshop);
  });
});

function conPLC() {
  logger.info('开始连接PLC');
  // 查询配置
  HttpUtil.get('/cssConfig/getConfig')
    .then((res) => {
      logger.info(JSON.stringify(res));
      if (!res.data.plcPort) {
        logger.info('配置查询失败');
        // We have an error. Maybe the PLC is not reachable.
        conPLC();
        return false;
      }
      conn.initiateConnection(
        {
          port: Number(res.data.plcPort),
          host: res.data.plcIp,
          rack: 0,
          slot: 1,
          debug: false
        },
        (err) => {
          if (typeof err !== 'undefined') {
            logger.info('连接PLC失败' + JSON.stringify(err));
            // We have an error. Maybe the PLC is not reachable.
            conPLC();
            return false;
            // process.exit();
          }
          conn.setTranslationCB(function (tag) {
            return variables[tag];
          }); // This sets the "translation" to allow us to work with object names
          logger.info('连接PLC成功');
          // 输送线看门狗心跳
          conn.addItems('DBW0');
          // 输送线当前运行状态
          conn.addItems('DBW2');
          // 1#机器人状态
          conn.addItems('DBW4');
          // 2#机器人状态
          conn.addItems('DBW6');
          // AGV调度条件
          conn.addItems('DBW8');
          // 2800接货处条码
          conn.addItems('DBB10');
          // 2500接货处条码信息
          conn.addItems('DBB20');
          setInterval(() => {
            conn.readAllItems(valuesReady);
          }, 50);
          setInterval(() => {
            // nodes7 代码
            conn.writeItems(writeAddArr, writeStrArr, valuesWritten);
          }, 100);
          // 发送心跳
          sendHeartToPLC();
        }
      );
    })
    .catch((err) => {
      logger.info('config error!');
    });
}
let times = 1;
let nowValue = 0;
function sendHeartToPLC() {
  setInterval(() => {
    if (times > 5) {
      times = 1;
      nowValue = 1 - nowValue;
    }
    times++;
    writeValuesToPLC('DBW100', nowValue);
  }, 200); // 每200毫秒执行一次交替
}

var variables = {
  DBW0: 'DB101,INT0', // 输送线看门狗心跳
  DBW2: 'DB101,INT2', // 输送线当前运行状态
  DBW4: 'DB101,INT4', // 1#机器人状态
  DBW6: 'DB101,INT6', // 2#机器人状态
  DBW8: 'DB101,INT8', // AGV调度条件
  DBB10: 'DB101,C10.10', // 2800接货处条码
  DBB20: 'DB101,C20.10', // 2500接货处条码信息
  DBW100: 'DB101,INT100', // WCS看门狗心跳
  DBW102_BIT0: 'DB101,X102.0', // 1#机器人状态-值为1时，1#机器人A送货完成
  DBW102_BIT1: 'DB101,X102.1', // 1#机器人状态-值为1时，1#机器人A需要清理空托盘完成
  DBW102_BIT2: 'DB101,X102.2', // 1#机器人状态-值为1时，1#机器人B送货完成
  DBW102_BIT3: 'DB101,X102.3', // 1#机器人状态-值为1时，1#机器人B需要清理空托盘完成
  DBW102_BIT4: 'DB101,X102.4', // 1#机器人状态-值为1时，1#机器人C送货完成
  DBW102_BIT5: 'DB101,X102.5', // 1#机器人状态-值为1时，1#机器人C需要清理杂物托盘完成
  DBW102_BIT6: 'DB101,X102.6', // 1#机器人状态-值为1时，1#机器人D送货完成
  DBW102_BIT7: 'DB101,X102.7', // 1#机器人状态-值为1时，1#机器人D需要清理托盘
  DBW102_BIT8: 'DB101,X103.0', // 1#机器人状态-值为1时，1#机器人E送货完成
  DBW102_BIT9: 'DB101,X103.1', // 1#机器人状态-值为1时，1#机器人E需要清理托盘完成
  DBW102_BIT10: 'DB101,X103.2', // 1#机器人状态-1#机器人复位按钮，按下为1，松开为0
  DBW102_BIT11: 'DB101,X103.3', // 1#机器人状态-2#机器人复位按钮，按下为1  松开为0
  DBW102_BIT12: 'DB101,X103.4', // 1#机器人状态-1#拆垛线启动按钮，按下为1松开为0
  DBW102_BIT13: 'DB101,X103.5', // 1#机器人状态-1#拆垛线停止按钮，按下为1松开为0
  DBW102_BIT14: 'DB101,X103.6', // 1#机器人状态-2#拆垛线启动按钮，按下为1松开为0
  DBW102_BIT15: 'DB101,X103.7', // 1#机器人状态-2#拆垛线停止按钮，按下为1松开为0
  DBW104_BIT0: 'DB101,X104.0', // 2#机器人状态-值为1时，2#机器人A送货完成
  DBW104_BIT1: 'DB101,X104.1', // 2#机器人状态-值为1时，2#机器人A需要清理空托盘完成
  DBW104_BIT2: 'DB101,X104.2', // 2#机器人状态-值为1时，2#机器人B送货完成
  DBW104_BIT3: 'DB101,X104.3', // 2#机器人状态-值为1时，2#机器人B需要清理空托盘完成
  DBW104_BIT4: 'DB101,X104.4', // 2#机器人状态-值为1时，2#机器人C送货完成
  DBW104_BIT5: 'DB101,X104.5', // 2#机器人状态-值为1时，2#机器人C需要清理杂物托盘完成
  DBW104_BIT6: 'DB101,X104.6', // 2#机器人状态-值为1时，2#机器人D送货完成
  DBW104_BIT7: 'DB101,X104.7', // 2#机器人状态-值为1时，2#机器人D需要清理托盘完成
  DBW104_BIT8: 'DB101,X104.8', // 2#机器人状态-值为1时，2#机器人E送货完成
  DBW104_BIT9: 'DB101,X105.0', // 2#机器人状态-值为1时，2#机器人E需要清理托盘完成
  DBW106_BIT0: 'DB101,X106.0', // 2800转盘处接货完成
  DBW106_BIT1: 'DB101,X106.1', // 2500接驳口接货完成
  DBW106_BIT2: 'DB101,X106.2', // AGV2-2放货完成
  DBW106_BIT3: 'DB101,X106.3', // AGV2-3放货完成
  DBW106_BIT4: 'DB101,X106.4', // AGV3-1取货完成
  DBW106_BIT5: 'DB101,X106.5', // AGV1-1取货完成
  DBW106_BIT6: 'DB101,X106.6', // 机器人1暂停信号 只发2s
  DBW106_BIT7: 'DB101,X106.7', // 机器人2暂停信号 只发2s
  DBW106_BIT8: 'DB101,X106.8', // 机器人1复位信号 只发2s
  DBW106_BIT9: 'DB101,X107.0', // 机器人2复位信号 只发2s
  DBB110: 'DB101,C110.10', // 去三楼提升机放货处条码
  DBB120: 'DB101,C120.10' // 去一楼提升机放货处条码
};

var writeStrArr = [0, '', ''];
var writeAddArr = ['DBW100', 'DBB110', 'DBB120'];

// 给PLC写值
function writeValuesToPLC(add, values) {
  const index = writeAddArr.indexOf(add);
  if (index !== -1) {
    writeStrArr[index] = values;
  } else {
    console.warn(`Address ${add} not found in writeAddArr.`);
  }
}

// 单独给PLC某个变量写值，通过操作批量写入数组实现，避免写入冲突
function writeSingleValueToPLC(add, values) {
  if (!variables[add]) {
    console.warn(`Address ${add} not found in variables.`);
    return;
  }

  // 查找地址在批量写入数组中的索引
  const index = writeAddArr.indexOf(add);

  if (index !== -1) {
    // 地址已存在，直接更新值（这个操作是原子的）
    writeStrArr[index] = values;
    console.log(`更新PLC地址 ${add} 的值为：${values}`);
  } else {
    // 地址不存在，使用原子性操作添加到批量写入数组
    const newAddArr = [...writeAddArr, add];
    const newStrArr = [...writeStrArr, values];

    // 原子性替换数组内容
    writeAddArr.length = 0;
    writeStrArr.length = 0;
    writeAddArr.push(...newAddArr);
    writeStrArr.push(...newStrArr);

    console.log(`添加PLC地址 ${add} 到批量写入数组，值：${values}`);
  }
}

// 取消PLC某个变量的写入，从批量写入数组中移除
function cancelWriteToPLC(add) {
  // 使用 filter 方法重建数组，避免 splice 的并发问题
  const originalLength = writeAddArr.length;
  const newAddArr = [];
  const newStrArr = [];

  for (let i = 0; i < writeAddArr.length; i++) {
    if (writeAddArr[i] !== add) {
      newAddArr.push(writeAddArr[i]);
      newStrArr.push(writeStrArr[i]);
    }
  }

  // 检查是否找到并移除了地址
  if (newAddArr.length === originalLength) {
    console.warn(`Address ${add} not found in writeAddArr, cannot cancel.`);
    return false;
  }

  // 原子性替换数组内容
  writeAddArr.length = 0;
  writeStrArr.length = 0;
  writeAddArr.push(...newAddArr);
  writeStrArr.push(...newStrArr);

  console.log(`已从批量写入数组中移除PLC地址：${add}`);

  // 验证数组长度一致性
  if (writeAddArr.length !== writeStrArr.length) {
    console.error(
      `数组长度不一致！地址数组长度：${writeAddArr.length}，值数组长度：${writeStrArr.length}`
    );
  }

  return true;
}

function valuesWritten(anythingBad) {
  if (anythingBad) {
    console.log('SOMETHING WENT WRONG WRITING VALUES!!!!');
  }
}

function valuesReady(anythingBad, values) {
  if (anythingBad) {
    console.log('SOMETHING WENT WRONG READING VALUES!!!!');
  }
  // console.log(values)
  mainWindow.webContents.send('receivedMsg', values, writeStrArr.toString());
}

const setAppTray = () => {
  // 系统托盘右键菜单
  var trayMenuTemplate = [
    {
      label: '退出',
      click: function () {
        app.quit();
      }
    }
  ];

  console.log();
  // 系统托盘图标目录
  appTray = new Tray(path.join(__static, './icon.ico'));

  // 图标的上下文菜单
  const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);

  // 设置此托盘图标的悬停提示内容
  appTray.setToolTip('WCS系统');

  // 设置此图标的上下文菜单
  appTray.setContextMenu(contextMenu);

  appTray.on('click', function () {
    //主窗口显示隐藏切换
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    } else {
      mainWindow.show();
      mainWindow.setSkipTaskbar(false);
    }
  });
};
