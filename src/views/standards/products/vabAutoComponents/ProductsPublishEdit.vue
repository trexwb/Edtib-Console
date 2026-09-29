<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:16:38
 * @LastEditors: ${git_name}
 * @LastEditTime: 2026-09-14 09:43:17
 * @FilePath: /fastenerTradeWorkbench/Users/wbtrex/website/localServer/node/edtib/client/console/web/src/views/standards/products/vabAutoComponents/ProductsPublishEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer
    v-model="state.drawerdFormVisible"
    append-to-body
    :before-close="handleClose"
    class="drawer-edit-drawer"
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
          <el-option v-for="lang in stateLangOptions" :key="lang.code" :label="lang.name" :value="lang.code" />
        </el-select>
        <span v-if="stateCurLang === state.defaultLang" class="drawer-edit-langbar__badge">{{ translate('默认语言') }}</span>
        <span v-else class="drawer-edit-langbar__tip">
          {{ translate('当前仅维护') }}「{{ stateCurLangName }}」{{ translate('，其余语言数据保持不变') }}
        </span>
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

      <!-- 步骤 0：基本信息（含当前语言名称，默认语言名称必填） -->
      <div v-show="state.activeStep === 0" class="step-pane">
        <el-form-item :label="translate('名称')" prop="names">
          <el-input
            v-model.trim="(editForm.names || {})[stateCurLang]"
            clearable
            :placeholder="`${translate('请输入')}${stateCurLangName}${translate('名称')}`"
          />
          <div v-if="stateCurLang !== state.defaultLang && !(editForm.names || {})[state.defaultLang]" class="drawer-edit-hint">
            {{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('名称必填，未填写时请先切换维护默认语言') }}
          </div>
        </el-form-item>
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
        <el-form-item :label="translate('免费可见')" prop="free_tier">
          <el-switch v-model="editForm.free_tier" :active-value="1" :inactive-value="0" />
          <el-text class="mx-1" size="small" type="info">
            {{ translate('开启后未订阅用户无需付费即可查看该产品标准，关闭则仅订阅用户可见') }}
          </el-text>
        </el-form-item>
        <el-form-item :label="translate('图标')" prop="covers" style="width: 100%">
          <products-upload accept="image/*" :files="editForm.covers || []" :limit="1" name="covers" @change-files="changeFiles" />
        </el-form-item>
        <div style="padding: 0 0 20px 80px">{{ translate('仅支持jpg、png图片，建议小于10k的正方形图片') }}</div>
      </div>

      <!-- 步骤 1：详细说明（单编辑器随当前维护语言切换加载，保存仍提交全部语言） -->
      <div v-if="state.maxStep >= 1" v-show="state.activeStep === 1" class="step-pane step-pane--detail">
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
            v-if="state.defaultLang === state.defaultLang && (editForm.assemblies || []).length > 1"
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
        <el-form-item :label="translate('模型图')" style="width: 100%">
          <el-form-item :label="translate('选择图片(2张)')" label-width="120" prop="models" style="width: 100%">
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
            v-if="state.defaultLang === state.defaultLang && (editForm.models || []).length > 1"
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
          :key="`parametersPublish[${editForm.id}]`"
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
        <el-form-item v-if="state.defaultLang === state.defaultLang" :label="translate('长度公差')" style="margin-top: 24px">
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
        <el-text v-else style="display: block; margin-top: 24px">{{ translate('请切换中文进行编辑') }}</el-text>
        <el-table
          v-show="tableData.tolerance.list.length > 0"
          :border="true"
          :data="tableData.tolerance.list"
          :fit="true"
          :highlight-current-row="true"
          max-height="500"
          :stripe="true"
          style="margin-top: 12px"
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
        <vxe-table border :data="editForm.formulas[0]" :row-config="{ drag: true }" @row-dragend="rowDragendEvent0">
          <vxe-column field="name" :title="translate('公式名')" />
          <vxe-column drag-sort field="code" :title="translate('标识')" />
          <vxe-column field="columnar" :title="translate('公式')" />
          <vxe-column field="unit" :title="translate('默认单位')" />
          <vxe-column align="center" :label="translate('操作')" width="150">
            <template #header>
              <el-button :icon="Plus" type="primary" @click="handleAddFormulas(0, false)">{{ translate('添加') }}</el-button>
            </template>
            <template #default="{ row }">
              <el-button :icon="Edit" size="small" text type="primary" @click="handleAddFormulas(0, row)" />
              <el-button :icon="CopyDocument" size="small" text type="primary" @click="handleCopy(row)" />
              <el-button
                :icon="Delete"
                size="small"
                text
                type="primary"
                @click="editForm.formulas[0] = editForm.formulas[0].filter((item: FormulaItem) => item.code !== row.code)"
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
        <el-divider content-position="left">{{ translate('(图二)公式') }}</el-divider>
        <vxe-table border :data="editForm.formulas[1]" :row-config="{ drag: true }" @row-dragend="rowDragendEvent1">
          <vxe-column field="name" :title="translate('公式名')" />
          <vxe-column drag-sort field="code" :title="translate('标识')" />
          <vxe-column field="columnar" :title="translate('公式')" />
          <vxe-column field="unit" :title="translate('默认单位')" />
          <vxe-column align="center" :label="translate('操作')" width="150">
            <template #header>
              <el-button :icon="Plus" type="primary" @click="handleAddFormulas(1, false)">{{ translate('添加') }}</el-button>
            </template>
            <template #default="{ row }">
              <el-button :icon="Edit" size="small" text type="primary" @click="handleAddFormulas(1, row)" />
              <el-button :icon="CopyDocument" size="small" text type="primary" @click="handleCopy(row)" />
              <el-button
                :icon="Delete"
                size="small"
                text
                type="primary"
                @click="editForm.formulas[1] = editForm.formulas[1].filter((item: FormulaItem) => item.code !== row.code)"
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
      </div>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-if="state.activeStep > 0" :icon="ArrowLeft" @click="handlePrev">{{ translate('上一步') }}</el-button>
      <el-button v-if="state.activeStep < stepTitles.length - 1" :icon="ArrowRight" type="primary" @click="handleNext">
        {{ translate('下一步') }}
      </el-button>
      <el-button
        v-if="state.activeStep === stepTitles.length - 1"
        v-debounce="save"
        v-permissions="{ permission: ['standardsProducts:write'] }"
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
import { productsDetail, productsSave } from '/@/api/products'
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
  categories_id: Array<number | string> | null
  shapes_id: Array<number | string> | null
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
  free_tier: number
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
  activeName: string
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
const templateName = 'StandardsProductsPublishEdit'

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
  activeName: defaultItem.value.languages || 'zh-cn', // 当前激活的标签页
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
    categories_id: null,
    shapes_id: null,
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
    free_tier: 0,
  },
})

/* 向导步骤配置 */
const stepTitles = [
  translate('基本信息'),
  translate('详细说明'),
  translate('图片'),
  translate('形状'),
  translate('参数'),
  translate('长度'),
  translate('图片条件'),
]
const stepRequiredFields: Record<number, string[]> = {
  0: ['names', 'standard_id', 'categories_id', 'code', 'year'], // 基本信息：名称 + 原基本信息必填
  1: [], // 详细说明：无必填字段（多语言内容可选填写）
}

/** 接口语言列表（兼容数组 / Record<code,{code,name}> 两种返回形态） */
const stateLangOptions = computed<LangOption[]>(() => {
  const dict = languages.value
  if (Array.isArray(dict)) return (dict as LangOption[]).filter((item) => item && item.code)
  if (dict && typeof dict === 'object') return (Object.values(dict) as LangOption[]).filter((item) => item && item.code)
  return []
})

/** 默认语言展示名 */
const stateDefaultLangName = computed(() => {
  const target = stateLangOptions.value.find((item: LangOption) => item.code === state.defaultLang)
  return target ? target.name : state.defaultLang
})

/** 当前维护语言（全局顶部切换器驱动，默认回退默认语言） */
const stateCurLang = computed(() => {
  const global = aclStore.getCurrentLang
  return global || state.defaultLang
})

/** 当前维护语言展示名 */
const stateCurLangName = computed(() => {
  const target = stateLangOptions.value.find((item: LangOption) => item.code === stateCurLang.value)
  return target ? target.name : stateCurLang.value
})

/** 语言文本取值：优先当前维护语言，缺失时回退默认语言，避免界面空白 */
const textOfNames = (names: LangTextMap | null | undefined) => {
  if (!names || typeof names !== 'object') return ''
  return names[stateCurLang.value] || names[state.defaultLang] || ''
}

/** 形状分组等扁平语言字典（{[lang]: 文案}）取值，规则同 textOfNames */
const textOfShape = (shape: LangTextMap | null | undefined) => {
  if (!shape || typeof shape !== 'object') return ''
  return shape[stateCurLang.value] || shape[state.defaultLang] || ''
}

/**
 * 切换维护语言前同步当前编辑器内容
 * @description 编辑器随 :key 重建前先把旧语言的最新内容写回 editForm，
 * 空内容且非默认语言时删除键位避免提交脏数据
 */
const flushEditorDetail = () => {
  const lang = stateCurLang.value
  const editor = editorRef[lang]
  if (editor && typeof editor.getDetail === 'function') {
    const value = editor.getDetail()
    const detail = (editForm.value.detail = editForm.value.detail || {})
    if (value && String(value).trim()) detail[lang] = value
    else if (lang !== state.defaultLang) delete detail[lang]
  }
}

/** 维护语言下拉 v-model：切换前取回旧语言内容，再写入全局并持久化 */
const editLangModel = computed({
  get: () => stateCurLang.value,
  set: (v: string) => {
    if (!v || v === stateCurLang.value) return
    flushEditorDetail()
    aclStore.setCurrentLang(v)
    scheduleCheckAllow()
  },
})

/**
 * 向导：切换到目标步骤
 * @description 目标步骤未渲染过时先挂载（maxStep 前置），
 * 借助 requestAnimationFrame 让切换发生在下一帧，避免“点击后同步渲染大表格”造成的卡顿
 */
const goToStep = (index: number) => {
  if (index < 0 || index >= stepTitles.length) return
  if (index === state.activeStep) return
  if (index <= state.maxStep) {
    // 已访问过：直接切换显示，无新建成本
    state.activeStep = index
    return
  }
  // 未访问过：先挂载目标步骤内容（v-show 隐藏），渲染完成后下一帧再切换
  state.maxStep = index
  requestAnimationFrame(() => {
    state.activeStep = index
  })
}

/**
 * 向导：跳转到已到达过的步骤（只允许回退）
 */
const handleStepClick = (index: number) => {
  if (index < 0 || index > state.maxStep) return
  goToStep(index)
}

/**
 * 向导：上一步
 */
const handlePrev = () => {
  goToStep(state.activeStep - 1)
}

/**
 * 向导：下一步，进入前先校验当前步骤必填字段
 */
const handleNext = () => {
  if (state.activeStep >= stepTitles.length - 1) return
  const fields = stepRequiredFields[state.activeStep]
  const doForward = () => {
    goToStep(state.activeStep + 1)
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
 * 抽屉标题文本
 * @description 组装“编辑:[标准/级别 编号-年份 名称]”，过滤空片段，
 * 避免标准/级别/编号/年份缺失时出现多余空格、斜杠或“[]”空壳，保证标题栏整洁单行。
 */
const drawerTitleText = computed(() => {
  const f = editForm.value || {}
  const meta = [f.standard, f.grade ? `/${f.grade}` : ''].join('')
  const ident = f.code && f.year ? `${f.code}-${f.year}` : f.code || f.year || ''
  const name = (f.names || {})[state.defaultLang] || ''
  const parts = [meta, ident, name].filter((v) => String(v).trim() !== '')
  return parts.length ? `${state.title}: [${parts.join(' ')}]` : state.title
})

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

let allowTimer: ReturnType<typeof setTimeout> | null = null
/**
 * 防抖触发 checkAllow（200ms）
 * @description 输入/上传等高频变更只做一次完整校验+深比较，避免每键触发 validate 卡顿
 */
const scheduleCheckAllow = () => {
  if (allowTimer) clearTimeout(allowTimer)
  allowTimer = setTimeout(() => {
    allowTimer = null
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
  function moveItemBefore(array: FormulaItem[], targetCode: string, beforeCode: string) {
    const targetIndex = array.findIndex((item: FormulaItem) => item.code === targetCode)
    const beforeIndex = array.findIndex((item: FormulaItem) => item.code === beforeCode)
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
  const { data } = await productsDetail({ id: Number(id) || 0 })
  return normalizeProductFields(data) as ProductTempForm
}

// 监听编辑器内容变化
const watchEditor = (row: { language?: string; detail?: string }) => {
  if (row.language) {
    const detail = (editForm.value.detail = editForm.value.detail || {})
    // 有内容写回；空内容且非默认语言时删除键位，避免把空 key 提交成脏数据
    if (row.detail && String(row.detail).trim()) detail[row.language] = row.detail
    else if (row.language !== state.defaultLang) delete detail[row.language]
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
    Object.values(detailRow.shapes as Record<string, ShapeRef>).forEach((item: ShapeRef) => {
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
  editForm.value[uploadName || 'covers'] = uploadFiles.map((item: UploadFileItem) => ({
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
        setStorage('lastGrade', editForm.value.grade)
        editForm.value.shapes_id = Object.values(editForm.value.shapeIds)
          .filter((item) => !!item)
          .flat()
        const { msg } = (await productsSave(editForm.value as unknown as Parameters<typeof productsSave>[0])) as unknown as { msg: string }
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
  const exists = editForm.value.formulas[num].some((item: FormulaItem) => item.code === selectionRows.code)
  if (!exists) {
    editForm.value.formulas[num].push(selectionRows)
  } else {
    editForm.value.formulas[num] = editForm.value.formulas[num].map((item: FormulaItem) =>
      item.code === selectionRows.code ? selectionRows : item
    )
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
  const index = (tableData.parameters.list || []).findIndex((item: ParameterRow) => isDeepEqual(item, row))
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
 * @description 深度监听编辑表单变化，防抖后触发允许提交检查和草稿保存（原同步逐键触发）
 */
watch(
  editForm,
  () => {
    if (!state.submit) {
      scheduleCheckAllow()
      scheduleSaveDraft()
    }
  },
  { deep: true, flush: 'post' } // 深度监听，渲染后触发
)

let parseTimer: ReturnType<typeof setTimeout> | null = null
/**
 * 监听表格原始文本变化处理器（防抖 250ms）
 * @description 粘贴/输入大段表格文本时合并转换，避免每次按键全量重建表格卡顿
 */
watch(
  parseData,
  () => {
    if (state.execute) return
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
  { deep: true, immediate: false } // 深度监听，非立即触发
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
  // 组件卸载前清理逻辑（destroy-on-close 触发，释放编辑/预览组件实例）
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
.drawer-edit-langbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-fill-color-light, #f5f7fa);

  .drawer-edit-langbar__label {
    flex: none;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  .drawer-edit-langbar__select {
    flex: none;
    width: 180px;
  }

  .drawer-edit-langbar__badge {
    flex: none;
    padding: 1px 8px;
    color: var(--el-color-success);
    font-size: 12px;
    border: 1px solid var(--el-color-success-light-5, #b3e19d);
    border-radius: 999px;
  }

  .drawer-edit-langbar__tip {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.drawer-edit-steps {
  margin: 0 0 18px;

  .drawer-step-clickable {
    cursor: pointer;
  }
}

.step-pane {
  min-height: 360px;
}

.lang-others {
  margin-top: 8px;

  .lang-others-title {
    flex: none;
    min-width: 72px;
    margin-right: 8px;
  }

  :deep(.el-collapse-item__header) {
    gap: 8px;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 4px;
  }
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

<style lang="scss">
/* 抽屉整体头部（el-drawer 经 teleport 挂到 body，需非 scoped 配合唯一 class 命中） */
.drawer-edit-drawer {
  /* 标题栏：与步骤条留出呼吸间距并加分隔线，长标题单行省略不折行 */
  .el-drawer__header {
    margin-bottom: 0;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);

    .el-drawer__title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
  }

  /* 正文顶部与标题栏分隔线保持统一节奏 */
  .el-drawer__body {
    padding-top: 16px;
  }
}
</style>
