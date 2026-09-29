<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:34:28
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-05-15 18:59:29
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsUpload.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div style="min-width: 250px;">
    <vab-draggable v-show="state.isLimit && listType != 'text'" v-model="fileList" item-key="icon" v-bind="dragOptions"
      @end="onEnd" class="el-upload-list el-upload-list--picture-card">
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
    <el-upload v-show="!state.isLimit || listType == 'text'" ref="uploadRef" v-model:file-list="fileList"
      :action="action" :auto-upload="true" :data="uploadData" :headers="headers" :limit="limit" :list-type="listType"
      :accept="accept" :multiple="true" :before-upload="beforeUpload" :on-change="handleChange" :on-error="handleError"
      :on-preview="handlePictureCardPreview" :on-success="handleSuccess" :on-remove="handleRemove"
      :show-file-list="state.showFileList">
      <el-icon>
        <Plus />
      </el-icon>
    </el-upload>
    <el-dialog v-model="dialogVisible" append-to-body :draggable="false">
      <el-image alt="Preview Image" :src="dialogImageUrl" style="width: 100%;" />
    </el-dialog>
  </div>
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
  onChange()
}

const props = defineProps({
  files: {
    type: Array as () => UploadUserFile[],
    default: () => [],
  },
  limit: {
    type: Number,
    default: 1,
  },
  name: {
    type: String,
    default: '',
  },
  accept: {
    type: String,
    default: '*',
  },
  listType: {
    type: String as PropType<'picture' | 'text' | 'picture-card'>,
    default: 'picture-card',
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
  const fileName = `${rawFile.uid}${rawFile.lastModified}.${(rawFile.name || '').split('.').pop()}`
  await getUploadConfig(fileName)
  state.try = 0
  await nextTick()
}
const handleRemoveKey = async (index: number) => {
  fileList.value.splice(index, 1);
  onChange()
}

const handleChange: UploadProps['onChange'] = async (uploadFile, uploadFiles) => {
  // console.log('handleChange:uploadFile:', uploadFile)
  // console.log('handleChange:uploadFiles:', JSON.stringify(uploadFiles))
  // onChange()
}

const handleRemove: UploadProps['onChange'] = async (file, uploadFiles) => {
  // console.log('handleRemove:file:', file)
  // console.log('handleRemove:uploadFiles:', JSON.stringify(uploadFiles))
  // console.log('fileList.value', JSON.stringify(fileList.value))
  const indexToRemove = (fileList.value || []).findIndex(item => item.url === (file.url || ''));
  fileList.value.splice(indexToRemove, 1);
  onChange()
}

const handleSuccess: UploadProps['onSuccess'] = async (response, uploadFile, uploadFiles) => {
  // console.log('handleSuccess:response:', response)
  // console.log('handleSuccess:uploadFile:', uploadFile)
  // console.log('handleSuccess:uploadFiles:', JSON.stringify(uploadFiles))
  onChange()
  // 此时可以利用ext-param将文件进行标记
  // let uploadSuccess = 0
  // uploadFiles.forEach(async (item: any, index: number) => {
  //   if (item.status === 'success') {
  //     uploadSuccess++
  //   }
  //   // if (uploadSuccess >= uploadFiles.length) {
  //   //   await nextTick()
  //   //   onChange(uploadFiles)
  //   // }
  // })
  // state.isLimit = fileList.value.length >= props.limit
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
  state.isLimit = fileList.value.length >= props.limit
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
  emit('change-files', files, props.name)
}

const dialogImageUrl = ref<string | undefined>('')
const dialogVisible = ref<boolean>(false)

const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
  if (props.listType === 'text') return;
  dialogImageUrl.value = uploadFile.url;
  dialogVisible.value = true;
}

watch(
  props,
  () => {
    fileList.value = []
    if (props.files) {
      fileList.value = props.files
    }
    state.isLimit = fileList.value.length >= props.limit
  },
  { immediate: true, deep: true }
)

onMounted(() => { })
onBeforeUnmount(() => { })
</script>

<style lang="scss" scoped></style>