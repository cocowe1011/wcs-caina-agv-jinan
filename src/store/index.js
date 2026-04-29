import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    isLocked: false,
    userRole: ''
  },
  getters: {
    isLocked: (state) => state.isLocked,
    isAdmin: (state) => state.userRole === 'ADMIN',
    isOperator: (state) => state.userRole === 'OPERATOR'
  },
  mutations: {
    SET_LOCKED(state, locked) {
      state.isLocked = locked;
    },
    SET_USER_ROLE(state, role) {
      state.userRole = role;
    }
  },
  actions: {},
  modules: {}
});
