<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/vabAutoComponents/CreditsAdjust.vue
 * @Description: 人工积分调整弹窗（delta 正数加/负数减，走钱包唯一入口）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-dialog v-model="state.dialogFormVisible" :title="translate('人工积分调整')" width="480px" @close="handleClose">
    <el-form ref="formRef" label-width="90px" :model="form" :rules="rules">
      <el-form-item :label="translate('客户')" prop="customerId">
        <el-input v-model.trim="form.customerId" clearable :placeholder="translate('支持客户ID/手机号/邮箱/昵称，须唯一命中')" />
      </el-form-item>
      <el-form-item :label="translate('调整积分')" prop="delta">
        <el-input-number v-model="form.delta" :max="1000000" :min="-1000000" :placeholder="translate('正数加/负数减')"
          :step="1" />
        <div class="form-tip">{{ translate('正数增加，负数扣减；调整后余额不足时将失败') }}</div>
      </el-form-item>
      <el-form-item :label="translate('备注')" prop="remark">
        <el-input v-model.trim="form.remark" :maxlength="200" :placeholder="translate('调整原因（选填）')" type="textarea" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ translate('取消') }}</el-button>
      <el-button :loading="state.loading" type="primary" @click="handleConfirm">{{ translate('确定') }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { fastenerCommerceCreditsAdjust } from '/@/api/fastenerCommerce'
import { ElMessage } from 'element-plus'

const templateName = 'FastenerCommerceCreditsAdjust'
defineOptions({
  name: templateName,
})

const emit = defineEmits(['success'])

const formRef = ref<any>(null)

const state = reactive({
  dialogFormVisible: false,
  loading: false,
})

const form = reactive({
  customerId: '' as string | number,
  delta: 0,
  remark: '',
})

const rules = reactive({
  customerId: [{ required: true, message: '请输入客户ID/手机号/邮箱/昵称', trigger: 'blur' }],
  delta: [
    {
      required: true,
      validator: (_rule: any, value: number, callback: any) => {
        if (!Number.isInteger(value) || value === 0) callback(new Error('调整积分须为非零整数'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
})

const showEdit = (customerId: number | string = '') => {
  form.customerId = customerId ? String(customerId) : ''
  form.delta = 0
  form.remark = ''
  state.dialogFormVisible = true
}

const handleClose = () => {
  state.dialogFormVisible = false
}

const handleConfirm = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return
    if (state.loading) return
    state.loading = true
    try {
      const res: any = await fastenerCommerceCreditsAdjust({
        customerId: form.customerId,
        delta: form.delta,
        remark: form.remark,
      })
      const target = res?.data?.customer ?? res?.data?.data?.customer
      ElMessage({
        message: target
          ? `${translate('调整成功')}：${target.nickname || target.truename || target.mobile || target.email || target.id}`
          : translate('调整成功'),
        type: 'success',
      })
      state.dialogFormVisible = false
      emit('success')
    } catch (error) {
      console.error('Credits adjust error:', error)
    }
    state.loading = false
  })
}

defineExpose({ showEdit })

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
</script>

<style lang="scss" scoped>
.form-tip {
  width: 100%;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
