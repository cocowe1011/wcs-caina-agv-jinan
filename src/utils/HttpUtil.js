import axios from 'axios';

const HttpUtil = axios.create({
  baseURL: process.env.VUE_APP_BASE_URL,
  timeout: 5000 // 请求超时时间
});

// 添加响应拦截器
HttpUtil.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    return response.data;
  },
  (error) => {
    // 对响应错误做点什么
    return Promise.reject(error);
  }
);

export default HttpUtil;
