<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/vabAutoComponents/SubscriptionGrant.vue
 * @Description: 后台赠送/延长订阅弹窗（source=3；不选计划可仅按天数顺延；按计划同步发放赠送积分）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-dialog v-model="state.dialogFormVisible" :title="translate('后台赠送/延长订阅')" width="520px" @close="handleClose">
    <el-form ref="formRef" label-width="110px" :model="form" :rules="rules">
      <el-form-item :label="translate('客户')" prop="customerId">
        <el-input v-model.trim="form.customerId" clearable :placeholder="translate('支持客户ID/手机号/邮箱/昵称，须唯一命中')" />
      </el-form-item>
      <el-form-item :label="translate('订阅计划')" prop="planId">
        <el-select v-model="form.planId" clearable filterable :placeholder="translate('不选则仅按天数顺延')"
          @change="handlePlanChange">
          <el-option v-for="plan in plans" :key="plan.id" :label="plan.planName" :value="plan.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="translate('赠送天数')" prop="days">
        <el-input-number v-model="form.days" :max="3650" :min="1" :step="1" />
        <div class="form-tip">{{ translate('不填则取所选计划时长；未过期则叠加顺延，已过期从当前时间起算') }}</div>
      </el-form-item>
      <el-form-item :label="translate('备注')" prop="remark">
        <el-input v-model.trim="form.remark" :maxlength="200" :placeholder="translate('赠送原因（选填）')"
          type="textarea" />
      </el-form-item>
      <el-alert :closable="false" show-icon
        :title="translate('所选计划配置了赠送积分时，将同步发放至客户钱包（流水来源：订阅赠送）')" type="info" />
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ translate('取消') }}</el-button>
      <el-button :loading="state.loading" type="primary" @click="handleConfirm">{{ translate('确定') }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { fastenerCommerceSubscriptionGrant, fastenerCommerceSubscriptionPlans } from '/@/api/fastenerCommerce'
import { ElMessage } from 'element-plus'

const templateName = 'FastenerCommerceSubscriptionGrant'
defineOptions({
  name: templateName,
})

const emit = defineEmits(['success'])

const formRef = ref<any>(null)

const state = reactive({
  dialogFormVisible: false,
  loading: false,
})

const plans = ref<any[]>([])

const form = reactive({
  customerId: '' as string | number,
  planId: '' as number | string,
  days: undefined as number | undefined,
  remark: '',
})

const rules = reactive({
  customerId: [{ required: true, message: '请输入客户ID/手机号/邮箱/昵称', trigger: 'blur' }],
  planId: [
    {
      required: true,
      validator: (_rule: any, value: number | string, callback: any) => {
        // 计划可留空（仅按天数顺延），但此时必须显式填写天数
        if (!value && !form.days) callback(new Error('不选计划时须填写赠送天数'))
        else callback()
      },
      trigger: 'change',
    },
  ],
})

const fetchPlans = async () => {
  try {
    const res: any = await fastenerCommerceSubscriptionPlans({ page: 1, pageSize: 200 })
    plans.value = (res?.data?.data || []).map((row: any) => ({
      id: row.id,
      planName: `${row.plan_name || '-'}（${Number(row.durationDays || 0)} 天）`,
      durationDays: Number(row.durationDays || 0),
    }))
  } catch (error) {
    console.error('Fetch subscription plans error:', error)
  }
}

/** 选择计划后自动带出计划时长（可再手工覆盖） */
const handlePlanChange = (value: number | string) => {
  const matched = plans.value.find((plan) => Number(plan.id) === Number(value))
  if (matched?.durationDays) form.days = matched.durationDays
}

const showGrant = (row: any = null) => {
  form.customerId = row?.customerId ? String(row.customerId) : ''
  form.planId = row?.planId ? Number(row.planId) : ''
  form.days = undefined
  form.remark = ''
  if (form.planId) handlePlanChange(form.planId)
  if (!plans.value.length) fetchPlans()
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
      await fastenerCommerceSubscriptionGrant({
        customerId: form.customerId,
        planId: form.planId || undefined,
        days: form.days === undefined || form.days === null ? undefined : Number(form.days),
        remark: form.remark,
      })
      ElMessage({ message: translate('赠送成功'), type: 'success' })
      state.dialogFormVisible = false
      emit('success')
    } catch (error) {
      console.error('Subscription grant error:', error)
    }
    state.loading = false
  })
}

defineExpose({ showGrant })

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
