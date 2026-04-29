import { mapGetters } from 'vuex';

/**
 * 权限控制混入
 * 提供 isOperator 计算属性，操作员角色为只读模式
 * 使用方式：在组件中 mixins: [permissionMixin]
 * 然后在根元素上绑定 :class="{ 'readonly-mode': isOperator }"
 */
export default {
  computed: {
    ...mapGetters(['isOperator'])
  }
};
