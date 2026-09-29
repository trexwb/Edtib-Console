<!--
 * @Author: trexwb
 * @Date: 2023-11-14 11:28:18
 * @LastEditors: ${git_name}
 * @LastEditTime: 2026-04-01 19:21:26
 * @FilePath: /console/web/src/views/login/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="login-container">
    <div class="login-right-tools">
      <vab-language />
      <vab-dark />
    </div>
    <div class="login-form">
      <img alt="" class="left-img" :src="leftImg" />
      <el-form ref="formRef" label-position="left" :model="form" :rules="rules" @submit.prevent>
        <div class="title"></div>
        <div class="title-tips">{{ title }}!</div>
        <el-form-item prop="username">
          <el-input v-model.trim="form.username" v-focus clearable :placeholder="translate('请输入用户名')" type="text">
            <template #prefix>
              <vab-icon icon="user-line" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input :key="passwordType" ref="passwordRef" v-model.trim="form.password" clearable
            :placeholder="translate('请输入密码')" :type="passwordType" @keyup.enter="handleLogin">
            <template #prefix>
              <vab-icon icon="lock-line" />
            </template>
          </el-input>
        </el-form-item>
        <!-- 验证码验证逻辑需自行开发，如不需要验证码功能建议注释 -->
        <!-- <el-form-item prop="verificationCode">
          <el-input v-model.trim="form.verificationCode" :placeholder="translate('验证码') + previewText" type="text">
            <template #prefix>
              <vab-icon icon="barcode-box-line" />
            </template>
          </el-input>
          <el-image class="code" :src="codeUrl" @click="changeCode" />
        </el-form-item> -->
        <el-button class="login-btn" :loading="loading" native-type="submit" type="primary"
          @click.prevent="handleLogin">
          {{ translate('登录') }}
        </el-button>
      </el-form>
      <vab-slider-verify :show="state.verifyShow" @close="onClose" @fail="onFail" @success="onSuccess" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import VabSliderVerify from 'vue3-puzzle-vcode'
import leftImg from '/@/assets/login_images/left_img.png'
import { translate } from '/@/i18n'
import { useSettingsStore } from '/@/store/modules/settings'
import { useUserStore } from '/@/store/modules/user'
import { getStorage, setStorage } from '/@/utils/storage'
import { isPassword } from '/@/utils/validate'

import { log } from '/@/utils'
log.info('奥德彪', '我并非无路可走 我还有死路一条! ');
log.error('奥德彪', '钱没了可以再赚，良心没了便可以赚的更多。 ');
log.warning('奥德彪', '前方的路看似很危险,实际一点也不安全。 ');
log.success('奥德彪', '出来的时候穷 生活总是让我穷 所以现在还是穷。');
log.picture('https://nimg.ws.126.net/?url=http%3A%2F%2Fdingyue.ws.126.net%2F2024%2F0514%2Fd0ea93ebj00sdgx56001xd200u000gtg00hz00a2.jpg&thumbnail=660x2147483647&quality=80&type=jpg');

defineOptions({
  name: 'Login',
})

const $baseMessage = inject<any>('$baseMessage')

const state = reactive({
  verifyShow: false,
  verifySuccess: false,
})

const onShow = () => {
  state.verifyShow = true
}

const onClose = () => {
  state.verifyShow = false
}

const onSuccess = () => {
  state.verifySuccess = true
  onClose()
  handleLogin()
}

const onFail = () => {
  state.verifySuccess = false
  $baseMessage(translate('验证失败，请重试'), 'error', 'hey')
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const login = (form: any) => userStore.login(form)
const { title } = storeToRefs(settingsStore)
const loading = ref<boolean>(false)
const passwordType = ref<string>('password')
const redirect = ref<any>(undefined)
const { handleUnLock } = settingsStore
// let timer: any
// const codeUrl = ref<string>('https://www.oschina.net/action/user/captcha')
// const previewText = ref<string>('')
const formRef = ref<any>(null)
const passwordRef = ref<any>(null)
const loginFormData = getStorage('loginFormData') || {}
const form = ref<any>(
  Object.assign(
    {
      account: loginFormData['username'] || (import.meta.env.VITE_USER_NODE_ENV === 'development' ? 'root' : ''),
      password: import.meta.env.VITE_USER_NODE_ENV === 'development' ? '6Z9SV3QBX8kIndeY' : '',
      verificationCode: '',
    },
    loginFormData
  )
)

const validateUsername = (rule: any, value: any, callback: any) => {
  if ('' === value) callback(new Error(translate('用户名不能为空')))
  else callback()
}
const validatePassword = (rule: any, value: any, callback: any) => {
  if (!isPassword(value)) callback(new Error(translate('密码不能少于6位')))
  else callback()
}

const rules = reactive<any>({
  username: [
    {
      required: true,
      trigger: 'blur',
      validator: validateUsername,
    },
  ],
  password: [
    {
      required: true,
      trigger: 'blur',
      validator: validatePassword,
    },
  ],
})

const handleRoute = () => {
  return redirect.value === '/404' || redirect.value === '/403' ? '/' : redirect.value
}

const handleLogin = async () => {
  if (loading.value) return;
  if (!state.verifySuccess) {
    onShow()
    return
  }
  if (formRef.value && state.verifySuccess)
    formRef.value.validate(async (valid: any) => {
      if (valid)
        try {
          setStorage('loginFormData', { username: form.value.username })
          loading.value = true
          await login(form.value).then(async () => {
            $baseMessage(translate('验证成功'), 'success', 'hey')
            await router.push(handleRoute())
            handleUnLock()
          }).catch((error: any) => {
            // $baseMessage(error.toString(), 'error', 'hey')
            form.value.password = import.meta.env.VITE_USER_NODE_ENV === 'development' ? '6Z9SV3QBX8kIndeY' : ''
            loading.value = false
          })
        } finally {
          loading.value = false
        }
    })
}
// const changeCode = () => {
//   codeUrl.value = `https://www.oschina.net/action/user/captcha?timestamp=${new Date().getTime()}`
// }

// onBeforeMount(() => {
//   form.value.username = 'admin'
//   form.value.password = '123456'
//   // 为了演示效果，会在官网演示页自动登录到首页，正式开发可删除
//   if (location.hostname === 'gateway-dev.edtib.com' || location.hostname === 'chu1204505056.gitee.io') {
//     previewText.value = '（演示地址验证码可不填）'
//     timer = setTimeout(() => {
//       handleLogin()
//     }, 5000)
//   }
// })

watchEffect(() => {
  redirect.value = (route.query && route.query.redirect) || '/'
})

onBeforeRouteLeave((to, from, next) => {
  // clearInterval(timer)
  next()
})
</script>

<style lang="scss" scoped>
.login-container {
  position: relative;
  height: 100vh;
  background: linear-gradient(to top, var(--el-color-primary), var(--el-color-primary-light-3));

  .login-right-tools {
    position: fixed;
    top: var(--el-margin);
    right: var(--el-margin);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--el-padding) / 2) var(--el-padding) calc(var(--el-padding) / 2) var(--el-padding);
    background: var(--el-color-white);
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
  }

  @media (max-width: 768px) {
    .login-right-tools {
      top: 5vw !important;
      right: 5vw !important;
    }

    .login-form {
      width: 90vw !important;
      margin: auto !important;

      .left-img {
        display: none !important;
      }

      :deep() {
        .el-form--default {
          width: 100% !important;
          margin-right: auto !important;
          margin-left: auto !important;
        }
      }
    }
  }

  .login-form {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 1000px;
    height: 550px;
    padding: 4.5vh;
    margin: auto;
    overflow: hidden;
    background: var(--el-color-white);
    background-size: 100% 100%;
    border: 1px solid var(--el-border-color);
    border-radius: 15px;

    .left-img {
      float: left;
      width: 50%;
    }

    :deep() {
      .el-form--default {
        float: left;
        width: 44%;
        margin-left: 5.8%;
      }

      .title {
        font-size: 54px;
        font-weight: 500;
        color: var(--el-color-black);
      }

      .title-tips {
        margin-top: 29px;
        font-size: 26px;
        font-weight: 400;
        color: var(--el-color-black);
      }

      .login-btn {
        width: 100%;
        height: 50px;
      }

      .el-form-item {
        margin: 20px 0;

        &__error {
          position: absolute;
          font-size: var(--el-font-size-small);
          line-height: 18px;
          color: var(--el-color-error);
        }

        .el-input {
          width: 100%;
          height: 48px;
          line-height: 48px;
        }
      }

      .code {
        position: absolute;
        top: 4px;
        right: 4px;
        cursor: pointer;
        border-radius: var(--el-border-radius-base);
      }
    }
  }
}
</style>
