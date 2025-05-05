import { ipcRenderer } from 'electron';

// 替代remote.getGlobal方法
const getGlobal = (key) => {
  return ipcRenderer.sendSync('get-global', key);
};

// 替代remote.setGlobal方法
const setGlobal = (key, value) => {
  ipcRenderer.send('set-global', key, value);
};

export default {
  getGlobal,
  setGlobal
};
