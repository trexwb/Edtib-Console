<!--
 * @Author: trexwb
 * @Date: 2025-04-02 11:48:42
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-15 15:45:00
 * @FilePath: /console/web/src/views/wikis/calculations/vabAutoComponents/CalculationsMdEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="md-editor-container no-background-container">
    <v-md-editor v-model="detailForm" :disabled-menus="[]" @upload-image="handleUploadImage" @save="handleSave" />
  </div>
</template>

<script lang="ts" setup>
import VMdEditor from '@kangc/v-md-editor'
import '@kangc/v-md-editor/lib/style/base-editor.css'
import githubTheme from '@kangc/v-md-editor/lib/theme/github'
import '@kangc/v-md-editor/lib/theme/style/github.css'
import { getUUID } from '/@/utils/index'

import type { UploadInstance, UploadProps, UploadUserFile } from 'element-plus'
import { getStorage, setStorage } from '/@/utils/storage'
import { getSign } from '/@/api/attachment'

defineOptions({
  name: 'MdEditor',
})

const props = defineProps({
  language: {
    type: String,
    default: 'zh-cn',
  },
  detail: {
    type: String,
    default: '',
  },
})

const detailForm = ref<any>(props.detail)
const action = ref<string>('/')
const uploadData = ref<any>({})
const emit = defineEmits(['update-from', 'save'])
const uploadConfig = reactive<any>(
  getStorage('uploadConfig') || {
    host: '',
    viewUrl: '',
    policy: '',
    signature: '',
    ossAccessKeyId: '',
    dir: '',
    callback: '',
    "x:param": '',
    expiration: 0,
  }
)

const getUploadConfig = async (fileName: string) => {
  const timeStamp = Math.floor(Date.now() / 1000)
  if (!uploadConfig['policy'] || !uploadConfig['signature'] || !uploadConfig['ossAccessKeyId'] || !uploadConfig['expiration'] || uploadConfig['expiration'] < timeStamp + 60) {
    const { data } = await getSign({ open: true })
    if (data['host']) uploadConfig['host'] = data['host'] || ''
    if (data['viewUrl']) uploadConfig['viewUrl'] = data['viewUrl'] || ''
    if (data['policy']) uploadConfig['policy'] = data['policy'] || ''
    if (data['signature']) uploadConfig['signature'] = data['signature'] || ''
    if (data['ossAccessKeyId']) uploadConfig['ossAccessKeyId'] = data['ossAccessKeyId'] || ''
    if (data['dir']) uploadConfig['dir'] = data['dir'] || ''
    if (data['callback']) uploadConfig['callback'] = data['callback'] || ''
    if (data['x:param']) uploadConfig['x:param'] = data['x:param']
    if (data['expiration']) uploadConfig['expiration'] = data['expiration'] || ''
    setStorage('uploadConfig', uploadConfig)
  }
  action.value = uploadConfig.host
  uploadData.value = {
    'policy': uploadConfig['policy'],
    'signature': uploadConfig['signature'],
    'ossAccessKeyId': uploadConfig['ossAccessKeyId'],
    'name': `${fileName === '' ? uploadData.value.fileName : fileName}`,
    'key': `${uploadConfig['dir']}${fileName === '' ? uploadData.value.fileName : fileName}`,
    'callback': uploadConfig['callback'],
    'x:param': uploadConfig['x:param'],
  }
}

const uploadSubmit = async (file: any) => {
  // 创建FormData 对象
  const formData = new FormData()
  // 添加文件到 formData
  Object.keys(uploadData.value).forEach((key) => {
    formData.append(key, uploadData.value[key])
  })
  formData.append('file', file)

  // 配置 Axios 请求
  return axios
    .post(action.value, formData, {
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

const handleUploadImage = async (
  event: Event,
  insertImage: (options: { url: string; desc?: string }) => void,
  files: FileList  // 注意实际参数可能是FileList类型
) => {
  // 拿到 files 之后上传到文件服务器，然后向编辑框中插入对应的内容
  if (files[0]) {
    const file = files[0]
    const fileName = `${getUUID()}${file.lastModified}.${(file.name).split('.').pop()}`
    await getUploadConfig(fileName)
    const data: any = await uploadSubmit(file)

    // 此处只做示例
    insertImage({
      url: `${uploadConfig.viewUrl}${uploadConfig['dir']}${fileName}`,
      desc: file.name,
      // width: 'auto',
      // height: 'auto',
    });
  }
}

const handleSave = (text: string, html?: string) => {
  console.log(text, html);
}

watch(
  detailForm,
  () => {
    emit('update-from', {
      language: props.language,
      detail: (detailForm.value === '') ? '' : detailForm.value
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

VMdEditor.use(githubTheme)
</script>

<style lang="scss" scoped>
.md-editor-container {
  :deep() {
    .v-md-editor {
      min-height: calc(var(--el-container-height) - var(--el-margin));
      background: var(--el-color-white);
      border: 1px solid var(--el-border-color);
      border-radius: var(--el-border-radius-base);
      box-shadow: none;
      transition: var(--el-transition);

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
