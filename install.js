/*** 
 * @Author: ${git_name}
 * @Date: 2025-07-17 18:10:13
 * @LastEditors: trexwb
 * @LastEditTime: 2025-09-29 00:00:00
 * @FilePath: /edtib/console/install.js
 * @Description: 安装后初始化脚本（迁移自老项目 web/install.js）
 * @一花一世界，一叶一如来
 * @Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
 */
const fs = require('fs');
const path = require('path');
// 定义源文件路径和目标文件路径
const sourcePath = path.resolve(__dirname, 'replace');

// 1. 兜底补齐环境文件（正常仓库内已直接提交 .env / .env.development / .env.production，此处仅作缺省保护）
// 迁移说明：老项目 web/install.js 引用的 replace/env_template、replace/env_production_template
// 在仓库中并不存在且失败即 process.exit(1)，会导致 npm install 直接失败。
// 这里改为「按 replace 目录实际存在的模板兜底 + 缺失只告警不中断」。
const envFallbacks = [
  { target: '.env', template: 'env.development' },
  { target: '.env.production', template: 'env.master_template' },
];
envFallbacks.forEach(({ target, template }) => {
  const targetPath = path.resolve(__dirname, target);
  if (fs.existsSync(targetPath)) return;
  const templatePath = path.resolve(sourcePath, template);
  try {
    fs.copyFileSync(templatePath, targetPath);
    console.log(`✅ 已复制 ${sourcePath}/${template} → ./${target}`);
  } catch (err) {
    console.warn(`⚠️ 跳过 ${target}：源文件不存在或复制失败（${err.code || err.message}），请手动确认该环境文件`);
  }
});

// 3. 复制 vitebar_index.js 到 node_modules/vite-plugin-vitebar/dist/index.js
try {
  fs.copyFileSync(path.resolve(sourcePath, 'vitebar_index.js'), path.resolve(__dirname, 'node_modules/vite-plugin-vitebar/dist/index.js'));
  console.log(`✅ 已复制 ${sourcePath}/vitebar_index.js → ./node_modules/vite-plugin-vitebar/dist/index.js`);
} catch (err) {
  console.warn(`⚠️ vitebar 补丁跳过（${err.code || err.message}），如未安装 vite-plugin-vitebar 可忽略`);
}
console.log('\n🎉 后台初始化流程已完成！');
