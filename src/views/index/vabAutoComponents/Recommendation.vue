<!--
 * @Author: trexwb
 * @Date: 2024-11-08 13:40:10
 * @LastEditors: trexwb
 * @LastEditTime: 2025-03-26 16:59:05
 * @FilePath: /client/console/src/views/index/vabAutoComponents/Recommendation.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <vab-card>
    <template #header>
      <vab-icon icon="reserved-line" />
      {{ translate('快捷菜单') }}
    </template>

    <el-row :gutter="20">
      <el-col v-for="(item, index) in iconList" :key="index" :lg="6" :md="8" :sm="8" :xl="6" :xs="24">
        <vab-link :to="item.link">
          <vab-card class="icon-panel">
            <el-badge class="item" :value="item.value">
              <vab-icon :icon="item.icon" />
            </el-badge>
            <div class="icon-panel-title">
              {{ item.title }}
              <div class="icon-panel-tips">{{ item.tips }}</div>
            </div>
          </vab-card>
        </vab-link>
      </el-col>
    </el-row>
  </vab-card>

</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'

const aclStore = useAclStore()
const { role } = storeToRefs(aclStore)

interface RoleItem {
  icon: string;
  title: string;
  tips: string;
  link: string;
  value: string;
}

const roleList: any = {
  standardsProducts: {
    icon: 'compass-4-fill',
    title: translate('正式标准库'),
    tips: translate('正式发布的产品标准库'),
    link: '/standards/products/publish',
    value: ''
  },
  standardsProductsTemp: {
    icon: 'contrast-2-fill',
    title: translate('临时标准库'),
    tips: translate('我维护的产品标准信息，需要等待审核才能正式发布'),
    link: '/standards/products/temp',
    value: ''
  },
  standardsProductsReview: {
    icon: 'copper-diamond-fill',
    title: translate('待校对标准'),
    tips: translate('待审核的产品标准信息'),
    link: '/standards/products/review',
    value: ''
  },
  standardsStandards: {
    icon: 'star-s-fill',
    title: translate('标准分类'),
    tips: translate('以国家或者行业为标准的分类'),
    link: '/standards/products/standards',
    value: ''
  },
  standardsShapes: {
    icon: 'shapes-fill',
    title: translate('形状分类'),
    tips: translate('产品按形状进行分类'),
    link: '/standards/products/shapes',
    value: ''
  },
  standardsCategories: {
    icon: 'product-hunt-fill',
    title: translate('产品分类'),
    tips: translate('产品标准的大分类'),
    link: '/standards/products/categories',
    value: ''
  },
  standardsDocs: {
    icon: 'upload-cloud-fill',
    title: translate('文档管理'),
    tips: translate('上传的文档管理'),
    link: '/wikis/docs/file',
    value: ''
  },
  standardsInterpretations: {
    icon: 'book-read-fill',
    title: translate('标准解读'),
    tips: translate('产品标准的解读文章'),
    link: '/wikis/docs/interpretations',
    value: ''
  }
}

const iconList: RoleItem[] = []
const roles = unref(role)
if (roles) {
  roles.forEach((item: string) => {
    if (roleList[item]) {
      iconList.push(roleList[item])
    }
  })
}
</script>

<style lang="scss" scoped>
.icon-panel {
  margin-bottom: 8px;
  cursor: pointer;
  border: 0 !important;

  :deep() {
    .el-card__body {
      height: 65px;
      padding: 10px;

      &:hover {
        i {
          color: var(--el-color-white);
          background: var(--el-color-primary);
        }
      }

      i {
        display: inline-block;
        width: 50px;
        height: 50px;
        font-size: 30px;
        line-height: 50px;
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
        border-radius: var(--el-border-radius-base);
        transition: all ease-in-out 0.3s;
      }

      .icon-panel-title {
        display: inline-block;
        padding-top: 10px;
        margin-left: 10px;
        vertical-align: -10px;

        .icon-panel-tips {
          margin-top: 5px;
          font-size: var(--el-font-size-small);
          color: var(--el-color-grey);
        }
      }
    }
  }
}
</style>
