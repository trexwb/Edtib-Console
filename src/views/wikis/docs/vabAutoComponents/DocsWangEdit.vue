<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:16:38
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-15 15:45:16
 * @FilePath: /console/web/src/views/wikis/docs/vabAutoComponents/DocsWangEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="wang-editor-container">
    <toolbar v-if="!disable" :default-config="toolbarConfig" :editor="editorRef"
      style="border-bottom: 1px solid var(--el-border-color)" />
    <editor v-model="detailForm" class="wang-editor-content" :default-config="editorConfig"
      @on-created="handleCreated" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { ref, watch } from 'vue'
// import VMdEditor from '@kangc/v-md-editor'
// import '@kangc/v-md-editor/lib/style/base-editor.css'
// import githubTheme from '@kangc/v-md-editor/lib/theme/github'
// import '@kangc/v-md-editor/lib/theme/style/github.css'

import { getSign } from '/@/api/attachment'
import { getStorage, setStorage } from '/@/utils/storage'

import { IDomEditor } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const emit = defineEmits(['update-from'])
const uploadConfig = reactive<any>(
  getStorage('uploadConfig') || {
    formUrl: '',
    viewUrl: '',
    policy: '',
    authorization: false,
    expiration: 0,
  }
)

const editorRef = shallowRef<IDomEditor | undefined>(undefined)
const toolbarConfig = ref<any>({})
const editorConfig = ref<any>({
  placeholder: translate('请输入内容...'),
  MENU_CONF: {
    uploadImage: {
      server: '/api/upload',
      // form-data fieldName ，默认值 'wangeditor-uploaded-image'
      fieldName: 'file',
      // 单个文件的最大体积限制，默认为 2M
      maxFileSize: 1 * 1024 * 1024, // 1M
      // 最多可上传几个文件，默认为 100
      maxNumberOfFiles: 10,
      // 选择文件时的类型限制，默认为 ['image/*'] 。如不想限制，则设置为 []
      allowedFileTypes: ['image/*'],
      // 自定义上传参数，例如传递验证的 token 等。参数会被添加到 formData 中，一起上传到服务端。
      meta: {},
      // 将 meta 拼接到 url 参数中，默认 false
      metaWithUrl: false,
      // 自定义增加 http  header
      headers: {},
      // 跨域是否传递 cookie ，默认为 false
      withCredentials: true,
      // 超时时间，默认为 10 秒
      timeout: 5 * 1000, // 5 秒
      // 自定义上传
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async customUpload(file: any, insertFn: any) {
        // file 即选中的文件
        // 自己实现上传，并得到图片 url alt href
        // 最后插入图片
        // insertFn(url, alt, href)
        // console.log(file)
        await getUploadConfig()
        const data: any = await uploadData(file)
        if (data.url) {
          insertFn(`${uploadConfig.viewUrl}${data.url}`, data.alt || '', data.href || '')
        }
      },
    },
    uploadVideo: {
      server: '/api/upload',
      // form-data fieldName ，默认值 'wangeditor-uploaded-video'
      fieldName: 'file',
      // 单个文件的最大体积限制，默认为 10M
      maxFileSize: 5 * 1024 * 1024, // 5M
      // 最多可上传几个文件，默认为 5
      maxNumberOfFiles: 3,
      // 选择文件时的类型限制，默认为 ['video/*'] 。如不想限制，则设置为 []
      allowedFileTypes: ['video/*'],
      // 自定义上传参数，例如传递验证的 token 等。参数会被添加到 formData 中，一起上传到服务端。
      meta: {
        token: 'xxx',
        otherKey: 'yyy',
      },
      // 将 meta 拼接到 url 参数中，默认 false
      metaWithUrl: false,
      // 自定义增加 http  header
      headers: {
        Accept: 'text/x-json',
        otherKey: 'xxx',
      },
      // 跨域是否传递 cookie ，默认为 false
      withCredentials: true,
      // 超时时间，默认为 30 秒
      timeout: 15 * 1000, // 15 秒
      // 视频不支持 base64 格式插入
      // 自定义上传
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async customUpload(file: any, insertFn: any) {
        // file 即选中的文件
        // 自己实现上传，并得到图片 url alt href
        // 最后插入图片
        // insertFn(url, alt, href)
        const data: any = await uploadData(file)
        if (data.url) {
          insertFn(`${uploadConfig.viewUrl}${data.url}`, data.poster || '')
        }
      },
    },
  },
})

const props = defineProps({
  disable: {
    type: Boolean,
    default: false,
  },
  language: {
    type: String,
    default: 'zh-cn',
  },
  detail: {
    type: String,
    default: '',
  },
})

const detailForm = ref<any>()

const getUploadConfig = async () => {
  const timeStamp = Math.floor(Date.now() / 1000)
  if (!uploadConfig.authorization || !uploadConfig.expiration || uploadConfig.expiration < timeStamp + 60) {
    const { data } = await getSign({ open: true })
    if (data.formUrl) uploadConfig.formUrl = data.formUrl
    if (data.policy) uploadConfig.policy = data.policy
    if (data.viewUrl) uploadConfig.viewUrl = data.viewUrl
    if (data.authorization) uploadConfig.authorization = data.authorization
    if (data.expiration) uploadConfig.expiration = data.expiration
    setStorage('uploadConfig', uploadConfig)
  }
}

const uploadData = async (file: any) => {
  await getUploadConfig()
  // 创建FormData 对象
  const formData = new FormData()
  // 添加文件到 formData
  formData.append('file', file)
  formData.append('policy', uploadConfig.policy)
  formData.append('authorization', uploadConfig.authorization)

  // 配置 Axios 请求
  return axios
    .post(uploadConfig.formUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => {
      // 处理上传成功的响应
      return response.data
      // console.log('上传成功:', response.data)
    })
    .catch(async (error) => {
      // 处理上传失败或错误情况
      console.error('上传失败:', error)
    })
}

const handleCreated = (editor: IDomEditor) => {
  editorRef.value = editor
  if (props.disable) {
    editorRef.value.disable()
  } else {
    editorRef.value.enable()
  }
}

const handleEditorDestroy = async () => {
  editorRef.value?.destroy() // 销毁编辑器
  await nextTick()
}

const setHtml = (html: string) => {
  try {
    editorRef.value?.setHtml(html)
  } catch (error) {
    console.log(error, html)
  }
}

defineExpose({
  setHtml,
  handleEditorDestroy,
})

watch(
  detailForm,
  () => {
    emit('update-from', {
      language: props.language,
      detail: detailForm.value === '<p><br></p>' ? '' : detailForm.value,
    })
  },
  { immediate: true, deep: true }
)

watch(
  props,
  () => {
    detailForm.value = props.detail
  },
  { immediate: true, deep: true }
)

onMounted(() => { })
onBeforeUnmount(() => { })
</script>

<style lang="scss" scoped>
.wang-editor-container {
  padding: 0 !important;
  margin: -10px;
  overflow: hidden !important;
  background: var(--el-background-color) !important;
  border: 0 !important;

  &.w-e-full-screen-container {
    z-index: 9999 !important;
    height: 100% !important;

    .wang-editor-content {
      max-height: 100% !important;
    }
  }

  [classname='w-e-toolbar-init'] {
    border-bottom: 1px solid var(--el-border-color) !important;
  }

  .wang-editor-content {
    width: 100%;
    min-height: calc(var(--el-container-height) - 250px) !important;
    margin: 0;
    background-color: var(--el-color-white);
    max-height: calc(var(--el-container-height) - 150px) !important;
    overflow: scroll !important;
  }

  #w-e-textarea-1 {
    margin: var(--el-margin) !important;
  }

  .wang-editor-footer {
    width: 70%;
    margin: auto;
  }

  @media (max-width: 768px) {

    .wang-editor-title,
    .wang-editor-content,
    .wang-editor-footer {
      width: 90%;
    }
  }
}

.md-editor-container {
  :deep() {
    .v-md-editor {
      min-height: calc(var(--el-container-height) - var(--el-margin));
      background: var(--el-color-white);
      border: 1px solid var(--el-border-color);
      border-radius: var(--el-border-radius-base);
      box-shadow: none;
      transition: var(--el-transition);
      min-height: 500px;

      &--fullscreen {
        z-index: 9999;
        border-radius: 0;
      }

      &__toolbar {
        border-bottom: 1px solid var(--el-border-color);

        &-divider:before {
          border-left: 1px solid var(--el-border-color);
        }

        &-item {
          color: var(--el-color-grey);

          &--active,
          &:hover {
            color: var(--el-color-white);
            background: var(--el-color-grey);
          }
        }
      }

      &__editor-wrapper {
        border-right: 1px solid var(--el-border-color);
      }

      .v-md-textarea-editor pre,
      .v-md-textarea-editor textarea {
        color: var(--el-color-black);
        background-color: var(--el-color-white);
      }

      .github-markdown-body h1,
      .github-markdown-body h2 {
        border-bottom: 1px solid var(--el-border-color);
      }
    }

    @media (max-width: 768px) {
      .v-md-editor {

        &__toolbar-right,
        &__toolbar-divider {
          display: none;
        }

        &__main {
          flex-direction: column !important;
          overflow-y: auto;
        }

        &__preview-wrapper {
          border-top: 1px solid var(--el-border-color);
        }

        &__editor-wrapper,
        &__preview-wrapper {
          display: flex;
          flex-direction: column;
          height: auto;
          min-height: 100vh;
          overflow: hidden;
        }
      }
    }
  }
}
</style>
