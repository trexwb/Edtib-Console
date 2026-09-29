<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:16:38
 * @LastEditors: ${git_name}
 * @LastEditTime: 2026-09-14 09:49:02
 * @FilePath: /fastenerTradeWorkbench/Users/wbtrex/website/localServer/node/edtib/client/console/web/src/views/standards/products/vabAutoComponents/ProductsReviewEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer
    v-model="state.drawerdFormVisible"
    append-to-body
    :before-close="handleClose"
    destroy-on-close
    direction="rtl"
    size="80%"
    :title="drawerTitleText"
  >
    <el-form ref="formRef" v-loading="state.loading" class="drawer-edit-form" label-width="80px" :model="editForm" :rules="state.fromRules">
      <!-- 维护语言切换：仅显示/维护当前语言内容，保存仍提交全部语言数据 -->
      <div v-if="stateLangOptions.length > 0" class="drawer-edit-langbar">
        <span class="drawer-edit-langbar__label">{{ translate('维护语言') }}</span>
        <el-select v-model="editLangModel" class="drawer-edit-langbar__select" size="default">
          <el-option v-for="item in stateLangOptions" :key="item.code" :label="item.name" :value="item.code" />
        </el-select>
        <span v-if="stateCurLang === state.defaultLang" class="drawer-edit-langbar__badge">{{ translate('默认语言') }}</span>
        <span v-else-if="!(editForm.names || {})[stateCurLang] && !(editForm.detail || {})[stateCurLang]" class="drawer-edit-langbar__tip">
          {{ translate('当前语言暂无内容，展示将回退默认语言') }}
        </span>
        <span v-else class="drawer-edit-langbar__tip">{{ translate('切换前将自动写回当前语言内容') }}</span>
      </div>
      <!-- 分步向导：语言内容 → 基本信息 → 图片 → 形状 → 参数 → 长度 → 图片条件 -->
      <el-steps :active="state.activeStep" align-center class="drawer-edit-steps" finish-status="success">
        <el-step
          v-for="(title, index) in stepTitles"
          :key="index"
          class="drawer-step-clickable"
          :title="title"
          @click="handleStepClick(index)"
        />
      </el-steps>

      <!-- 步骤 0：语言内容 -->
      <div v-show="state.activeStep === 0" class="step-pane">
        <div class="lang-main">
          <el-form-item :label="translate('名称')" prop="names">
            <el-input
              v-model.trim="(editForm.names || {})[stateCurLang]"
              clearable
              :placeholder="`${translate('请输入')}${stateCurLangName}${translate('名称')}`"
            />
          </el-form-item>
          <el-text v-if="stateCurLang !== state.defaultLang && !(editForm.names || {})[stateCurLang]" class="drawer-edit-hint" type="info">
            {{ translate('默认语言名称必填；当前语言名称留空时展示将回退默认语言，提交时不会保留空键。') }}
          </el-text>
          <div class="drawer-edit-editor">
            <div class="drawer-edit-editor-label">{{ translate('详细说明') }}</div>
            <products-md-edit
              :key="stateCurLang"
              :ref="
                (el: Element | ComponentPublicInstance | null) => {
                  if (el) editorRef[stateCurLang] = el as EditorInstance
                  else delete editorRef[stateCurLang]
                }
              "
              :detail="(editForm.detail || {})[stateCurLang]"
              :language="stateCurLang"
              @update-from="watchEditor"
            />
          </div>
        </div>
      </div>

      <!-- 步骤 1：基本信息 -->
      <div v-if="state.maxStep >= 1" v-show="state.activeStep === 1" class="step-pane">
        <el-form-item :label="translate('标准分类')" prop="standard_id">
          <el-radio-group v-model="editForm.standard_id">
            <el-radio
              v-for="(standard, key) in props.standards || []"
              :key="`standard[${key}]`"
              :label="textOfNames(standard.names)"
              :value="standard.id"
            />
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="translate('分类')" prop="categories_id">
          <el-cascader
            v-model="editForm.categories_id"
            clearable
            :emit-path="true"
            filterable
            :options="props.categories"
            :props="{ label: 'label', value: 'id', checkStrictly: true }"
            :show-all-levels="true"
          >
            <template #default="{ node, data }">
              <span>{{ textOfNames(data.names) }}</span>
              <span v-if="!node.isLeaf">({{ data.children.length }})</span>
            </template>
          </el-cascader>
        </el-form-item>
        <el-form-item :label="translate('编码信息')">
          <el-form-item :label="translate('级别')" prop="grade">
            <el-input v-model.trim="editForm.grade" clearable />
          </el-form-item>
          <el-form-item :label="translate('编号')" prop="code">
            <el-input v-model.trim="editForm.code" clearable />
          </el-form-item>
          <el-form-item :label="translate('年份')" prop="year">
            <el-input v-model.trim="editForm.year" clearable />
          </el-form-item>
        </el-form-item>
        <el-form-item :label="translate('默认单位')">
          <el-select v-model="editForm.extension.unit" :placeholder="translate('请选择默认单位')" style="width: 120px">
            <el-option v-for="item in ['mm', 'inch']" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="state.defaultLang === state.defaultLang" :label="translate('图标')" prop="covers" style="width: 100%">
          <products-upload accept="image/*" :files="editForm.covers || []" :limit="1" name="covers" @change-files="changeFiles" />
        </el-form-item>
        <div style="padding: 0 0 20px 80px">{{ translate('仅支持jpg、png图片，建议小于10k的正方形图片') }}</div>
      </div>

      <!-- 步骤 2：图片 -->
      <div v-if="state.maxStep >= 2" v-show="state.activeStep === 2" class="step-pane">
        <el-form-item :label="translate('SVG图')">
          <el-form-item :label="translate('选择图片(2张)')" label-width="120" prop="svgs">
            <products-upload
              v-if="state.defaultLang === state.defaultLang"
              accept="image/svg+xml,.svg"
              :files="editForm.svgs"
              :limit="2"
              name="svgs"
              @change-files="changeFiles"
            />
            <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
          </el-form-item>
          <el-form-item
            v-if="state.defaultLang === state.defaultLang && (editForm.svgs || []).length > 1"
            :label="translate('默认显示')"
            prop="extension.default.svgs"
          >
            <el-radio-group v-model="editForm.extension.svgs">
              <el-radio v-for="(img, key) in editForm.svgs || []" :key="`svgs[${key}]`" :value="img.url">
                {{ Number(key) + 1 }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form-item>
        <el-form-item :label="translate('渲染图')">
          <el-form-item :label="translate('选择图片(2张)')" label-width="120" prop="renders">
            <products-upload
              v-if="state.defaultLang === state.defaultLang"
              accept="image/*"
              :files="editForm.renders"
              :limit="2"
              name="renders"
              @change-files="changeFiles"
            />
            <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
          </el-form-item>
          <el-form-item
            v-if="state.defaultLang === state.defaultLang && (editForm.renders || []).length > 1"
            :label="translate('默认显示')"
            prop="extension.default.renders"
          >
            <el-radio-group v-model="editForm.extension.renders">
              <el-radio v-for="(img, key) in editForm.renders || []" :key="`renders[${key}]`" :value="img.url">
                {{ Number(key) + 1 }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form-item>
        <el-form-item :label="translate('CAD图')">
          <el-form-item :label="translate('选择图片(2张)')" label-width="120" prop="cads">
            <products-upload
              v-if="state.defaultLang === state.defaultLang"
              accept="application/acad,application/x-dwg,.dwg"
              :files="editForm.cads"
              :limit="2"
              list-type="text"
              name="cads"
              @change-files="changeFiles"
            />
            <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
          </el-form-item>
          <el-form-item
            v-if="state.defaultLang === state.defaultLang && (editForm.cads || []).length > 1"
            :label="translate('默认显示')"
            prop="extension.default.cads"
          >
            <el-radio-group v-model="editForm.extension.cads">
              <el-radio v-for="(img, key) in editForm.cads || []" :key="`cads[${key}]`" :value="img.url">
                {{ Number(key) + 1 }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form-item>
        <el-form-item :label="translate('装配图')">
          <el-form-item :label="translate('选择视频(2个)')" label-width="120" prop="assemblies">
            <products-upload
              v-if="state.defaultLang === state.defaultLang"
              accept="video/*"
              :files="editForm.assemblies"
              :limit="1"
              list-type="text"
              name="assemblies"
              @change-files="changeFiles"
            />
            <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
          </el-form-item>
          <el-form-item
            v-if="state.defaultLang === state.defaultLang && editForm.assemblies.length > 1"
            :label="translate('默认显示')"
            prop="extension.default.assemblies"
          >
            <el-radio-group v-model="editForm.extension.assemblies">
              <el-radio v-for="(img, key) in editForm.assemblies || []" :key="`assemblies[${key}]`" :value="img.url">
                {{ Number(key) + 1 }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form-item>
        <el-form-item :label="translate('模型图')">
          <el-form-item :label="translate('选择图片(2张)')" label-width="120" prop="models">
            <products-upload
              v-if="state.defaultLang === state.defaultLang"
              accept=".stl,.stp"
              :files="editForm.models"
              :limit="2"
              list-type="text"
              name="models"
              @change-files="changeFiles"
            />
            <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
          </el-form-item>
          <el-form-item
            v-if="state.defaultLang === state.defaultLang && editForm.models.length > 1"
            :label="translate('默认显示')"
            prop="extension.default.models"
          >
            <el-radio-group v-model="editForm.extension.models">
              <el-radio v-for="(img, key) in editForm.models || []" :key="`models[${key}]`" :value="img.url">
                {{ Number(key) + 1 }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form-item>
      </div>

      <!-- 步骤 3：形状 -->
      <div v-if="state.maxStep >= 3" v-show="state.activeStep === 3" class="step-pane">
        <el-form-item
          v-for="locationIndex in Object.keys(configuration.shape)"
          :key="`shapeLocation[${locationIndex}]`"
          :label="textOfShape(configuration.shape[locationIndex])"
          label-width="150"
          prop="shapeIds"
        >
          <el-select
            v-model="editForm.shapeIds[locationIndex]"
            clearable
            filterable
            multiple
            :multiple-limit="3"
            :placeholder="translate('请选择形状')"
          >
            <el-option
              v-for="(item, key) in props.shapes[locationIndex]"
              :key="`shape[${key}]`"
              :label="textOfNames(item.names)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </div>

      <!-- 步骤 4：参数 -->
      <div v-if="state.maxStep >= 4" v-show="state.activeStep === 4" class="step-pane">
        <el-form-item v-if="state.defaultLang === state.defaultLang" :label="translate('参数')">
          <el-input
            v-show="tableData.parameters.list.length === 0"
            v-model="parseData.parameters"
            :placeholder="translate('请粘贴参数表格数据')"
            type="textarea"
          />
          <el-button v-show="tableData.parameters.list.length > 0" :icon="Delete" type="primary" @click="handleClean('parameters')">
            {{ translate('重新粘贴') }}
          </el-button>
        </el-form-item>
        <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
        <el-table
          v-show="tableData.parameters.list.length > 0"
          :key="`parametersReview[${editForm.id}]`"
          :border="true"
          :data="tableData.parameters.list"
          :fit="true"
          :highlight-current-row="true"
          max-height="500"
          :stripe="true"
          @cell-dblclick="handleParametersCellClick"
        >
          <!-- 参数列 -->
          <el-table-column align="center" fixed label="mon" prop="mon" sortable />
          <el-table-column align="center" fixed :label="translate('公称')" prop="nominal" sortable />
          <el-table-column align="center" fixed :label="translate('等级')" prop="leve" sortable />
          <el-table-column align="center" fixed :label="translate('条件')" prop="condition" sortable width="160" />
          <!-- 型号列 -->
          <el-table-column
            v-for="(model, index) in tableData.parameters.column"
            :key="`parameters[${index}]`"
            align="center"
            :label="model"
            :prop="model"
            :sort-method="getSortMethod(model)"
            sortable
          >
            <template #default="{ row }">
              {{ row.values?.[model]?.[row.condition ?? ''] ? row.values?.[model]?.[row.condition ?? ''] : row.values?.[model] }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 步骤 5：长度 -->
      <div v-if="state.maxStep >= 5" v-show="state.activeStep === 5" class="step-pane">
        <el-form-item v-if="state.defaultLang === state.defaultLang" :label="translate('长度')">
          <el-input
            v-show="tableData.diameter_length.list.length === 0"
            v-model="parseData.diameter_length"
            :placeholder="translate('请粘贴长度表格数据')"
            type="textarea"
          />
          <el-button
            v-show="tableData.diameter_length.list.length > 0"
            :icon="Delete"
            type="primary"
            @click="handleClean('diameter_length')"
          >
            {{ translate('重新粘贴') }}
          </el-button>
        </el-form-item>
        <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
        <el-table
          v-show="tableData.diameter_length.list.length > 0"
          :border="true"
          :data="tableData.diameter_length.list"
          :fit="true"
          :highlight-current-row="true"
          max-height="500"
          :stripe="true"
        >
          <!-- 参数列 -->
          <el-table-column align="center" fixed label="L" prop="L" sortable />
          <!-- 型号列 -->
          <el-table-column
            v-for="(model, index) in tableData.diameter_length.column"
            :key="`diameter_length[${index}]`"
            align="center"
            :label="model"
            width="80"
          >
            <template #default="{ row }">
              <el-checkbox-group v-model="editForm.diameter_length[model]">
                <el-checkbox class="no-text" :label="row.L" :value="`${row.L}`" />
              </el-checkbox-group>
            </template>
          </el-table-column>
        </el-table>
        <el-form-item v-if="state.defaultLang === state.defaultLang" :label="translate('长度公差')">
          <el-input
            v-show="tableData.tolerance.list.length === 0"
            v-model="parseData.tolerance"
            :placeholder="translate('请粘贴公差表格数据')"
            type="textarea"
          />
          <el-button v-show="tableData.tolerance.list.length > 0" :icon="Delete" type="primary" @click="handleClean('tolerance')">
            {{ translate('重新粘贴') }}
          </el-button>
        </el-form-item>
        <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
        <el-table
          v-show="tableData.tolerance.list.length > 0"
          :border="true"
          :data="tableData.tolerance.list"
          :fit="true"
          :highlight-current-row="true"
          max-height="500"
          :stripe="true"
        >
          <el-table-column
            v-for="index in tableData.tolerance.column"
            :key="`tolerance[${index}]`"
            align="center"
            :label="index"
            :prop="`${index}`"
          >
            <el-table-column v-if="index === translate('条件')" align="center" :label="translate('大于')" :prop="translate('大于')">
              <template #default="{ row }">
                {{ row[index]['大于'] }}
              </template>
            </el-table-column>
            <el-table-column v-if="index === translate('条件')" align="center" :label="translate('至')" :prop="translate('至')">
              <template #default="{ row }">
                {{ row[index]['至'] }}
              </template>
            </el-table-column>
            <el-table-column v-if="index !== translate('条件')" align="center" label="min" prop="min">
              <template #default="{ row }">
                {{ row[index]['min'] }}
              </template>
            </el-table-column>
            <el-table-column v-if="index !== translate('条件')" align="center" label="max" prop="max">
              <template #default="{ row }">
                {{ row[index]['max'] }}
              </template>
            </el-table-column>
          </el-table-column>
        </el-table>
      </div>

      <!-- 步骤 6：图片条件 -->
      <div v-if="state.maxStep >= 6" v-show="state.activeStep === 6" class="step-pane">
        <el-form-item v-if="state.defaultLang === state.defaultLang" :label="translate('图片条件')">
          <el-input
            v-show="tableData.drawing_limit.list.length === 0"
            v-model="parseData.drawing_limit"
            :placeholder="translate('请粘贴图片条件表格数据')"
            type="textarea"
          />
          <el-button v-show="tableData.drawing_limit.list.length > 0" :icon="Delete" type="primary" @click="handleClean('drawing_limit')">
            {{ translate('重新粘贴') }}
          </el-button>
        </el-form-item>
        <el-text v-else>{{ translate('请切换中文进行编辑') }}</el-text>
        <el-table
          v-show="tableData.drawing_limit.list.length > 0"
          :border="true"
          :data="tableData.drawing_limit.list"
          :fit="true"
          :highlight-current-row="true"
          max-height="200"
          :stripe="true"
        >
          <!-- 参数列 -->
          <el-table-column align="center" fixed :label="translate('图形')" prop="condition" />
          <!-- 型号列 -->
          <el-table-column
            v-for="(model, index) in tableData.drawing_limit.column"
            :key="`drawing_limit[${index}]`"
            align="center"
            :label="model"
          >
            <template #default="{ row }">
              {{ editForm.drawing_limit[model] ? editForm.drawing_limit[model][row.condition] : '' }}
            </template>
          </el-table-column>
        </el-table>
        <el-divider content-position="left">{{ translate('(图一)公式') }}</el-divider>
        <vxe-table border :data="editForm.formulas[1]" :row-config="{ drag: true }" @row-dragend="rowDragendEvent0">
          <vxe-column field="name" :title="translate('公式名')" />
          <vxe-column drag-sort field="code" :title="translate('标识')" />
          <vxe-column field="columnar" :title="translate('公式')" />
          <vxe-column field="unit" :title="translate('默认单位')" />
          <vxe-column align="center" :label="translate('操作')" width="150">
            <template #header>
              <el-button :icon="Plus" type="primary" @click="handleAddFormulas(1, false)">{{ translate('添加') }}</el-button>
            </template>
            <template #default="{ row }">
              <el-button :icon="Edit" size="small" text type="primary" @click="handleAddFormulas(0, row)" />
              <el-button :icon="CopyDocument" size="small" text type="primary" @click="handleCopy(row)" />
              <el-button
                :icon="Delete"
                size="small"
                text
                type="primary"
                @click="editForm.formulas[0] = editForm.formulas[0].filter((item) => item.code !== row.code)"
              />
            </template>
          </vxe-column>
          <template #empty>
            <div style="text-align: center">
              <p>
                <el-button :icon="Plus" type="primary" @click="handleAddFormulas(1, false)">
                  {{ translate('暂无(图一)公式，立刻选择！') }}
                </el-button>
              </p>
            </div>
          </template>
        </vxe-table>
        <el-divider content-position="left">{{ translate('(图二)公式') }}</el-divider>
        <vxe-table border :data="editForm.formulas[1]" :row-config="{ drag: true }" @row-dragend="rowDragendEvent1">
          <vxe-column field="name" :title="translate('公式名')" />
          <vxe-column drag-sort field="code" :title="translate('标识')" />
          <vxe-column field="columnar" :title="translate('公式')" />
          <vxe-column field="unit" :title="translate('默认单位')" />
          <vxe-column align="center" :label="translate('操作')" width="150">
            <template #header>
              <el-button :icon="Plus" type="primary" @click="handleAddFormulas(0, false)">{{ translate('添加') }}</el-button>
            </template>
            <template #default="{ row }">
              <el-button :icon="Edit" size="small" text type="primary" @click="handleAddFormulas(1, row)" />
              <el-button :icon="CopyDocument" size="small" text type="primary" @click="handleCopy(row)" />
              <el-button
                :icon="Delete"
                size="small"
                text
                type="primary"
                @click="editForm.formulas[1] = editForm.formulas[1].filter((item) => item.code !== row.code)"
              />
            </template>
          </vxe-column>
          <template #empty>
            <div style="text-align: center">
              <p>
                <el-button :icon="Plus" type="primary" @click="handleAddFormulas(0, false)">
                  {{ translate('暂无(图一)公式，立刻选择！') }}
                </el-button>
              </p>
            </div>
          </template>
        </vxe-table>
      </div>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-if="state.activeStep > 0" :icon="ArrowLeft" @click="handlePrev">{{ translate('上一步') }}</el-button>
      <el-button v-if="state.activeStep < stepTitles.length - 1" :icon="ArrowRight" type="primary" @click="handleNext">
        {{ translate('下一步') }}
      </el-button>
      <el-button
        v-if="state.activeStep === stepTitles.length - 1 && editForm.status === 2"
        v-debounce="save"
        v-permissions="{ permission: ['standardsProductsReview:write'] }"
        :disabled="!(state.allow && state.haveModification)"
        :icon="Check"
        :loading="state.submit"
        type="primary"
      >
        {{ translate('保存') }}
      </el-button>
      <products-formulas
        ref="productsFormulasRef"
        :choose="state.formulas"
        :formulas="formulas"
        :shape="editForm.shapeIds"
        @change-formulas="handleFormulas"
      />
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { ArrowLeft, ArrowRight, Check, Close, Delete, Edit, Plus, CopyDocument } from '@element-plus/icons-vue'
import { productsReviewDetail, productsReviewSave } from '/@/api/productsReview'
// import { formulasAll } from '/@/api/formulas'
// import { standardsAll } from '/@/api/standards'
// import { categoriesAll } from '/@/api/categories'
// import { shapesAll } from '/@/api/shapes'
import { getStorage, setStorage } from '/@/utils/storage'
import {
  parametersJons,
  lengthJson,
  drawingJson,
  toleranceJson,
  parametersToTable,
  lengthToTable,
  drawingLimitTable,
  normalizeProductFields,
  toleranceTable,
} from '/@/utils/parseExcelToJSON'
import { compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import type { ComponentPublicInstance } from 'vue'

/* 局部类型定义（替代散落的 any） */
/** 语言字典项 */
interface LangOption {
  code: string
  name: string
}
/** 多语言文本字典（{[lang]: 文案}） */
type LangTextMap = Record<string, string>
/** 公式条目 */
interface FormulaItem {
  code: string
  [key: string]: unknown
}
/** 形状引用（按 location 分组挂载到 shapeIds） */
interface ShapeRef {
  id: number | string
  location?: string
}
/** 上传文件项 */
interface UploadFileItem {
  name: string
  url: string
}
/** 参数表行（mon/nominal/condition + values 动态键值，结构随解析文本而定） */
interface ParameterRow {
  values?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 值为动态嵌套结构
  condition?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 行内动态键随表格文本而定
  [key: string]: any
}
/** 表格区块键名 */
type TableKey = 'parameters' | 'diameter_length' | 'drawing_limit' | 'tolerance'
/** 产品模板表单数据模型（字段随接口返回动态扩展，故保留索引签名） */
interface ProductTempForm {
  id: number | null
  standard_id: number | string | undefined
  categories_id: Array<number | string>
  shapes_id: Array<number | string>
  shapeIds: Record<string, Array<number | string> | null>
  names: LangTextMap
  standard: string
  grade: string
  code: string
  year: string | number
  detail: LangTextMap
  covers: UploadFileItem[]
  formulas: FormulaItem[][]
  // 以下四个字段运行时可承载 false（清空标记），TS 声明为 Record 以便模板直接索引
  parameters: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 动态嵌套结构
  tolerance: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 动态嵌套结构
  diameter_length: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 动态嵌套结构
  drawing_limit: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 动态嵌套结构
  sort: number
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- svgs/renders/cads/assemblies/models/shapes/extension 等随接口扩展
  [key: string]: any
}
/** 编辑器组件实例（ProductsMdEdit 暴露的方法） */
interface EditorInstance {
  getDetail?: () => string
  destroy?: () => void
}
/** 公式选择弹窗组件实例（ProductsFormulas 暴露的方法） */
interface FormulasDialogExpose {
  showDialog: (num: number, row: FormulaItem | null | false) => void
}
/** 全局消息提示方法签名 */
type BaseMessageFn = (message: string, type?: 'success' | 'warning' | 'error' | 'info', customClass?: string) => void
/** 表格区块数据 */
interface TableSection {
  column: string[]
  list: ParameterRow[]
}
/** 抽屉核心状态 */
interface TempEditState {
  title: string
  drawerdFormVisible: boolean
  activeName?: string
  defaultLang: string
  activeStep: number
  maxStep: number
  isCreate: boolean
  submit: boolean
  allow: boolean
  haveModification: boolean
  loading: boolean
  execute: boolean
  formulas: Partial<FormulaItem>
  fromRules: Record<string, unknown[]>
  fromData: ProductTempForm
}

/* 组件模板名称 */
const templateName = 'StandardsProductsReviewEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

const props = defineProps(['shapes', 'standards', 'categories', 'formulas'])

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { configuration, languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/* 编辑器相关引用 */
const editorRef: Record<string, EditorInstance | null> = {} // 编辑器实例的引用集合
const formRef = ref<FormInstance | null>(null) // 表单组件引用
const productsFormulasRef = ref<FormulasDialogExpose | null>(null) // 公式选择弹窗组件引用

/* 事件和全局方法 */
const emit = defineEmits(['fetch-data']) // 定义组件事件
const $baseMessage = inject<BaseMessageFn>('$baseMessage', () => {
  /* 未注入时静默降级 */
}) // 注入全局消息提示方法

/* 核心响应式状态 */
const state = reactive<TempEditState>({
  title: '', // 对话框标题
  drawerdFormVisible: false, // 表单抽屉可见状态
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  activeStep: 0, // 当前向导步骤（语言内容=0 … 图片条件=6）
  maxStep: 0, // 已到达的最远步骤，限制步骤条只可回退到已访问步骤
  isCreate: true, // 是否为创建模式
  submit: false, // 表单提交状态
  allow: false, // 是否允许提交
  haveModification: false, // 存在未保存修改标志
  loading: false, // 数据加载状态
  execute: false,
  formulas: {},
  fromRules: {
    // 表单验证规则
    names: [
      {
        trigger: 'blur',
        validator: (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
          const name = (editForm.value.names || {})[state.defaultLang]
          if (name && String(name).trim()) callback()
          else callback(new Error(translate('请填写默认语言名称')))
        },
      },
    ],
    standard_id: [{ required: true, trigger: 'blur', message: translate('请选择标准分类') }],
    categories_id: [{ required: true, trigger: 'blur', message: translate('请选择产品分类') }],
    code: [{ required: true, trigger: 'blur', message: translate('请填写编码') }],
    year: [{ required: true, trigger: 'blur', message: translate('请填写年份') }],
  },
  fromData: {
    // 表单初始数据结构
    id: null,
    standard_id: undefined,
    categories_id: [],
    shapes_id: [],
    shapeIds: {},
    names: {},
    standard: '',
    grade: '',
    code: '',
    year: '',
    detail: { 'zh-cn': '' },
    covers: [],
    svgs: [],
    renders: [],
    cads: [],
    assemblies: [],
    models: [],
    parameters: {},
    tolerance: {},
    diameter_length: {},
    drawing_limit: {},
    formulas: [[], []],
    extension: {},
    sort: 0,
    status: 1,
  },
})

/* 向导步骤配置 */
const stepTitles = [
  translate('语言内容'),
  translate('基本信息'),
  translate('图片'),
  translate('形状'),
  translate('参数'),
  translate('长度'),
  translate('图片条件'),
]
const stepRequiredFields: Record<number, string[]> = {
  0: ['names'],
  1: ['standard_id', 'categories_id', 'code', 'year'],
}

/* 多语言单语言维护：语言选项、当前维护语言与回退取值 */
const stateLangOptions = computed<LangOption[]>(() => {
  const dict = languages.value
  if (Array.isArray(dict)) return (dict as LangOption[]).filter((item) => item && item.code)
  if (dict && typeof dict === 'object') return (Object.values(dict) as LangOption[]).filter((item) => item && item.code)
  return []
})
const stateCurLang = ref((defaultItem.value?.languages as string) || 'zh-cn')
const stateCurLangName = computed(() => {
  const target = stateLangOptions.value.find((item) => item.code === stateCurLang.value)
  return target ? target.name : stateCurLang.value
})
const editLangModel = computed({
  get: () => stateCurLang.value,
  set: (code: string) => switchCurLang(code),
})
const textOfNames = (names: LangTextMap | null | undefined) => {
  if (!names || typeof names !== 'object') return ''
  const direct = names[stateCurLang.value]
  if (direct && String(direct).trim()) return direct
  return names[state.defaultLang] || names['zh-cn'] || ''
}
const textOfShape = (shapeCfg: LangTextMap | null | undefined) => {
  if (!shapeCfg || typeof shapeCfg !== 'object') return ''
  const direct = shapeCfg[stateCurLang.value]
  if (direct && String(direct).trim()) return direct
  return shapeCfg[state.defaultLang] || shapeCfg['zh-cn'] || ''
}
const drawerTitleText = computed(() => {
  const f = editForm.value || {}
  const stdName = textOfNames(f.names)
  return `${state.title}:[${f.standard || ''}${f.grade ? '/' : ''}${f.grade || ''} ${f.code || ''}-${f.year || ''} ${stdName || ''}]`
})
const flushEditorDetail = (lang: string) => {
  const editor = editorRef[lang]
  if (editor && typeof editor.getDetail === 'function') {
    const detailText = editor.getDetail()
    if (!editForm.value.detail) editForm.value.detail = {}
    if (detailText) editForm.value.detail[lang] = detailText
    else delete editForm.value.detail[lang]
  }
}
const sanitizeLangContent = () => {
  // 非默认语言空内容删除键位，防脏数据；提交仍为全量语言结构
  const f = editForm.value
  if (!f || !f.names || typeof f.names !== 'object') return
  const defaultLang = state.defaultLang
  Object.keys(f.names).forEach((key) => {
    if (key === defaultLang) return
    if (!String(f.names[key] || '').trim()) delete f.names[key]
  })
  if (f.detail && typeof f.detail === 'object') {
    Object.keys(f.detail).forEach((key) => {
      if (key === defaultLang) return
      if (!String(f.detail[key] || '').trim()) delete f.detail[key]
    })
    if (Object.keys(f.detail).length === 0) f.detail = { [defaultLang]: '' }
  }
}
const switchCurLang = (code: string) => {
  if (code === stateCurLang.value) return
  // 切换前写回旧语言编辑器内容
  flushEditorDetail(stateCurLang.value)
  // 非默认语言空内容删除键，防脏数据
  sanitizeLangContent()
  stateCurLang.value = code
  aclStore.setCurrentLang(code)
  // 编辑器已按 key 重建，旧语言引用置空避免卸载时重复 destroy
  Object.keys(editorRef).forEach((key) => {
    if (key !== code) delete editorRef[key]
  })
}

/**
 * 向导：跳转到已到达过的步骤（只允许回退）
 */
const handleStepClick = (index: number) => {
  if (index < 0 || index > state.maxStep || index === state.activeStep) return
  state.activeStep = index
}

/**
 * 向导：上一步
 */
const handlePrev = () => {
  if (state.activeStep <= 0) return
  state.activeStep -= 1
}

/**
 * 向导：下一步，进入前先校验当前步骤必填字段
 * @description 先进到下一步的 v-if 挂载帧（maxStep 先更新），再于下一帧切换 v-show，
 * 避免未访问过的大表格步骤同步渲染阻塞点击后的首帧
 */
const handleNext = () => {
  if (state.activeStep >= stepTitles.length - 1) return
  const fields = stepRequiredFields[state.activeStep]
  const doForward = () => {
    const next = state.activeStep + 1
    state.maxStep = Math.max(state.maxStep, next)
    requestAnimationFrame(() => {
      state.activeStep = next
    })
  }
  if (!fields?.length || !formRef.value) return doForward()
  formRef.value.validateField(fields, (valid: boolean) => {
    if (valid) doForward()
    else $baseMessage(translate('请完善本步骤必填内容后再继续'), 'warning', 'hey')
  })
}

const parseData = reactive<Record<TableKey, string>>({
  parameters: '',
  diameter_length: '',
  drawing_limit: '',
  tolerance: '',
})

const tableData = reactive<Record<TableKey, TableSection>>({
  parameters: {
    column: [],
    list: [],
  },
  diameter_length: {
    column: [],
    list: [],
  },
  drawing_limit: {
    column: [],
    list: [],
  },
  tolerance: {
    column: [],
    list: [],
  },
})

Object.keys(configuration.value.shape).forEach((item) => {
  state.fromData.shapeIds[item] = null
})

/* 编辑表单数据模型 */
const editForm = ref<ProductTempForm>({ ...state.fromData })
const sourceForm = ref<ProductTempForm>({ ...state.fromData })

/**
 * 验证表单允许提交状态
 * @description 通过表单验证和内容比对控制允许提交状态
 */
const checkAllow = () => {
  state.haveModification = !compareObjects(editForm.value, sourceForm.value)
  if (formRef.value) {
    formRef.value.validate(async (valid: boolean) => {
      state.allow = !!valid
    })
  }
}

let checkTimer: ReturnType<typeof setTimeout> | null = null
/**
 * 防抖触发校验（200ms）
 * @description 高频输入/表格操作时合并 validate，避免按钮允许状态频繁抖动与表单重渲染
 */
const scheduleCheckAllow = () => {
  if (checkTimer) clearTimeout(checkTimer)
  checkTimer = setTimeout(() => {
    checkTimer = null
    if (!state.submit) checkAllow()
  }, 200)
}

/**
 * 通用的行拖动事件处理
 * @param array 表格数据数组
 * @param newRow 新位置的行数据
 * @param oldRow 原来的行数据
 * @param dragPos 拖动位置
 */
const handleRowDragend = (array: FormulaItem[], newRow: FormulaItem, oldRow: FormulaItem, dragPos: string) => {
  function moveItemBefore(list: FormulaItem[], targetCode: string, beforeCode: string) {
    const targetIndex = list.findIndex((item) => item.code === targetCode)
    const beforeIndex = list.findIndex((item) => item.code === beforeCode)
    if (targetIndex === -1 || beforeIndex === -1 || targetIndex === beforeIndex) {
      console.log('无效操作')
      return
    }
    // 删除目标元素
    const [movedItem] = array.splice(targetIndex, 1)
    // 插入到目标位置前
    array.splice(beforeIndex, 0, movedItem)
  }
  if (dragPos == 'top') {
    moveItemBefore(array, oldRow.code, newRow.code)
  } else {
    moveItemBefore(array, newRow.code, oldRow.code)
  }
}

/**
 * 通用的行拖动事件处理
 * @param arrayIndex 表示使用formulas数组的哪个子数组
 * @param params 行拖动事件参数
 */
const createRowDragendHandler = (arrayIndex: number) => {
  return ({ newRow, oldRow, dragPos }: { newRow: FormulaItem; oldRow: FormulaItem; dragPos: string }) => {
    handleRowDragend(editForm.value.formulas[arrayIndex], newRow, oldRow, dragPos)
  }
}

const rowDragendEvent0 = createRowDragendHandler(0)
const rowDragendEvent1 = createRowDragendHandler(1)

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: number | string | null | undefined) => {
  const { data } = await productsReviewDetail({ id: Number(id) || 0 })
  return normalizeProductFields(data) as ProductTempForm
}

// 监听编辑器内容变化
const watchEditor = (row: { language?: string; detail?: string }) => {
  if (row.language) {
    if (!editForm.value.detail) editForm.value.detail = {}
    if (row.detail && String(row.detail).trim()) {
      editForm.value.detail[row.language] = row.detail
    } else if (row.language !== state.defaultLang) {
      // 非默认语言空内容删除键，防脏数据
      delete editForm.value.detail[row.language]
    } else {
      editForm.value.detail[row.language] = ''
    }
  }
  scheduleCheckAllow()
}

const formulasArr = ref<Record<string, FormulaItem>>({})

/**
 * 请求空闲帧：等一帧再继续，避免大对象初始化阻塞抽屉弹出动画
 */
const waitForFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(0)))

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showEdit = async (row: ProductTempForm | null) => {
  const initializeForm = (baseData: ProductTempForm, extendData?: Partial<ProductTempForm>) => {
    const jsonDate = { ...(baseData || {}), ...(extendData || {}) }
    sourceForm.value = JSON.parse(JSON.stringify(jsonDate))
    editForm.value = JSON.parse(JSON.stringify(jsonDate))
    if (editForm.value.parameters) {
      jsonToTable('parameters')
    }
    if (editForm.value.diameter_length) {
      jsonToTable('diameter_length')
    }
    if (editForm.value.drawing_limit) {
      jsonToTable('drawing_limit')
    }
    if (editForm.value.tolerance) {
      jsonToTable('tolerance')
    }
    state.activeStep = 0
    state.maxStep = 0
    state.loading = false
    checkAllow()
    open()
  }

  formulasArr.value = (props.formulas as FormulaItem[]).reduce((map: Record<string, FormulaItem>, item: FormulaItem) => {
    map[item.code] = item
    return map
  }, {})

  if (!row) {
    state.isCreate = true
    state.title = translate('添加')
    const lastFormData = getStorage('lastFormData') || {}

    // 草稿加载确认流程（确认弹窗期间不打开抽屉，保持原交互节奏）
    if (lastFormData[templateName]) {
      try {
        await ElMessageBox.confirm(translate('检测到有未保存的草稿。您想要加载此草稿继续编辑吗？如果选择不加载，当前草稿将会被清空。'), {
          draggable: false,
          cancelButtonText: translate('放弃草稿'),
          confirmButtonText: translate('加载'),
        })
        initializeForm(state.fromData, lastFormData[templateName])
      } catch {
        cleanLastFormData()
        initializeForm(state.fromData)
      }
    } else {
      // 先弹空抽屉骨架，数据量小时也等一帧，保证弹出动画不阻塞
      await waitForFrame()
      initializeForm(state.fromData)
    }
  } else {
    state.isCreate = false
    state.title = translate('编辑')
    // 先弹空壳抽屉并显示内部 loading，等数据就绪后再填充，
    // 避免大对象初始化/表格解析阻塞在 drawer 弹出动画帧上
    open()
    state.loading = true
    const detailRow = await fetchData(row.id)
    if (!detailRow || typeof detailRow !== 'object') {
      ElMessage.error(translate('获取产品数据失败'))
      state.loading = false
      close()
      return
    }
    await waitForFrame()
    detailRow.shapeIds = {}
    Object.values(detailRow.shapes as Record<string, ShapeRef>).forEach((item) => {
      if (item?.location) {
        const list = (detailRow.shapeIds[item.location] ||= [])
        list.push(item.id)
      }
    })
    detailRow.formulas = [[...(detailRow.formulas?.[0] || '')], [...(detailRow.formulas?.[1] || '')]]
    initializeForm(state.fromData, { ...row, ...detailRow })
  }
}

const getSortMethod = (model: string) => {
  return (a: ParameterRow, b: ParameterRow): number => {
    const valueA = getValueFromRow(a, model)
    const valueB = getValueFromRow(b, model)
    return valueA - valueB
  }
}
const getValueFromRow = (row: ParameterRow, model: string): number => {
  const modelValue = row.values?.[model]
  // 与原逻辑一致：取不到值时按 0 处理（rawValue=0 → parseFloat('0')*1000 = 0）
  if (!modelValue) return 0
  const dict = modelValue as Record<string, unknown>
  const key = row.condition ?? ''
  const rawValue = dict[key] !== undefined ? dict[key] : modelValue
  const numericValue = parseFloat(String(rawValue).trim()) * 1000
  return isNaN(numericValue) ? Number.NEGATIVE_INFINITY : numericValue
}

// 暴露组件方法
defineExpose({ showEdit })

/**
 * 处理文件上传变化
 * @param {Array} uploadFiles - 上传文件数组
 */
const changeFiles = (uploadFiles: UploadFileItem[], uploadName?: string) => {
  editForm.value[uploadName || 'covers'] = uploadFiles.map((item) => ({
    name: item.name || '',
    url: item.url || '',
  }))
  scheduleCheckAllow()
}

/**
 * 保存表单草稿数据
 * @description 在localStorage中存储未提交的表单数据
 */
const setLastFormData = () => {
  if (!state.isCreate) return
  try {
    const lastFormData = getStorage('lastFormData') || {}
    if (!compareObjects(editForm.value, sourceForm.value)) {
      lastFormData[templateName] = JSON.parse(JSON.stringify(editForm.value))
    } else {
      delete lastFormData[templateName]
    }
    setStorage('lastFormData', lastFormData)
  } catch (error) {
    // 草稿体积超出 localStorage 容量时静默失败，不影响编辑主流程
    console.warn('[draft] 草稿保存失败', error)
  }
}

let draftTimer: ReturnType<typeof setTimeout> | null = null
/**
 * 防抖触发草稿保存（600ms）
 * @description 避免每次输入/上传同步 JSON.stringify 大对象写 localStorage
 */
const scheduleSaveDraft = () => {
  if (!state.isCreate) return
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    draftTimer = null
    if (!state.submit) setLastFormData()
  }, 600)
}

/**
 * 清理草稿数据
 */
const cleanLastFormData = () => {
  const lastFormData = getStorage('lastFormData') || {}
  delete lastFormData[templateName]
  setStorage('lastFormData', lastFormData)
}

/**
 * 处理对话框关闭逻辑
 * @description 包含未保存修改确认流程
 */
const handleClose = async () => {
  if (!state.drawerdFormVisible) return
  if (state.haveModification) {
    ElMessageBox.confirm(translate('您确定要放弃修改吗？'), {
      draggable: false,
    })
      .then(async () => {
        close()
      })
      .catch(() => {
        /* 取消关闭操作 */
      })
  } else {
    close()
  }
}

// 对话框控制方法
const open = () => {
  state.drawerdFormVisible = true
}
const close = async () => {
  state.drawerdFormVisible = false
}

/**
 * 保存表单核心逻辑
 * @description 处理表单提交和结果反馈
 */
const save = () => {
  if (state.submit) return
  state.submit = true

  const form = formRef.value
  if (!form) {
    state.submit = false
    return
  }
  form.validate(async (valid: boolean) => {
    if (valid) {
      try {
        // 提交前写回编辑器当前内容并清理非默认语言空键
        flushEditorDetail(stateCurLang.value)
        sanitizeLangContent()
        setStorage('lastGrade', editForm.value.grade)
        editForm.value.shapes_id = Object.values(editForm.value.shapeIds)
          .filter((item) => !!item)
          .flat()
        const { msg } = (await productsReviewSave(editForm.value as unknown as Parameters<typeof productsReviewSave>[0])) as unknown as {
          msg: string
        }
        form.resetFields()
        sourceForm.value = JSON.parse(JSON.stringify(state.fromData))
        editForm.value = JSON.parse(JSON.stringify(state.fromData))
        handleClean('parameters')
        handleClean('diameter_length')
        handleClean('drawing_limit')
        handleClean('tolerance')
        $baseMessage(msg, 'success', 'hey')
        emit('fetch-data')
        cleanLastFormData()
        close()
      } catch (error) {
        $baseMessage(translate('保存失败，请重试'), 'error', 'hey')
        console.error('保存失败:', error)
      } finally {
        state.submit = false
      }
    } else {
      $baseMessage(translate('请检查表单输入'), 'warning', 'hey')
      state.submit = false
    }
  })
}

const jsonToTable = (parseType: TableKey) => {
  if (parseType === 'parameters') parametersToTable(tableData.parameters, editForm.value)
  else if (parseType === 'diameter_length') lengthToTable(tableData.diameter_length, editForm.value)
  else if (parseType === 'drawing_limit') drawingLimitTable(tableData.drawing_limit, editForm.value)
  else if (parseType === 'tolerance') toleranceTable(tableData.tolerance, editForm.value)
}

const handleClean = (jsonData: TableKey) => {
  state.execute = true
  if (parseData[jsonData]) parseData[jsonData] = ''
  // 运行时以 false 作为清空标记（字段 TS 声明为 Record，此处走 unknown 通道写入）
  if (editForm.value[jsonData]) (editForm.value as unknown as Record<string, unknown>)[jsonData] = false
  if (tableData[jsonData]) tableData[jsonData] = { column: [], list: [] }
  state.execute = false
}

const handleAddFormulas = (num: number, row: FormulaItem | null | false) => {
  state.formulas = row || {}
  productsFormulasRef.value?.showDialog(num, row)
}

const handleFormulas = (num: number, selectionRows: FormulaItem) => {
  // 使用 map 替换匹配的对象
  const exists = editForm.value.formulas[num].some((item) => item.code === selectionRows.code)
  if (!exists) {
    editForm.value.formulas[num].push(selectionRows)
  } else {
    editForm.value.formulas[num] = editForm.value.formulas[num].map((item) => (item.code === selectionRows.code ? selectionRows : item))
  }
}

const handleCopy = (row: FormulaItem) => {
  // clip(JSON.stringify(row))
  setStorage('lastCopyFormulas', row)
}

const handleParametersCellClick = (row: ParameterRow, column: { label?: string }) => {
  const colLabel = column.label || ''
  if (['mon', translate('公称'), translate('等级'), translate('条件')].includes(colLabel)) return
  function isDeepEqual(obj1: unknown, obj2: unknown): boolean {
    if (obj1 === obj2) return true
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
      return false
    }
    const recordA = obj1 as Record<string, unknown>
    const recordB = obj2 as Record<string, unknown>
    const keysA = Object.keys(recordA),
      keysB = Object.keys(recordB)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!isDeepEqual(recordA[key], recordB[key])) return false
    }
    return true
  }
  const index = (tableData.parameters.list || []).findIndex((item) => isDeepEqual(item, row))
  const source = editForm.value.parameters[colLabel][`${row['mon']}${row['nominal']}`]
  ElMessageBox.prompt('', translate('更新数据'), {
    confirmButtonText: translate('更新'),
    cancelButtonText: translate('取消'),
    inputValue: !!row['condition'] ? source[row['condition']] : source,
  })
    .then(({ value }) => {
      if (!!value) {
        tableData.parameters.list[index]['values']![colLabel] = value
        if (!!row['condition']) {
          editForm.value.parameters[colLabel][`${row['mon']}${row['nominal']}`][row['condition']] = value
        } else {
          editForm.value.parameters[colLabel][`${row['mon']}${row['nominal']}`] = value
        }
      }
    })
    .catch(() => {})
}

/**
 * 监听表单变化处理器
 * @description 深度监听编辑表单变化，触发允许提交检查和草稿保存
 */
watch(
  editForm,
  () => {
    if (!state.submit) {
      scheduleCheckAllow()
      scheduleSaveDraft()
    }
  },
  { deep: true, immediate: false, flush: 'post' } // 深度监听，DOM/表格更新后触发，避免与 vxe 内部渲染互相抢占
)

let parseTimer: ReturnType<typeof setTimeout> | null = null
/**
 * 防抖监听 parseData（250ms）
 * @description 粘贴大段表格数据后合并重解析，避免每个字符都触发 jsonToTable 全量重建 vxe 表格
 */
watch(
  parseData,
  () => {
    if (parseTimer) clearTimeout(parseTimer)
    parseTimer = setTimeout(() => {
      parseTimer = null
      if (state.execute) return
      state.execute = true
      try {
        editForm.value.parameters = !parseData.parameters ? editForm.value.parameters : parametersJons(parseData.parameters)
        editForm.value.diameter_length = !parseData.diameter_length ? editForm.value.diameter_length : lengthJson(parseData.diameter_length)
        editForm.value.drawing_limit = !parseData.drawing_limit ? editForm.value.drawing_limit : drawingJson(parseData.drawing_limit)
        editForm.value.tolerance = !parseData.tolerance ? editForm.value.tolerance : toleranceJson(parseData.tolerance)
        if (editForm.value.parameters) {
          jsonToTable('parameters')
        }
        if (editForm.value.diameter_length) {
          jsonToTable('diameter_length')
        }
        if (editForm.value.drawing_limit) {
          jsonToTable('drawing_limit')
        }
        if (editForm.value.tolerance) {
          jsonToTable('tolerance')
        }
      } finally {
        state.execute = false
      }
    }, 250)
  },
  { deep: true, immediate: false, flush: 'post' } // 深度监听，非立即触发
)
/** 若对象带有 destroy 方法则调用（编辑/预览组件实例的清理钩子） */
const destroyIfAble = (target: unknown) => {
  const destroyable = target as { destroy?: () => void } | null | undefined
  if (destroyable && typeof destroyable.destroy === 'function') destroyable.destroy()
}

const init = () => {
  destroyIfAble(editForm.value)
  destroyIfAble(sourceForm.value)
  destroyIfAble(parseData)
  destroyIfAble(tableData)
}

/* 生命周期钩子 */
onBeforeMount(() => {
  init()
})
onBeforeUnmount(() => {
  // 组件卸载前清理逻辑
  init()
  // 清理防抖定时器，避免关闭抽屉后仍触发草稿/解析逻辑
  if (draftTimer) clearTimeout(draftTimer)
  if (parseTimer) clearTimeout(parseTimer)
  // 清理表单引用
  formRef.value = null
  productsFormulasRef.value = null
  // 清理编辑器实例
  for (const key in editorRef) {
    if (editorRef[key] && typeof editorRef[key]!.destroy === 'function') {
      editorRef[key]!.destroy()
      delete editorRef[key]
    }
  }
})
</script>

<style lang="scss" scoped>
.drawer-edit-steps {
  margin: 0 0 18px;

  .drawer-step-clickable {
    cursor: pointer;
  }
}

.step-pane {
  min-height: 360px;
}
</style>
<style lang="scss" scoped>
/* 三段式抽屉共用样式 */
.drawer-edit-form {
  padding: 0 4px;

  .drawer-edit-hint {
    width: 100%;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
  }

  .drawer-edit-langbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 0 12px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .drawer-edit-langbar__label {
      color: var(--el-text-color-regular);
      font-size: 14px;
      flex: none;
    }

    .drawer-edit-langbar__select {
      width: 140px;
      flex: none;
    }

    .drawer-edit-langbar__badge {
      flex: none;
      font-size: 12px;
      line-height: 20px;
      padding: 0 8px;
      border-radius: 4px;
      color: #fff;
      background: var(--el-color-primary);
    }

    .drawer-edit-langbar__tip {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }

  .drawer-edit-editor {
    .drawer-edit-editor-label {
      color: var(--el-text-color-regular);
      font-size: 14px;
      line-height: 32px;
      margin-bottom: 4px;
    }

    .md-editor-container,
    :deep(.v-md-editor) {
      width: 100%;
    }
  }

  :deep(.el-divider--horizontal) {
    margin: 18px 0 16px;
  }
}
</style>
