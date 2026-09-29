<!--
 * @Author: trexwb
 * @Date: 2025-03-27 09:41:33
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-05-19 09:04:09
 * @FilePath: /console/web/src/views/wikis/docs/vabAutoComponents/DocsUpload.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-upload ref="uploadRef" v-model:file-list="fileList" :action="action" :auto-upload="true" :data="uploadData"
    :headers="headers" :limit="1" list-type="text" :accept="accept" :multiple="false" :before-upload="beforeUpload"
    :on-change="handleChange" :on-error="handleError" :on-success="handleSuccess">
    <el-icon>
      <Plus />
    </el-icon>
  </el-upload>
</template>

<script lang="ts" setup>
import { Plus } from '@element-plus/icons-vue'
import { getSign } from '/@/api/attachment'

import type { UploadInstance, UploadProps, UploadUserFile } from 'element-plus'
import { getStorage, setStorage } from '/@/utils/storage'

const uploadRef = ref<UploadInstance>()
const state = reactive<any>({
  showFileList: true,
  try: 0,
  isLimit: false,
  rawFileName: ''
})

const props = defineProps({
  files: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  accept: {
    type: String,
    default: '*',
  },
  isOpen: {
    type: Boolean,
    default: false,
  }
})

const action = ref<string>('/')
const headers = ref<any>({})
const uploadData = ref<any>({})
const uploadConfig = reactive<any>(
  getStorage(props.isOpen ? 'uploadConfig' : 'uploadClosedConfig') || {
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

const emit = defineEmits(['change-files'])
const fileList = ref<UploadUserFile[]>([])

const fetchData = async () => {
  const { data } = await getSign({ open: props.isOpen || false })
  return data
}

const getUploadConfig = async (fileName: string) => {
  const timeStamp = Math.floor(Date.now() / 1000)
  if (!uploadConfig['policy'] || !uploadConfig['signature'] || !uploadConfig['ossAccessKeyId'] || !uploadConfig['expiration'] || uploadConfig['expiration'] < timeStamp + 60) {
    const data = await fetchData()
    if (data['host']) uploadConfig['host'] = data['host'] || ''
    if (data['viewUrl']) uploadConfig['viewUrl'] = data['viewUrl'] || ''
    if (data['policy']) uploadConfig['policy'] = data['policy'] || ''
    if (data['signature']) uploadConfig['signature'] = data['signature'] || ''
    if (data['ossAccessKeyId']) uploadConfig['ossAccessKeyId'] = data['ossAccessKeyId'] || ''
    if (data['dir']) uploadConfig['dir'] = data['dir'] || ''
    if (data['callback']) uploadConfig['callback'] = data['callback'] || ''
    if (data['x:param']) uploadConfig['x:param'] = data['x:param']
    if (data['expiration']) uploadConfig['expiration'] = data['expiration'] || ''
    setStorage(props.isOpen ? 'uploadConfig' : 'uploadClosedConfig', uploadConfig)
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

const beforeUpload: UploadProps['beforeUpload'] = async (rawFile) => {
  // console.log('rawFile:', rawFile)
  state.rawFileName = rawFile.name
  const fileName = `${rawFile.uid}${rawFile.lastModified}.${(rawFile.name).split('.').pop()}`
  await getUploadConfig(fileName)
  state.try = 0
  state.showFileList = true
  await nextTick()
}

const handleChange: UploadProps['onChange'] = async () => {

}

const handleSuccess: UploadProps['onSuccess'] = async (response, uploadFile, uploadFiles) => {
  // console.log('response:', response)
  // console.log('uploadFile:', uploadFile)
  // console.log('uploadFiles:', uploadFiles)
  // 此时可以利用ext-param将文件进行标记
  let uploadSuccess = 0
  uploadFiles.forEach(async (item: any, index: number) => {
    if (item.status === 'success') {
      uploadSuccess++
    }
    if (uploadSuccess >= uploadFiles.length) {
      state.showFileList = false
      await nextTick()
      onChange(uploadFiles)
    }
  })
  state.isLimit = uploadSuccess > 0
}

const handleError: UploadProps['onError'] = async (error) => {
  uploadConfig['policy'] = false
  uploadConfig['signature'] = false
  uploadConfig['ossAccessKeyId'] = false
  if (state.try < 1) {
    state.try++
    await getUploadConfig('')
    uploadRef.value!.submit()
  }
}
const onChange: any = async (uploadFiles: any) => {
  const files = uploadFiles.map((item: any) => {
    const fileName = `${item.raw?.uid}${item.raw?.lastModified}.${(item.raw?.name).split('.').pop()}`
    return {
      name: item.name || '',
      url: item.status === "success" ? `${uploadConfig.viewUrl}${uploadConfig['dir']}${fileName}` : item.url,
    }
  })
  state.isLimit = uploadFiles.length > 0
  emit('change-files', files, state.rawFileName)
}

watch(
  props,
  () => {
    fileList.value = []
    if (props.files) {
      fileList.value = [
        {
          name: props.fileName || state.rawFileName,
          url: props.files || ''
        }
      ]
    }
    state.isLimit = fileList.value.length > 0
  },
  { immediate: true, deep: true }
)

onMounted(() => { })
onBeforeUnmount(() => { })
</script>

<style lang="scss" scoped></style>