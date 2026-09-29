<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/vabAutoComponents/SubscriptionPlanEdit.vue
 * @Description: 订阅计划新建/编辑弹窗（名称多语言、价格元→分、时长天、赠送积分、启停）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-dialog v-model="state.dialogFormVisible" :title="state.form.id ? translate('编辑计划') : translate('新建计划')"
    width="560px" @close="handleClose">
    <el-form ref="formRef" label-width="110px" :model="state.form" :rules="rules">
      <el-form-item :label="translate('计划名称')" prop="nameZh">
        <el-input v-model.trim="state.form.nameZh" :maxlength="60" :placeholder="translate('中文名称（前台展示）')" />
      </el-form-item>
      <el-form-item :label="translate('英文名称')" prop="nameEn">
        <el-input v-model.trim="state.form.nameEn" :maxlength="60" :placeholder="translate('英文名称（选填）')" />
      </el-form-item>
      <el-form-item :label="translate('价格(元)')" prop="price">
        <el-input-number v-model="state.form.price" :min="0" :precision="2" :step="1" />
        <div class="form-tip">{{ translate('前台售卖价格，提交时按角分换算（×100）存入 price 字段') }}</div>
      </el-form-item>
      <el-form-item :label="translate('原价(元)')" prop="originalPrice">
        <el-input-number v-model="state.form.originalPrice" :min="0" :precision="2" :step="1"
          :placeholder="translate('划线价（选填）')" />
      </el-form-item>
      <el-form-item :label="translate('订阅时长(天)')" prop="durationDays">
        <el-input-number v-model="state.form.durationDays" :max="3650" :min="1" :step="1" />
        <div class="form-tip">{{ translate('365 = 全年订阅，可获得全部标准及当年标准更新') }}</div>
      </el-form-item>
      <el-form-item :label="translate('赠送积分')" prop="giftCredits">
        <el-input-number v-model="state.form.giftCredits" :max="1000000" :min="0" :step="1" />
        <div class="form-tip">{{ translate('订阅成功后随单发放至客户钱包（流水来源：订阅赠送）') }}</div>
      </el-form-item>
      <el-form-item :label="translate('计划说明')" prop="description">
        <el-input v-model.trim="state.form.description" :maxlength="500" :placeholder="translate('计划说明（选填）')"
          type="textarea" />
      </el-form-item>
      <el-form-item :label="translate('排序')" prop="sort">
        <el-input-number v-model="state.form.sort" :max="9999" :min="0" :step="1" />
        <div class="form-tip">{{ translate('数值越小越靠前') }}</div>
      </el-form-item>
      <el-form-item :label="translate('状态')" prop="status">
        <el-radio-group v-model="state.form.status">
          <el-radio :label="1">{{ translate('启用') }}</el-radio>
          <el-radio :label="0">{{ translate('停用') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ translate('取消') }}</el-button>
      <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:write'] }" :loading="state.loading"
        type="primary" @click="handleConfirm">{{ translate('确定') }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { fastenerCommerceSubscriptionPlanSave } from '/@/api/fastenerCommerce'
import { ElMessage } from 'element-plus'

const templateName = 'FastenerCommerceSubscriptionPlanEdit'
defineOptions({
  name: templateName,
})

const emit = defineEmits(['success'])

const formRef = ref<any>(null)

const state = reactive({
  dialogFormVisible: false,
  loading: false,
  form: {
    id: 0,
    nameZh: '',
    nameEn: '',
    price: 0,
    originalPrice: undefined as number | undefined,
    durationDays: 365,
    giftCredits: 0,
    description: '',
    sort: 0,
    status: 1,
  },
})

const rules = reactive({
  nameZh: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入计划价格', trigger: 'blur' }],
  durationDays: [
    {
      required: true,
      validator: (_rule: any, value: number, callback: any) => {
        if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 3650) {
          callback(new Error('订阅时长须为 1~3650 的整数（天）'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
})

/** 名称多语言 JSON 取中文/英文文本（列表行 names 为对象） */
const pickName = (names: any, key: string) => {
  if (!names || typeof names !== 'object') return ''
  return names[key] ? String(names[key]) : ''
}

const showEdit = (row: any = null) => {
  state.form = {
    id: Number(row?.id || 0),
    nameZh: pickName(row?.names, 'zh_cn'),
    nameEn: pickName(row?.names, 'en_us'),
    price: row ? Number((Number(row.price || 0) / 100).toFixed(2)) : 0,
    originalPrice: row && row.originalPrice !== null && row.originalPrice !== undefined
      ? Number((Number(row.originalPrice) / 100).toFixed(2))
      : undefined,
    durationDays: row ? Number(row.durationDays || 365) : 365,
    giftCredits: row ? Number(row.giftCredits || 0) : 0,
    description: typeof row?.description === 'object' && row?.description
      ? String(row.description.zh_cn || '')
      : (row?.description || ''),
    sort: row ? Number(row.sort || 0) : 0,
    status: row ? Number(row.status) : 1,
  }
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
      const names: Record<string, string> = { zh_cn: state.form.nameZh }
      if (state.form.nameEn) names.en_us = state.form.nameEn
      await fastenerCommerceSubscriptionPlanSave({
        id: state.form.id || undefined,
        names,
        // 元 → 分（四舍五入），避免浮点尾差
        price: Math.round(Number(state.form.price) * 100),
        originalPrice: state.form.originalPrice === undefined || state.form.originalPrice === null
          ? ''
          : Math.round(Number(state.form.originalPrice) * 100),
        durationDays: Number(state.form.durationDays),
        giftCredits: Number(state.form.giftCredits),
        description: state.form.description ? { zh_cn: state.form.description } : '',
        sort: Number(state.form.sort),
        status: state.form.status,
      })
      ElMessage({ message: translate('保存成功'), type: 'success' })
      state.dialogFormVisible = false
      emit('success')
    } catch (error) {
      console.error('Subscription plan save error:', error)
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
