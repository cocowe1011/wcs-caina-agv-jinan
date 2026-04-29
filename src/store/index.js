import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    isLocked: false
  },
  getters: {
    isLocked: (state) => state.isLocked
  },
  mutations: {
    SET_LOCKED(state, locked) {
      state.isLocked = locked;
    }
  },
  actions: {},
  modules: {}
});
