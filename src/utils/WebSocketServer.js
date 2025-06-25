const WebSocket = require('ws');

class AlarmWebSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // 存储连接的客户端信息
    this.isRunning = false;

    this.init();
  }

  init() {
    try {
      this.wss = new WebSocket.Server({
        port: this.port,
        verifyClient: (info) => {
          // 允许跨域连接
          return true;
        }
      });

      this.wss.on('connection', (ws, req) => {
        const clientId = this.generateClientId();
        const clientInfo = {
          id: clientId,
          ws: ws,
          workshop: null, // 2500 或 2800
          userAgent: req.headers['user-agent'] || 'Unknown',
          ip:
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'Unknown',
          connectedAt: new Date(),
          lastPing: Date.now()
        };

        this.clients.set(clientId, clientInfo);
        console.log(`移动端客户端连接: ${clientId}, IP: ${clientInfo.ip}`);

        // 发送连接成功消息
        this.sendToClient(clientId, {
          type: 'connected',
          clientId: clientId,
          message: '连接成功'
        });

        // 处理消息
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleClientMessage(clientId, data);
          } catch (error) {
            console.error('解析客户端消息失败:', error);
          }
        });

        // 处理连接关闭
        ws.on('close', () => {
          console.log(`移动端客户端断开连接: ${clientId}`);
          this.clients.delete(clientId);
        });

        // 处理连接错误
        ws.on('error', (error) => {
          console.error(`客户端连接错误 ${clientId}:`, error);
          this.clients.delete(clientId);
        });

        // 设置心跳检测
        ws.on('pong', () => {
          if (this.clients.has(clientId)) {
            this.clients.get(clientId).lastPing = Date.now();
          }
        });
      });

      this.wss.on('listening', () => {
        console.log(`报警日志WebSocket服务器启动成功，端口: ${this.port}`);
        this.isRunning = true;
      });

      this.wss.on('error', (error) => {
        console.error('WebSocket服务器错误:', error);
        this.isRunning = false;
      });

      // 启动心跳检测
      this.startHeartbeat();
    } catch (error) {
      console.error('WebSocket服务器初始化失败:', error);
      this.isRunning = false;
    }
  }

  // 处理客户端消息
  handleClientMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'register':
        // 客户端注册车间信息
        client.workshop = data.workshop; // '2500' 或 '2800'
        console.log(`客户端 ${clientId} 注册为 ${data.workshop} 车间`);
        this.sendToClient(clientId, {
          type: 'registered',
          workshop: data.workshop,
          message: `已注册为${data.workshop}车间`
        });
        break;

      case 'ping':
        // 心跳包
        client.lastPing = Date.now();
        this.sendToClient(clientId, { type: 'pong' });
        break;

      default:
        console.log(`收到客户端 ${clientId} 未知消息类型:`, data.type);
    }
  }

  // 推送报警日志到对应车间的移动端
  pushAlarmToWorkshop(workshop, alarmData) {
    if (!this.isRunning) {
      console.warn('WebSocket服务器未运行，无法推送报警');
      return false;
    }

    const message = {
      type: 'alarm',
      workshop: workshop,
      data: alarmData,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (
        client.workshop === workshop &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(clientId, message);
        sentCount++;
      }
    });

    console.log(`推送${workshop}车间报警到 ${sentCount} 个移动端客户端`);
    return sentCount > 0;
  }

  // 发送消息给指定客户端
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`发送消息给客户端 ${clientId} 失败:`, error);
        this.clients.delete(clientId);
        return false;
      }
    }
    return false;
  }

  // 广播消息给所有客户端
  broadcast(message) {
    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    });
    return sentCount;
  }

  // 获取连接的客户端列表
  getConnectedClients() {
    const clientList = [];
    this.clients.forEach((client, clientId) => {
      clientList.push({
        id: clientId,
        workshop: client.workshop || '未指定',
        ip: client.ip,
        userAgent: client.userAgent,
        connectedAt: client.connectedAt,
        lastPing: new Date(client.lastPing),
        status: client.ws.readyState === WebSocket.OPEN ? '在线' : '离线'
      });
    });
    return clientList;
  }

  // 生成客户端ID
  generateClientId() {
    return `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 心跳检测
  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          // 检查是否超时（30秒无响应）
          if (now - client.lastPing > 30000) {
            console.log(`客户端 ${clientId} 心跳超时，关闭连接`);
            client.ws.terminate();
            this.clients.delete(clientId);
          } else {
            // 发送ping
            client.ws.ping();
          }
        } else {
          // 清理已断开的连接
          this.clients.delete(clientId);
        }
      });
    }, 15000); // 每15秒检查一次
  }

  // 关闭服务器
  close() {
    if (this.wss) {
      this.wss.close();
      this.isRunning = false;
      console.log('WebSocket服务器已关闭');
    }
  }

  // 获取服务器状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      clientCount: this.clients.size,
      clients: this.getConnectedClients()
    };
  }
}

module.exports = AlarmWebSocketServer;
