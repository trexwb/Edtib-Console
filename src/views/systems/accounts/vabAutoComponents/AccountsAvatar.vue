<!--
 * @Author: trexwb
 * @Date: 2025-03-27 09:41:33
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-15 15:44:54
 * @FilePath: /console/web/src/views/systems/accounts/vabAutoComponents/AccountsAvatar.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <vab-draggable v-if="state.isLimit" v-model="fileList" item-key="icon" v-bind="dragOptions" @end="onEnd"
    class="el-upload-list el-upload-list--picture-card">
    <template #item="{ element: item, index }">
      <view class="el-upload-list__item is-success">
        <el-image alt="Preview Image" :src="item.url" />
        <span class="el-upload-list__item-actions">
          <span class="el-upload-list__item-preview">
            <vab-icon icon="zoom-in-line" @click="handlePictureCardPreview(item)" />
          </span>
          <span class="el-upload-list__item-delete">
            <i class="el-icon el-icon--delete">
              <vab-icon icon="delete-bin-5-fill" @click="handleRemoveKey(index)" />
            </i>
          </span>
        </span>
      </view>
    </template>
  </vab-draggable>
  <el-upload v-if="!state.isLimit" ref="uploadRef" v-model:file-list="fileList" :action="action" :auto-upload="true"
    :data="uploadData" :headers="headers" :limit="1" list-type="picture-card" :accept="accept" :multiple="true"
    :before-upload="beforeUpload" :on-change="handleChange" :on-error="handleError"
    :on-preview="handlePictureCardPreview" :on-success="handleSuccess" :on-remove="handleRemove"
    :show-file-list="state.showFileList">
    <el-icon>
      <Plus />
    </el-icon>
  </el-upload>
  <el-dialog v-model="dialogVisible" append-to-body :draggable="false">
    <el-image alt="Preview Image" :src="dialogImageUrl" />
  </el-dialog>
</template>

<script lang="ts" setup>
import { Plus } from '@element-plus/icons-vue'
import { getSign } from '/@/api/attachment'

import VabDraggable from 'vuedraggable'

import type { UploadInstance, UploadProps, UploadUserFile } from 'element-plus'
import { getStorage, setStorage } from '/@/utils/storage'

const uploadRef = ref<UploadInstance>()
const state = reactive<any>({
  showFileList: true,
  try: 0,
  isLimit: false
})

const dragOptions = computed(() => {
  return {
    animation: 600,
    group: 'description',
    disabled: false,
    ghostClass: 'ghost',
  }
})

const onEnd = () => {
  onChange(fileList.value)
}

const props = defineProps({
  files: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  accept: {
    type: String,
    default: '*',
  },
})

const action = ref<string>('/')
const headers = ref<any>({})
const uploadData = ref<any>({})
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

const emit = defineEmits(['change-files'])
const fileList = ref<UploadUserFile[]>([])

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

const beforeUpload: UploadProps['beforeUpload'] = async (rawFile) => {
  // console.log('rawFile:', rawFile)
  const fileName = `${rawFile.uid}${rawFile.lastModified}.${(rawFile.name).split('.').pop()}`
  await getUploadConfig(fileName)
  state.try = 0
  state.showFileList = true
  await nextTick()
}
const handleRemoveKey = async (index: number) => {
  fileList.value.splice(index, 1)
  onChange()
}

const handleChange: UploadProps['onChange'] = async (uploadFile, uploadFiles) => {
  // console.log('handleChange:uploadFile:', uploadFile)
  // console.log('handleChange:uploadFiles:', JSON.stringify(uploadFiles))
  // onChange()
}

const handleRemove: UploadProps['onChange'] = async (uploadFile, uploadFiles) => {
  // console.log('handleRemove:uploadFile:', uploadFile)
  // console.log('handleRemove:uploadFiles:', JSON.stringify(uploadFiles))
  onChange()
}

const handleSuccess: UploadProps['onSuccess'] = async (response, uploadFile, uploadFiles) => {
  // console.log('response:', response)
  // console.log('uploadFile:', uploadFile)
  // console.log('uploadFiles:', uploadFiles)
  onChange()
  // 此时可以利用ext-param将文件进行标记
  // let uploadSuccess = 0
  // uploadFiles.forEach(async (item: any, index: number) => {
  //   if (item.status === 'success') {
  //     uploadSuccess++
  //   }
  //   if (uploadSuccess >= uploadFiles.length) {
  //     state.showFileList = false
  //     await nextTick()
  //     onChange(uploadFiles)
  //   }
  // })
  // state.isLimit = uploadSuccess > 0
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

const onChange: any = async () => {
  const files = fileList.value.map((item: any) => {
    let row = {
      name: item.name || '',
      url: item.url || '',
    }
    if (item?.raw?.lastModified && item?.raw?.uid && item?.raw?.name) {
      const fileName = `${item.raw?.uid}${item.raw?.lastModified}.${(item.raw?.name).split('.').pop()}`
      row.url = item.status === "success" ? `${uploadConfig.viewUrl}${uploadConfig.dir}${fileName}` : item.url
    } else if (item.response?.url) {
      row.url = item.status === "success" ? item.response?.url : item.url
    }
    return row
  })
  state.isLimit = fileList.value.length > 0
  emit('change-files', files, props.name)
}

const dialogImageUrl = ref<string | undefined>('')
const dialogVisible = ref<boolean>(false)

const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url
  dialogVisible.value = true
}

watch(
  props,
  () => {
    fileList.value = []
    if (props.files) {
      fileList.value = [
        {
          name: 'avatar',
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