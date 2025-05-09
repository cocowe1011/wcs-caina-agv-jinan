import axios from 'axios';

const HttpUtilAGV = axios.create({
  baseURL: process.env.VUE_APP_AGV_BASE_URL,
  timeout: 5000 // 请求超时时间
});

// 添加请求拦截器
HttpUtilAGV.interceptors.request.use(
  (config) => {
    // 添加X-LR-REQUEST-ID头部
    config.headers['X-LR-REQUEST-ID'] = Date.now().toString();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
HttpUtilAGV.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    return response.data;
  },
  (error) => {
    // 对响应错误做点什么
    return Promise.reject(error);
  }
);

export default HttpUtilAGV;
