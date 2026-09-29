/*** 
 * @Author: trexwb
 * @Date: 2025-03-31 14:41:57
 * @LastEditors: trexwb
 * @LastEditTime: 2025-03-31 14:41:59
 * @FilePath: /client/console/src/utils/parseExcelToJSON.js
 * @Description: 
 * @一花一世界，一叶一如来
 * @Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
 */

import { translate } from '/@/i18n'

// 全角转半角
function toHalfWidth(str: string) {
  return str.replace(/[\uff10-\uff5e]/g, function (char) {
    return String.fromCharCode(char.charCodeAt(0) - 65248);
  }).replace(/\u3000/g, ' '); // 全角空格转换为半角空格
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
      if (Number(a) && Number(b)) {
        return Number(a) - Number(b); // 按数值排序
      }
    }

    // 3. 其他情况（数字开头或其他符号开头），按字典序排序
    return a.localeCompare(b);
  });
}

export const splitCamelCase = (str: string) => {
  // 匹配两种情况：
  // 1. 小写字母或数字后跟大写字母（常规驼峰情况）
  // 2. 多个大写字母后跟一个大写字母和后续小写字母（如 "HPMin"）
  // return str.replace(/([a-z0-9])([A-Z])|([A-Z]+)([A-Z][a-z])/g, '$1$3 $2$4').split(' ');
  return str.replace(/([\p{L}]+)([A-Z][a-z])|([\p{L}\d]+)([A-Z])/gu, '$1$3 $2$4').split(' ');
  // \p{Ll}：匹配所有小写字母（包括非 ASCII 字母，如 α）。
  // \p{Nd}：匹配所有数字字符（包括非 ASCII 数字）。
  // [\p{Ll}\p{Nd}] +：匹配连续的小写字母或数字。
  /**
   * 第一部分：([\p{L}]+)([A-Z][a-z])
   * ([\p{L}]+)：这是第一个捕获组 $1，用于匹配非 ASCII 字符、小写字母或字母序列（如 εA）。
   * ([A-Z][a-z])：这是第二个捕获组 $2，用于匹配一个大写字母后跟一个小写字母（如 Min 中的 M 和 i）。
   * 第二部分：([\p{L}\d]+)([A-Z])
   * ([\p{L}\d]+)：这是第三个捕获组 $3，用于匹配非 ASCII 字符、小写字母或数字序列（如 ε1）。
   * ([A-Z])：这是第四个捕获组 $4，用于匹配单独的一个大写字母（如 A）。
   */
}
export const toCamelCase = (arr: string[]) => {
  return arr.map((word, index) => {
    // 对于第一个单词，全部小写；对于后续单词，首字母大写，其余小写
    if (index === 0) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join('');
}

export const parametersJons = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return {};

  // 解析表头
  const headers = lines[0].split('\t'); // mon	公称	等级	条件
  if (headers.length < 4) throw new Error(`${translate('Excel格式错误：必须包含')}[mon	公称	等级	条件]列`);
  const monColumns = headers.filter((item, index) => index > 3); // 过滤出数据项
  const monColumnsIndex = monColumns.reduce((acc: any, arg: any, index: any) => {
    acc[arg] = index + 4
    return acc;
  }, {});
  // 初始化结果容器
  const result: any = {};
  Object.keys(monColumnsIndex).forEach((key: any) => {
    result[key] = {};
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
        // 计算匹配到的制表符数量
        const count = match.length;
        if (count > 1) {
          // 如果有两个或更多的制表符，则用 "\t-\t" 替换每个额外的制表符对
          // 注意：如果原始字符串中有奇数个连续的制表符，最后一个将保持不变
          return '\t' + '-\t'.repeat(count - 1);
        } else {
          // 如果只有一个制表符，直接返回
          return match;
        }
      }).split('\t').filter(Boolean);
      const key0 = (parts[0] || '').trim().replace(/-/g, '');
      const key1 = (parts[1] || '').trim().replace(/-/g, '');
      let keyName = '';
      if (key1 === '') {
        keyName = key0;
      } else {
        keyName = `${key0}${key1.charAt(0).toUpperCase() + key1.slice(1)}`;
      }
      if (!result[key][keyName]) result[key][keyName] = {};
      const key2 = parts[2].trim().replace(/-/g, '');
      const key3 = parts[3].trim().replace(/-/g, '');
      // 获取对应的值
      let value = (parts[monColumnsIndex[key]] || '').trim().replace(/-/g, '');
      if (value === '-' || value === '/') value = '';
      if (key2 !== '' && key3 !== '') {
        result[key][keyName]['condition'] = key3.replace(/./g, (char) => toHalfWidth(char));
        result[key][keyName][key2] = result[key][keyName][key2] && !value ? result[key][keyName][key2] : value;
      } else if (key2 === '' && key3 !== '') {
        result[key][keyName][key3] = result[key][keyName][key3] && !value ? result[key][keyName][key3] : value;
      } else if (key2 !== '') {
        result[key][keyName][key2] = result[key][keyName][key2] && !value ? result[key][keyName][key2] : value;
      } else {
        result[key][keyName] = result[key][keyName] && !value ? result[key][keyName] : value;
      }
    }
  });
  // console.log(JSON.stringify(result))
  return result;
};

export const lengthJson = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return {};

  // 解析表头
  const headers = lines[0].split('\t'); // mon	公称	等级	条件
  if (headers.length < 1) throw new Error(`${translate('Excel格式错误：必须包含')}[L]列`);
  const monColumns = headers.filter((item, index) => index > 0); // 过滤出数据项
  const monColumnsIndex = monColumns.reduce((acc: any, arg: any, index: any) => {
    acc[arg] = index + 1
    return acc;
  }, {});
  // 初始化结果容器
  const result: any = {};
  Object.keys(monColumnsIndex).forEach(key => {
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
        // 计算匹配到的制表符数量
        const count = match.length;
        if (count > 1) {
          // 如果有两个或更多的制表符，则用 "\t-\t" 替换每个额外的制表符对
          // 注意：如果原始字符串中有奇数个连续的制表符，最后一个将保持不变
          return '\t' + '-\t'.repeat(count - 1);
        } else {
          // 如果只有一个制表符，直接返回
          return match;
        }
      }).split('\t').filter(Boolean);
      const key0 = (parts[0] || '').trim().replace(/-/g, '');
      let value = (parts[monColumnsIndex[key]] || '').trim().replace(/-/g, '');
      if (value === '-' || value === '/') value = '';
      if (!!value) {
        if (!result[key]) result[key] = [];
        result[key].push(key0);
      }
    }
  });
  // console.log(JSON.stringify(result))
  return result;
};

export const drawingJson = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return {};

  // 解析表头
  const headers = lines[0].split('\t'); // mon	公称	等级	条件
  if (headers.length < 1) throw new Error(`${translate('Excel格式错误：必须包含')}[条件]列`);
  const monColumns = headers.filter((item, index) => index > 0); // 过滤出数据项
  const monColumnsIndex = monColumns.reduce((acc: any, arg: any, index: any) => {
    acc[arg] = index + 1
    return acc;
  }, {});
  // 初始化结果容器
  const result: any = {};
  Object.keys(monColumnsIndex).forEach(key => {
    for (let i = 1; i < 2; i++) {
      const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
        // 计算匹配到的制表符数量
        const count = match.length;
        if (count > 1) {
          // 如果有两个或更多的制表符，则用 "\t-\t" 替换每个额外的制表符对
          // 注意：如果原始字符串中有奇数个连续的制表符，最后一个将保持不变
          return '\t' + '-\t'.repeat(count - 1);
        } else {
          // 如果只有一个制表符，直接返回
          return match;
        }
      }).split('\t').filter(Boolean);
      const key0 = (parts[0] || '').trim().replace(/-/g, '');
      let value = (parts[monColumnsIndex[key]] || '').trim().replace(/./g, (char) => toHalfWidth(char));
      if (value === '-' || value === '/') value = '';
      if (!!value) {
        if (!result[key]) result[key] = {};
        result[key][key0.toUpperCase()] = value;
      }
    }
  });
  // console.log(JSON.stringify(result))
  return result;
};

export const toleranceJson = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  const result: any = {};
  const conditions = lines[0].replace('条件', '').replace(/ /g, '-').replace(/(\t+)/g, match => {
    // 计算匹配到的制表符数量
    const count = match.length;
    if (count > 1) {
      return '\t';
    } else {
      return match;
    }
  }).split('\t').filter(Boolean);
  if ((conditions.includes('A') && conditions.includes('B')) || conditions.includes('C')) {
    if (conditions.includes('C')) {
      for (let i = 2; i < lines.length; i++) {
        const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
          // 计算匹配到的制表符数量
          const count = match.length;
          if (count > 1) {
            return '\t' + '-\t'.repeat(count - 1);
          } else {
            return match;
          }
        }).split('\t').filter(Boolean);
        // console.log('parts:', parts)
        const [greaterThan, to, cMin, cMax] = parts;
        // 生成条件键名
        const condition = `${greaterThan}<L${Number(to) > 0 ? `&L≤${to}` : ''}`;
        // 处理C级的空值（/）
        const cMinValue = cMin.replace('/', '-') === '-' ? 0 : cMin;
        const cMaxValue = cMax.replace('/', '-') === '-' ? 0 : cMax;
        // 添加到结果对象
        result[condition] = {
          C: { min: cMinValue, max: cMaxValue }
        };
      }
    } else {
      for (let i = 2; i < lines.length; i++) {
        const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
          // 计算匹配到的制表符数量
          const count = match.length;
          if (count > 1) {
            return '\t' + '-\t'.repeat(count - 1);
          } else {
            return match;
          }
        }).split('\t').filter(Boolean);
        // console.log('parts:', parts)
        const [greaterThan, to, aMin, aMax, bMin, bMax] = parts;
        // 生成条件键名
        const condition = `${greaterThan}<L${Number(to) > 0 ? `&L≤${to}` : ''}`;
        // 处理C级的空值（/）
        const aMinValue = aMin.replace('/', '-') === '-' ? 0 : aMin;
        const aMaxValue = aMax.replace('/', '-') === '-' ? 0 : aMax;
        const bMinValue = bMin.replace('/', '-') === '-' ? 0 : bMin;
        const bMaxValue = bMax.replace('/', '-') === '-' ? 0 : bMax;

        // 添加到结果对象
        result[condition] = {};
        if (aMinValue || aMaxValue) {
          result[condition]['A'] = { min: aMinValue, max: aMaxValue };
        }
        if (bMinValue || bMaxValue) {
          result[condition]['B'] = { min: bMinValue, max: bMaxValue };
        }
        // result[condition] = {
        //   A: { min: aMinValue, max: aMaxValue },
        //   B: { min: bMinValue, max: bMaxValue }
        // };
      }
    }
  } else {
    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
        // 计算匹配到的制表符数量
        const count = match.length;
        if (count > 1) {
          return '\t' + '-\t'.repeat(count - 1);
        } else {
          return match;
        }
      }).split('\t').filter(Boolean);
      // console.log('parts:', parts)
      const [greaterThan, to] = parts;
      // 生成条件键名
      const condition = `${greaterThan}<L${Number(to) > 0 ? `&L≤${to}` : ''}`;
      result[condition] = {};
      let startNode = 2;
      for (let j = 0; j < conditions.length; j++) {
        const matchMin = parts[startNode] === '/' ? 0 : parts[startNode];
        const matchMax = parts[startNode + 1] === '/' ? 0 : parts[startNode + 1];
        result[condition][conditions[j]] = { min: matchMin, max: matchMax };
        startNode = startNode + 2;
      }
    }
  }
  // 更新响应式数据
  // console.log(JSON.stringify(result, null, 2))
  return result;
};

export const parametersToTable = (tableData: any, editForm: any) => {
  // tableData.column = Object.keys(editForm.parameters || {});
  /**
   * 第一阶段处理：构建参数列映射关系
   * 处理editForm.parameters中的d属性，生成带排序索引的列映射
   * 对有d属性的参数进行分组计数，生成带序号的列键
   */
  const result = {} as any;
  const i = {} as any;
  // 此处主要是为了让d属性作为排序显示，但是d有可能有重复，所以d相同的数据使用d的值+1进行推移作为索引
  for (const [key, value] of Object.entries<{ d?: any }>(editForm.parameters || {})) {
    if (value.d) {
      i[value.d] = Number(i[value.d] || 0) + 1
      if (result[value.d]) {
        result[`${value.d}+${i[value.d]}`] = key;
      } else {
        result[Number(value.d)] = key;
      }
    } else {
      result[key] = key;
    }
  }
  /**
   * 第二阶段处理：生成表格列定义
   * 使用customSort对列键进行排序，并映射到原始参数键
   * 清空tableData.list准备填充数据
   */
  const keysSort = customSort(Object.keys(result || {}));
  tableData.column = keysSort.map((item: any) => result[item]);
  // console.log('tableData.column:', JSON.stringify(tableData.column), JSON.stringify(result))
  tableData.list = [];
  // {"M6":{"d":"6","P":"1|1.25","bMin":{"L≤125":"18","125＜L≤200":"24","L＞200":"37"},...
  /**
   * 第三阶段处理：解析行数据
   * 遍历所有行数据，处理不同数据结构格式，生成统一的数据列表
   * 支持三种数据格式：
   * 1. 带condition和A/B值的对象（如eMin）
   * 2. 带条件值的对象（如bMin）
   * 3. 简单键值对
   */
  const rows = editForm.parameters[tableData.column[0]] || {};
  Object.keys(rows).forEach((row) => {
    const mon = typeof row === 'string' ? splitCamelCase(row) : [row, false];
    const data: any = {
      mon: mon[0] ? mon[0] : row,
      nominal: mon[1] ? mon[1] : '',
      leve: '',
      condition: '',
      values: {}
    }
    // "bMin":{"L≤125":"18","125＜L≤200":"24","L＞200":"37"}
    // "eMin":{"condition":"(d≤16&-L≤150)-|-L≤10-*-d","A":"11.05","B":"10.89"}
    // console.log('rows[row]:', typeof rows[row], rows.hasOwnProperty(row), rows[row])
    if (rows.hasOwnProperty(row) && typeof rows[row] === "object" && rows[row] !== null && !Array.isArray(rows[row])) {
      if (rows[row]["condition"]) {
        // "eMin":{"condition":"(d≤16&-L≤150)-|-L≤10-*-d","A":"11.05","B":"10.89"}
        if (rows[row]["A"] || rows[row]["A"] == '') {
          const newDataA = { ...data, leve: "A", condition: rows[row]["condition"] };
          const haveListA = tableData.list.some((l: any) => {
            return (
              l.mon === newDataA.mon &&
              l.nominal === newDataA.nominal &&
              l.leve === newDataA.leve &&
              l.condition === newDataA.condition
            );
          });
          if (!haveListA) {
            tableData.column.forEach((col: string) => {
              const colValue = editForm.parameters[col][row];
              newDataA.values[col] = typeof colValue === "object" ? (colValue["A"] || '') : (colValue || '');
            });
            tableData.list.push(JSON.parse(JSON.stringify(newDataA)));
          }
        }
        if (rows[row]["B"] || rows[row]["B"] == '') {
          const newDataB = { ...data, leve: "B" };
          const haveListB = tableData.list.some((l: any) => {
            return (
              l.mon === newDataB.mon &&
              l.nominal === newDataB.nominal &&
              l.leve === newDataB.leve &&
              l.condition === newDataB.condition
            );
          });
          if (!haveListB) {
            tableData.column.forEach((col: string) => {
              const colValue = editForm.parameters[col][row];
              newDataB.values[col] = typeof colValue === "object" ? (colValue["B"] || '') : (colValue || '');
            });
            tableData.list.push(JSON.parse(JSON.stringify(newDataB)));
          }
        }
      } else {
        // "bMin": { "L≤125": "18", "125＜L≤200": "24", "L＞200": "37" }
        Object.keys(rows[row]).forEach((key) => {
          const newDataC = { ...data, condition: key };
          const haveListC = tableData.list.some((l: any) => {
            return (
              l.mon === newDataC.mon &&
              l.nominal === newDataC.nominal &&
              l.leve === newDataC.leve &&
              l.condition === newDataC.condition
            );
          });
          if (!haveListC) {
            tableData.column.forEach((col: string) => {
              const colValue = editForm.parameters[col][row];
              newDataC.values[col] = typeof colValue === "object" ? (colValue[key] || '') : (colValue || '');
            });
            tableData.list.push(JSON.parse(JSON.stringify(newDataC)));
          }
        })
      }
    } else {
      const newData = { ...data, condition: '' };
      const haveList = tableData.list.some((l: any) => {
        return (
          l.mon === newData.mon &&
          l.nominal === newData.nominal &&
          l.leve === newData.leve &&
          l.condition === newData.condition
        );
      });
      if (!haveList) {
        tableData.column.forEach((col: string) => {
          const colValue = editForm.parameters[col][row];
          newData.values[col] = colValue || '';
        })
        tableData.list.push(JSON.parse(JSON.stringify(newData)));
      }
    }
  })
  return tableData;
}

export const lengthToTable = (tableData: any, editForm: any) => {
  // console.log(JSON.stringify(editForm.diameter_length))
  // {"M6":["1"],"M8":["2"],"M10":["2"],"M14":["6"],"M16":["6"],"M20":["12"],"M22":["27.5"],"M27":["27.5"],"M36":["27.5"],"#6":["6"],"#8":["12"]}
  // tableData.column = Object.keys(editForm.parameters || {});
  if (Object.keys(editForm.parameters || {}).length > 0) {
    const result = {} as any;
    for (const [key, value] of Object.entries<{ d?: any }>(editForm.parameters || {})) {
      if (value.d) {
        result[value.d] = key;
      } else {
        result[key] = key;
      }
    }
    const keysSort = customSort(Object.keys(result || {}));
    tableData.column = keysSort.map((item: any) => result[item]);
  } else {
    tableData.column = customSort(Object.keys(editForm.diameter_length || {}));
  }
  const lArr = Array.from(
    new Set( // 使用 Set 去重
      Object.values(editForm.diameter_length) // 获取对象的所有值（数组）
        .flat() // 将二维数组展平为一维数组
        .map(Number) // 将字符串转换为数字
    )
  ).sort((a, b) => a - b); // 按升序排序（可选）
  tableData.list = [];
  lArr.forEach((l) => {
    const data: any = {
      L: l,
      values: {}
    }
    tableData.column.forEach((col: string) => {
      data.values[col] = editForm.diameter_length[col];
    })
    tableData.list.push(JSON.parse(JSON.stringify(data)));
  })
}

export const drawingLimitTable = (tableData: any, editForm: any) => {
  // console.log(JSON.stringify(editForm.drawing_limit))
  // {"M6":{"3d":"L<30","cad":"L<30","svg":"L<30"},"M8":{"3d":"d<40","cad":"d<40","svg":"d<40"}}
  if (Object.keys(editForm.parameters || {}).length > 0) {
    const result = {} as any;
    for (const [key, value] of Object.entries<{ d?: any }>(editForm.parameters || {})) {
      if (value.d) {
        result[value.d] = key;
      } else {
        result[key] = key;
      }
    }
    const keysSort = customSort(Object.keys(result || {}));
    tableData.column = keysSort.map((item: any) => result[item]);
  } else {
    tableData.column = customSort(Object.keys(editForm.drawing_limit || {}));
  }
  tableData.list = [];
  const line = ['IMG'];
  if (tableData.column.length > 0) {
    line.forEach((item: string) => {
      const data: any = {
        condition: item,
        values: editForm.drawing_limit[item]
      };
      tableData.list.push(JSON.parse(JSON.stringify(data)));
    })
  }
}

export const toleranceTable = (tableData: any, editForm: any) => {
  // console.log(JSON.stringify(editForm.tolerance))
  // {"0<L&L≤3":{"A":{"min":"-0.2","max":"+0.2"},"B":{"min":"-0.5","max":"+0.5"},"X":{"min":0,"max":0}},"3<L&L≤6":{"A":{"min":"-0.24","max":"+0.24"},"B":{"min":"-0.6","max":"+0.6"},"X":{"min":0,"max":0}},...}
  tableData.column = ['条件'];
  Object.keys(editForm.tolerance[Object.keys(editForm.tolerance)[0]] || {}).forEach((key) => {
    tableData.column.push(key);
  });
  tableData.list = [];
  Object.keys(editForm.tolerance || {}).forEach((key) => {
    const condition = key.includes("<L&L≤") ? key.split("<L&L≤") : key.split("<L");
    const newItem = {
      '条件': {
        '大于': condition[0] || 0,
        '至': condition[1] || 0,
      },
    } as any;
    Object.keys(editForm.tolerance[key] || {}).forEach((key2) => {
      newItem[key2] = {
        'min': editForm.tolerance[key][key2]?.['min'],
        'max': editForm.tolerance[key][key2]?.['max'],
      };
    })
    tableData.list.push(newItem);
  })
}

export const toleranceStandardJson = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  const headers = ["form", "to", "IT1", "IT2", "IT3", "IT4", "IT5", "IT6", "IT7", "IT8", "IT9", "IT10", "IT11", "IT12", "IT13", "IT14", "IT15", "IT16", "IT17", "IT18"];
  const result: any = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
      // 计算匹配到的制表符数量
      const count = match.length;
      if (count > 1) {
        return '\t' + '-\t'.repeat(count - 1);
      } else {
        return match;
      }
    }).split('\t').filter(Boolean);
    const [form, to, IT1, IT2, IT3, IT4, IT5, IT6, IT7, IT8, IT9, IT10, IT11, IT12, IT13, IT14, IT15, IT16, IT17, IT18] = parts;
    // 生成条件键名
    const condition = `${form}<{x}&{x}≤${to}`;
    parts.map((item: string, index: number) => {
      if (index > 1) {
        let value = item.trim();
        if (value === '-' || value === '/') value = '';
        if (!result[condition]) result[condition] = {};
        result[condition][headers[index]] = value;
      }
    });
  }
  // 更新响应式数据
  // console.log(JSON.stringify(result, null, 2))
  return result;
};

export const toleranceAxisJson = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  const headers = ["form", "to", "a", "b", "c", "cd", "d", "e", "ef", "f", "fg", "g", "h", "m", "n", "p", "r", "s", "t", "u", "v", "x", "y", "z"];
  const result: any = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
      // 计算匹配到的制表符数量
      const count = match.length;
      if (count > 1) {
        return '\t' + '-\t'.repeat(count - 1);
      } else {
        return match;
      }
    }).split('\t').filter(Boolean);
    const [form, to, a, b, c, cd, d, e, ef, f, fg, g, h, m, n, p, r, s, t, u, v, x, y, z] = parts;
    // 生成条件键名
    const condition = `${form}<{x}&{x}≤${to}`;
    parts.map((item: string, index: number) => {
      if (index > 1) {
        let value = item.trim();
        if (value === '-' || value === '/') value = '';
        if (value != '') {
          if (!result[condition]) result[condition] = {};
          result[condition][headers[index]] = value;
        }
      }
    });
    result[condition]['js'] = "±ITn/2";
  }
  // 更新响应式数据
  // console.log(JSON.stringify(result, null, 2))
  return result;
};

export const toleranceHoleJson = (excelData: string) => {
  const lines = excelData.split('\n').filter(line => line.trim());
  const headers = ["form", "to", "A", "B", "C", "CD", "D", "E", "EF", "F", "FG", "G", "H", "P", "R", "S", "T", "U", "V", "X", "Y", "Z"];
  const result: any = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].replace(/ /g, '-').replace(/(\t+)/g, match => {
      // 计算匹配到的制表符数量
      const count = match.length;
      if (count > 1) {
        return '\t' + '-\t'.repeat(count - 1);
      } else {
        return match;
      }
    }).split('\t').filter(Boolean);
    const [form, to, A, B, C, CD, D, E, EF, F, FG, G, H, P, R, S, T, U, V, X, Y, Z] = parts;
    // 生成条件键名
    const condition = `${form}<{x}&{x}≤${to}`;
    parts.map((item: string, index: number) => {
      if (index > 1) {
        let value = item.trim();
        if (value === '-' || value === '/') value = '';
        if (value != '') {
          if (!result[condition]) result[condition] = {};
          result[condition][headers[index]] = value;
        }
      }
    });
    result[condition]['js'] = "±ITn/2";
  }
  // 更新响应式数据
  // console.log(JSON.stringify(result, null, 2))
  return result;
};

/**
 * 产品字段归一化
 * @description 后端序列化输出 camelCase（diameterLength/drawingLimit），
 *              前端内部统一使用 snake_case（diameter_length/drawing_limit）。
 *              幂等映射：仅当 snake_case 缺失且 camelCase 存在时才写入，避免覆盖已有数据。
 * @param data 接口返回的产品详情数据
 * @returns 归一化后的数据（原地修改并返回）
 */
export const normalizeProductFields = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  if (data.diameterLength !== undefined && data.diameter_length === undefined) {
    data.diameter_length = data.diameterLength;
  }
  if (data.drawingLimit !== undefined && data.drawing_limit === undefined) {
    data.drawing_limit = data.drawingLimit;
  }
  // 免费可见标记：后端 Model 出口为 camel freeTier，编辑表单按 snake free_tier 绑定
  if (data.freeTier !== undefined && data.free_tier === undefined) {
    data.free_tier = data.freeTier;
  }
  return data;
};