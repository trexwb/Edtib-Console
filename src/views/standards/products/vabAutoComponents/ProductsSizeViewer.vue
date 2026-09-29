<!--
 * @Author: ${git_name}
 * @Date: 2025-04-18 18:05:33
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-08-01 14:20:30
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsSizeViewer.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="tabs-content">
    <div class="size-img-container" v-loading="state.loading">
      <div class="operate-box">
        <el-icon :title="translate('放大')" class="operate-cion" @click="zoomIn">
          <ZoomIn />
        </el-icon>
        <el-icon :title="translate('还原')" class="operate-cion" @click="resetScale">
          <RefreshLeft />
        </el-icon>
        <el-icon :title="translate('缩小')" class="operate-cion" @click="zoomOut">
          <ZoomOut />
        </el-icon>
      </div>
      <div class="size-img-box">
        <el-image ref="imageViewerRef" v-if="svgDataUrl && !state.error" @wheel="handleWheel" @load="handleImageLoad"
          @error="handleImageError" @mousedown="startDrag" class="size-img" :alt="translate('尺寸图')" :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
          }" :title="translate('长按鼠标开始拖拽图片，滚动滑轮放大缩小')" :src="svgDataUrl">
          <template #placeholder>
            <div class="size-img-tip">{{ translate('加载中') }}...</div>
          </template>
        </el-image>
        <div v-else-if="state.error && !state.loading" class="size-img-tip size-img-tip--error">
          <span>{{ translate('加载失败') }}</span>
        </div>
        <div v-else class="size-img-tip">{{ translate('加载中') }}...</div>
      </div>
    </div>
  </div>
  <div class="under-tabs-select-box" style="padding-left: 10px">
    <el-form :inline="true" class="custom-el-form" label-width="80px">
      <el-form-item style="margin-bottom: 10px; padding-top: 10px; width: 150px">
        <el-select v-model="queryForm.mon" filterable placement="top" @change="handleDiameterChange">
          <template #prefix>{{ translate('直径') }}</template>
          <el-option v-for="item in dropDownDataSet.diameterArr" :key="`diameter[${item.value}]`" :label="item.label"
            :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item v-show="dropDownDataSet.lengthArr.length > 0"
        style="margin-bottom: 10px; padding-top: 10px; width: 150px">
        <el-select v-model="queryForm.diameterLength" :placeholder="translate('长度')" clearable ref="selectRef" placement="top"
          @change="handleLengthChange" @visible-change="handleVisibleChange">
          <template #prefix>{{ translate('长度') }}</template>
          <template #header>
            <el-input ref="searchInput" v-model="searchLen" :formatter="(value: string) => value.replace(/[^\d.]/g, '')"
              :parser="(value: string) => value.replace(/[^\d.]/g, '')" :placeholder="translate('可输入数据筛选')" clearable
              style="height: 30px; width: 165px" size="small" @keydown.enter="handleEnter" />
          </template>
          <el-option v-if="!!Number(searchLen)" :label="searchLen" :value="searchLen"></el-option>
          <el-option v-for="item in filteredOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item v-show="dropDownDataSet.pitchArr.length > 0"
        style="margin-bottom: 10px; padding-top: 10px; width: 150px">
        <el-select v-model="queryForm.pitch" :placeholder="translate('螺距')" filterable placement="top" @change="handlePitchChange">
          <template #prefix>{{ translate('螺距') }}</template>
          <el-option v-for="item in dropDownDataSet.pitchArr" :key="item.value" :label="item.label"
            :value="item.value" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { translate } from '/@/i18n'
import { getVariables, getMathEvaluate, formatNumber, evaluateConditionDefault } from '/@/utils/evaluateCondition'
import { ZoomOut, RefreshLeft, ZoomIn } from '@element-plus/icons-vue'
import { ElMessage, ElSelect } from 'element-plus'

const queryForm = ref<any>({})
const props = defineProps(['productRow'])
const svgUrl = ref(props.productRow?.extension?.svgs || props.productRow?.svgs?.[0]?.url || '') // SVG 文件的 URL
const svgDataUrl = ref('') // 存储处理后的 SVG 内容

// 下拉数据集合
const dropDownDataSet = reactive<{
  diameterArr: Array<{ value: any; label: any }>
  lengthArr: Array<{ value: any; label: any }>
  pitchArr: Array<{ value: any; label: any }>
}>({
  diameterArr: [],
  lengthArr: [],
  pitchArr: [],
});

const searchInput = ref<HTMLInputElement | null>(null);
const selectRef = ref<InstanceType<typeof ElSelect> | null>(null);
const searchLen = ref('');
const filteredOptions = computed(() => {
  const searchValue = Number(searchLen.value);
  return dropDownDataSet.lengthArr.filter((item: any) =>
    !searchLen.value ? Number(item.value) !== 0 : Math.abs(Number(item.label) - searchValue) < 1e-6
  );
});

const state = reactive<{
  loading: boolean;
  error: boolean;
  variables: Record<string, any>;
}>({
  loading: false,
  error: false,
  variables: {}
})

const handleEnter = () => {
  if (searchLen.value) {
    queryForm.value.diameterLength = Number(searchLen.value);
    selectRef.value?.blur();
    defaultPitch();
    // emit('updateLength', searchLen.value);
    // emit('handelChange')
  }
}

const handleVisibleChange = (isVisible: any) => {
  if (!isVisible) {
    searchLen.value = ''
  } else {
    setTimeout(() => {
      if (searchInput.value) {
        searchInput.value.focus()
      }
    }, 0)
  }
}

// 图片加载完成
const handleImageLoad = () => {
  state.loading = false
  state.error = false
}
// 图片加载失败（仅图片真正 onerror 时触发）
const handleImageError = () => {
  // 尚未生成 data URL 时的空 src 占位不算真失败，避免误报「加载失败」
  if (!svgDataUrl.value) return
  state.loading = false
  state.error = true
}
// 尺寸图图片缩放比例
const scale = ref(3)
// 拖拽状态
const isDragging = ref(false)
// 图片偏移量
const position = ref({ x: 0, y: +100 })
const dragStart = ref({ x: 0, y: 0 })
// 图片元素的引用
const imageViewerRef = ref(null)
// 开始拖动
const startDrag = (e: any) => {
  e.preventDefault()
  isDragging.value = true
  // 记录鼠标起始位置
  dragStart.value = { x: e.clientX, y: e.clientY }
  // 监听鼠标移动和释放事件
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

// 拖动中
const onDrag = (e: any) => {
  if (!isDragging.value) return
  // 计算鼠标移动的距离
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  // 更新图片位置
  position.value = {
    x: position.value.x + deltaX,
    y: position.value.y + deltaY,
  }
  // 更新拖动起始点
  dragStart.value = { x: e.clientX, y: e.clientY }
}
// 停止拖动
const stopDrag = () => {
  isDragging.value = false
  // 移除鼠标移动和释放事件监听器
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}
/**
 * 鼠标滚轮事件处理
 * @param {WheelEvent} event - 滚轮事件对象
 * 功能说明：
 * - 仅在拖拽状态下生效
 * - 上滚放大（增加0.1倍）
 * - 下滚缩小（减少0.1倍）
 * - 缩放范围限制在0.5-3倍之间
 */
const handleWheel = (event: any) => {
  if (!isDragging.value) return
  event.preventDefault()
  if (event.deltaY < 0) {
    if (scale.value < 3) {
      scale.value += 0.1
    }
  } else {
    if (scale.value > 0.5) {
      scale.value -= 0.1
    }
  }
}
/**
 * 放大操作
 * 每次增加0.3倍缩放比例
 * 当前有最大倍数限制注释（暂未启用）
 */
const zoomIn = () => {
  scale.value += 0.3
}
/**
 * 缩小操作
 * 每次减少0.3倍缩放比例
 * 当缩放比例<=0.5倍时显示错误提示
 */
const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value -= 0.3
  } else {
    ElMessage({
      message: translate('已缩小到最小倍数'),
      type: 'error',
    })
  }
}
/**
 * 重置视图状态
 * 恢复默认缩放比例（2倍）和位置（0,0）
 */
const resetScale = () => {
  scale.value = 2
  position.value.x = 0
  position.value.y = 0
}
/**
 * 加载并处理SVG文件
 * @param {string} svgPath - SVG文件路径
 * @returns {Promise<void>}
 * 处理流程：
 * 1. 获取SVG原始内容
 * 2. 根据parameters进行占位符替换
 *    - 简单值替换（字符串/数字）
 *    - 条件值替换（ConditionalValue类型）
 *    - 范围条件值替换（对象类型）
 * 3. 生成base64格式的data URL
 */
const loadAndProcessSvg = async (svgPath: string, variables: any): Promise<void> => {
  const { productRow } = props;
  if (!svgPath) {
    state.loading = false;
    state.error = true;
    return;
  }
  state.loading = true;
  state.error = false;
  svgDataUrl.value = '';
  try {
    // 1. 从 URL 获取 SVG 文件内容
    const response = await fetch(svgPath);
    if (!response.ok) throw new Error(`Failed to load SVG: ${response.statusText}`);
    let svgContent = await response.text();
    // 2. 删除通用边框
    // const pattern1 = new RegExp(
    //   '<g clip-path="url$#clipId0$" fill="none" stroke="rgb$0,0,0$" stroke-width="\\d+"\s*><polyline points="1271\\.57,1186\\.27 28428\\.4,1186\\.27\s*" \\/><\\/g>',
    //   'g'
    // );
    // const pattern2 = new RegExp(
    //   '<g clip-path="url$#clipId0$" fill="none" stroke="rgb$0,0,0$" stroke-width="\\d+"\s*><polyline points="28428\\.4,1186\\.27 28428\\.4,19813\\.7\s*" \\/><\\/g>',
    //   'g'
    // );
    // const pattern3 = new RegExp(
    //   '<g clip-path="url$#clipId0$" fill="none" stroke="rgb$0,0,0$" stroke-width="\\d+"\s*><polyline points="28428\\.4,19813\\.7 1271\\.57,19813\\.7\s*" \\/><\\/g>',
    //   'g'
    // );
    // const pattern4 = new RegExp(
    //   '<g clip-path="url$#clipId0$" fill="none" stroke="rgb$0,0,0$" stroke-width="\\d+"\s*><polyline points="1271\\.57,19813\\.7 1271\\.57,1186\\.27\s*" \\/><\\/g>',
    //   'g'
    // );
    // const pattern5 = new RegExp(
    //   '<g clip-path="url$#clipId0$" fill="none" stroke="rgb$0,0,0$" stroke-width="\\d+"\s*><polyline points="29408\\.8,10500 28428\\.4,10500\s*" \\/><\\/g>',
    //   'g'
    // );
    // const pattern6 = new RegExp(
    //   '<g clip-path="url$#clipId0$" fill="none" stroke="rgb$0,0,0$" stroke-width="\\d+"\s*><polyline points="28428\\.4,15057\\.8 1271\\.57,15057\\.8\s*" \\/><\\/g>',
    //   'g'
    // );
    // svgContent = svgContent.replace(/>\s+</g, '><').replace(pattern1, '').replace(pattern2, '').replace(pattern3, '').replace(pattern4, '').replace(pattern5, '').replace(pattern6, '');
    // // 4. 删除定制边框
    // svgContent = svgContent.replace(/>\s+</g, '><')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="10" />`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="13" ><polyline points="291.176,205.882 29408.8,205.882 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="50" ><polyline points="1271.57,1186.27 28428.4,1186.27 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="30" ><polyline points="1271.57,1186.27 28428.4,1186.27 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="13" ><polyline points="29408.8,205.882 29408.8,20794.1 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="50" ><polyline points="28428.4,1186.27 28428.4,19813.7 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="30" ><polyline points="28428.4,1186.27 28428.4,19813.7 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="13" ><polyline points="29408.8,20794.1 291.176,20794.1 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="50" ><polyline points="28428.4,19813.7 1271.57,19813.7 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="30" ><polyline points="28428.4,19813.7 1271.57,19813.7 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="13" ><polyline points="291.176,20794.1 291.176,205.882 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="50" ><polyline points="1271.57,19813.7 1271.57,1186.27 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="30" ><polyline points="1271.57,19813.7 1271.57,1186.27 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="13" ><polyline points="291.176,10500 1271.57,10500 " /><polyline points="14850,205.882 14850,1186.27 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="30" ><polyline points="29408.8,10500 28428.4,10500 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="25" ><polyline points="29408.8,10500 28428.4,10500 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="20" ><polyline points="28428.4,15057.8 1271.57,15057.8 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="25" ><polyline points="28428.4,15057.8 1271.57,15057.8 " /></g>`, '')
    //   .replace(`<g clip-path="url(#clipId0)" fill="none" stroke="rgb(0,0,0)" stroke-width="13" ><polyline points="14850,19813.7 14850,20794.1 " /><polyline points="683.333,598.039 683.333,2166.67 " /><polyline points="683.333,598.039 2251.96,598.039 " /><polyline points="29016.7,598.039 29016.7,2166.67 " /><polyline points="29016.7,598.039 27448,598.039 " /><polyline points="683.333,20402 683.333,18833.3 " /><polyline points="683.333,20402 2251.96,20402 " /><polyline points="29016.7,20402 29016.7,18833.3 " /><polyline points="29016.7,20402 27448,20402 " /></g>`, '')
    svgContent = svgContent.replace(/>\s+</g, '><')
      .replace(`<polyline points="291.176,205.882 29408.8,205.882 " />`, '')
      .replace(`<polyline points="1271.57,1186.27 28428.4,1186.27 " />`, '')
      .replace(`<polyline points="29408.8,205.882 29408.8,20794.1 " />`, '')
      .replace(`<polyline points="28428.4,1186.27 28428.4,19813.7 " />`, '')
      .replace(`<polyline points="29408.8,20794.1 291.176,20794.1 " />`, '')
      .replace(`<polyline points="28428.4,19813.7 1271.57,19813.7 " />`, '')
      .replace(`<polyline points="291.176,20794.1 291.176,205.882 " />`, '')
      .replace(`<polyline points="1271.57,19813.7 1271.57,1186.27 " />`, '')
      .replace(`<polyline points="291.176,10500 1271.57,10500 " />`, '')
      .replace(`<polyline points="14850,205.882 14850,1186.27 " />`, '')
      .replace(`<polyline points="29408.8,10500 28428.4,10500 " />`, '')
      .replace(`<polyline points="28428.4,15057.8 1271.57,15057.8 " />`, '')
      .replace(`<polyline points="14850,19813.7 14850,20794.1 " />`, '')
      .replace(`<polyline points="683.333,598.039 683.333,2166.67 " />`, '')
      .replace(`<polyline points="683.333,598.039 2251.96,598.039 " />`, '')
      .replace(`<polyline points="29016.7,598.039 29016.7,2166.67 " />`, '')
      .replace(`<polyline points="29016.7,598.039 27448,598.039 " />`, '')
      .replace(`<polyline points="683.333,20402 683.333,18833.3 " />`, '')
      .replace(`<polyline points="683.333,20402 2251.96,20402 " />`, '')
      .replace(`<polyline points="29016.7,20402 29016.7,18833.3 " />`, '')
      .replace(`<polyline points="29016.7,20402 27448,20402 " />`, '');
    // 3. 替换变量
    // const variables = queryForm?.variables || {};
    if (variables['Pitch'] || variables['pitch']) {
      svgContent = svgContent.replace('{P}', variables['Pitch'] || variables['pitch']);
    }
    // 当参数中有L时表示长度是指定的，不让选择
    if (!variables['L'] && productRow.parameters?.[queryForm.value.mon]?.['L']) {
      variables['L'] = productRow.parameters?.[queryForm.value.mon]?.['L'];
    }
    svgContent = Object.keys(variables).reduce((acc, key) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const value = escapedKey == 'd' ? queryForm.value.mon : variables[key];
      return acc.replace(new RegExp(`{${escapedKey}}`, 'g'), String(value));
    }, svgContent);
    // 4. 将处理后的内容存储到 svgDataUrl
    // console.log('svgContent:', svgContent)
    // svgDataUrl.value = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
    // 使用 TextEncoder 处理非 ASCII 字符
    // 4. 将处理后的内容转换为 Data URL (使用 TextDecoder)
    const encoder = new TextEncoder();
    const encoded = encoder.encode(svgContent);
    // const base64 = btoa(String.fromCharCode.apply(null, encoded as unknown as number[]));
    // --- 关键修改：使用 TextDecoder 将 Uint8Array 转换为字符串 ---
    // TextDecoder 专门用于将字节流解码为字符串
    // const textDecoderForBase64 = new TextDecoder('utf-8'); // 或 'latin1'/'iso-8859-1'，对于 base64 编码的原始字节，'latin1' 更精确
    // // 注意：对于 base64 编码，我们通常希望字节被原样解释，'latin1' 映射 0-255 到 U+0000-U+00FF，最符合需求
    // // const textDecoderForBase64 = new TextDecoder('latin1');
    // const byteString = textDecoderForBase64.decode(encoded);
    // 正确方式：将 Uint8Array 转为 byte string（每个字符的 charCode 是 0-255）
    let byteString = '';
    for (let i = 0; i < encoded.length; i++) {
      byteString += String.fromCharCode(encoded[i]);
    }
    // 现在 byteString 是一个字符串，每个字符的 charCode 对应一个原始字节
    const base64 = btoa(byteString); // btoa 可以正常处理这个字符串
    svgDataUrl.value = `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('Error loading or processing SVG:', error)
    state.error = true
  } finally {
    state.loading = false
  }
}

/**
 * 直径变化处理
 * 根据条件切换显示不同的SVG文件：
 * - 当满足drawingLimit条件时显示第二个SVG
 * - 否则显示第一个SVG
 */
const diameterChange = () => {
  const { productRow } = props;
  if (productRow?.svgs?.length > 1 && productRow?.drawing_limit?.[queryForm.value.mon]?.['IMG']) {
    svgUrl.value = evaluateConditionDefault(productRow.drawing_limit[queryForm.value.mon]['IMG'], productRow.parameters, queryForm.value)
      ? productRow.svgs[0]?.url || ''
      : productRow.svgs[1]?.url || ''
  } else {
    svgUrl.value = productRow?.extension?.svgs || productRow?.svgs?.[0]?.url || ''
  }
}
// 自定义排序函数
function getPriority(s: string): number {
  if (!s.length) return 2; // 空字符串视为其他符号
  const firstChar = s[0];
  if (/[a-zA-Z]/.test(firstChar)) return 0; // 字母
  if (/\d/.test(firstChar)) return 2; // 数字
  return 1; // 其他符号
}
function customSort(arr: string[]): string[] {
  return [...arr].sort((a, b) => {
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    // 1. 按优先级排序（字母 > 数字 > 其他）
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 2. 同优先级时，进一步处理字母+数字的情况
    if (priorityA === 0) { // 字母开头
      // 提取字母部分和数字部分（如 "M10" → ["M", "10"]）
      const matchA = a.match(/^([a-zA-Z@#$%^&]*)(\d*)/);
      const matchB = b.match(/^([a-zA-Z@#$%^&]*)(\d*)/);

      const lettersA = matchA?.[1] || '';
      const lettersB = matchB?.[1] || '';
      const numA = matchA?.[2] ? parseInt(matchA[2], 10) : NaN;
      const numB = matchB?.[2] ? parseInt(matchB[2], 10) : NaN;

      // 2.1 先比较字母部分
      if (lettersA !== lettersB) {
        return lettersA.localeCompare(lettersB);
      }

      // 2.2 字母相同，比较数字部分
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB; // 按数值排序
      }

      // 2.3 无法提取数字，按字典序排序
      return a.localeCompare(b);
    } else if (priorityA === 2) { // 数字
      // 2.2 字母相同，比较数字部分
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
      // if (Number(a) && Number(b)) {
      //   return Number(a) - Number(b); // 按数值排序
      // }
    }

    // 3. 其他情况（数字开头或其他符号开头），按字典序排序
    return a.localeCompare(b);
  });
}
function isStringNumeric(str: string) {
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}
function setVariables() {
  const { productRow } = props;
  if (queryForm.value.mon) {
    state.variables = getVariables(productRow.parameters || {}, productRow.tolerance || {}, queryForm.value);
  }
}
const defaultDiameterLength = () => {
  const { productRow } = props;
  dropDownDataSet.lengthArr = [];
  if (productRow.diameter_length && productRow.diameter_length[queryForm.value.mon]) {
    // 将数组中的元素统一转换为数字类型
    const diameterLengthArr = (productRow.diameter_length as Record<string, any>)[queryForm.value.mon].map(String);
    // 对数组进行升序排序
    diameterLengthArr.sort((a: string, b: string) => Number(a) - Number(b));
    queryForm.value.diameterLength = (isStringNumeric(diameterLengthArr[0]) ? diameterLengthArr[0] : formatNumber(getMathEvaluate(diameterLengthArr[0], state.variables))) || 0;
    setVariables();
    diameterLengthArr.forEach((key: any) => {
      let labelKey = Object.keys(state.variables).reduce((acc, key) => {
        return acc.replace(new RegExp(key, 'g'), state.variables[key]);
      }, key);
      dropDownDataSet.lengthArr.push({
        value: isStringNumeric(key) ? key : formatNumber(getMathEvaluate(key, state.variables)),
        label: `${labelKey}` // key
      })
    })
  }
}

const defaultPitch = () => {
  const { productRow } = props;
  dropDownDataSet.pitchArr = [];
  if (productRow.parameters[queryForm.value.mon]) {
    queryForm.value.diameter = productRow.parameters[queryForm.value.mon]['d'] || 0
    if (productRow.parameters[queryForm.value.mon] && productRow.parameters[queryForm.value.mon]['P']) {
      const pitchValue = (productRow.parameters?.[queryForm.value.mon]?.['P'] || '').replace('\/', '|');
      const pitchLabel = (productRow.parameters?.[queryForm.value.mon]?.['Pitch'] || pitchValue).replace('\/', '|');
      if (pitchValue.includes('|')) {
        const pitchValArr = pitchValue.split('|');
        const pitchLabArr = pitchLabel.split('|');
        for (let i = 0; i < pitchValArr.length; i++) {
          dropDownDataSet.pitchArr.push({
            value: Number(pitchValArr[i] || 0),
            label: pitchLabArr?.[i] || 0,
          })
        }
        queryForm.value.pitch = Number(pitchValue.split('|')[0] || 0)
      } else {
        dropDownDataSet.pitchArr.push({
          value: Number(pitchValue || 0),
          label: pitchLabel || 0,
        })
        queryForm.value.pitch = Number(pitchValue || 0)
      }
    }
  }
  handelChange()
}
// 直径改变
const handleDiameterChange = (value: any) => {
  queryForm.value.mon = value;
  setVariables();
  nextTick(() => {
    defaultDiameterLength();
    defaultPitch();
  })
}
// 长度改变
const handleLengthChange = (value: any) => {
  queryForm.value.diameterLength = Number(value) || 0;
  setVariables();
  defaultPitch();
}
// 螺距改变
const handlePitchChange = (value: any) => {
  queryForm.value.pitch = Number(value);
  setVariables();
  handelChange();
}
const handelChange = async () => {
  setVariables();
  diameterChange();
  nextTick(() => {
    loadAndProcessSvg(svgUrl.value, state.variables);
  });
}
/**
 * 显示SVG入口方法
 * 组合执行直径判断和SVG加载流程
 */
const showImage = () => {
  const { productRow } = props;
  state.loading = true
  dropDownDataSet.diameterArr = [];
  if (productRow.parameters) {
    // 将数组中的元素统一转换为数字类型
    // const diameterArr = customSort(Object.keys(productRow.parameters))
    const result = {} as any;
    const i = {} as any;
    for (const [key, value] of Object.entries<{ d?: any }>(productRow.parameters || {})) {
      if (value.d) {
        const dValue = value.d as string;
        i[dValue] = (i[dValue] || 0) + 1
        if (result[value.d]) {
          result[value.d + i[value.d]] = key;
        } else {
          result[value.d] = key;
        }
      } else {
        result[key] = key;
      }
    }
    const keysSort = customSort(Object.keys(result || {}));
    const diameterArr = keysSort.map((item: any) => result[item]);

    queryForm.value.mon = diameterArr[0] || '';
    setVariables();
    diameterArr.forEach((key) => {
      dropDownDataSet.diameterArr.push({
        value: key,
        label: key,
      })
    })
    defaultDiameterLength()
    defaultPitch()
  }
}

// 暴露组件方法给父组件
defineExpose({ showImage })

/* 生命周期钩子 */
onMounted(() => { })
onBeforeUnmount(() => { })
onBeforeMount(() => { })
</script>

<style lang="scss">
.tabs-content {
  width: 100%;
  height: 600px;
  background: #eaf0f0;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--default-color);
}

.size-img-container {
  width: 100%;
  height: 100%;
  overflow: hidden;

  .el-image__error {
    padding: 50px 0;
  }

  .operate-box {
    width: 100%;
    position: relative;
    text-align: center;
    z-index: 100;
    background: #eaf0f0;
    height: 40px;
    padding-top: 10px;

    .operate-cion {
      font-size: 20px;
      cursor: pointer;
      margin-right: 30px;
    }
  }

  .size-img-box {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    overflow: hidden;
    height: calc(100% - 40px);
    padding: 10px;

    .size-img {
      position: absolute;
      z-index: 50;
      width: 500px;
      height: auto;
      user-select: none;
      cursor: pointer;
      transition: all 0.3s ease-in-out;
    }

    .size-img-tip {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 50px 0;
      color: #909399;
      font-size: 14px;

      &--error {
        color: #f56c6c;
      }
    }
  }
}

.under-tabs-select-box {
  width: 100%;
  padding-bottom: 10px;
  background: var(--default-color);

  .el-form-item__label {
    div {
      color: #fff;
    }
  }

  .under-tabs-img-box {
    width: 100%;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-right: 1px solid var(--default-color);
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;

    div {
      color: var(--default-color);
      font-size: 14px;
    }

    img {
      width: auto;
      height: 23px;
      margin-left: 5px;
    }
  }

  .under-tabs-select-input {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    height: 40px;
    line-height: 40px;
    padding-top: 12px;

    .unit-text {
      margin-left: 6px;
      color: #fff;
      white-space: nowrap;
    }

    .total-value {
      width: calc(100% - 48px);
      height: 30px;
      line-height: 30px;
      font-size: 15px;
      background: #fff;
      color: var(--default-color);
      border-radius: 4px;
      padding: 0 5px;
    }
  }

  .notice-title {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    padding-top: 15px;
    margin-left: 90px;

    .label-title {
      color: #fff;
      padding-left: 3px;
      white-space: nowrap;
    }
  }
}
</style>
