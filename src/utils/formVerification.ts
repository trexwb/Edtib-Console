import * as _ from "lodash-es";
/**
 * 递归地平铺和过滤对象或数组中的元素
 * @param obj 要处理的对象或数组
 * @param excludeKeys 一组要排除的键名
 * @returns 一个包含所有真值的数组
 */
export function flattenAndFilter(obj: any, excludeKeys: string[] = []) {
  let result: any[] = [];

  // 递归函数，用于遍历和处理对象或数组
  function traverse(current: any) {
    if (Array.isArray(current)) {
      // 如果当前项是数组，遍历数组中的每个元素
      current.forEach(item => traverse(item));
    } else if (typeof current === 'object' && current !== null) {
      // 如果当前项是对象，遍历对象的每个属性
      for (let key in current) {
        if (current.hasOwnProperty(key) && !excludeKeys.includes(key)) {
          traverse(current[key]);
        }
      }
    } else {
      // 如果当前项是基本类型，检查是否为真值
      if (current) {
        result.push(current);
      }
    }
  }

  traverse(obj);
  return result;
}

/**
 * 递归地从对象或数组中移除指定的键
 * @param obj 要处理的对象或数组
 * @param keysToRemove 一组要移除的键名
 * @returns 移除指定键后的对象或数组
 */
export function removeKeys(obj: any, keysToRemove: string[] = []): any {
  if (Array.isArray(obj)) {
    // 如果是数组，对每个元素递归调用removeKeys
    return obj.map(item => removeKeys(item, keysToRemove));
  } else if (typeof obj === 'object' && obj !== null) {
    // 如果是对象，遍历每个属性并递归调用removeKeys
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && !keysToRemove.includes(key)) {
        result[key] = removeKeys(obj[key], keysToRemove);
      }
    }
    return result;
  }
  // 如果不是对象或数组，直接返回
  return obj;
}

/**
 * 检查对象是否所有键都有非空值
 * 此函数递归检查对象（包括嵌套对象）中的每个键是否有非空值
 * 如果发现任何一个键的值为 null、undefined 或空字符串（包括只含空白字符的字符串），则返回 false
 * 否则，如果所有键都有非空值，则返回 true
 * 
 * @param obj 待检查的对象
 * @returns 如果所有键都有非空值则返回 true，否则返回 false
 */
export function hasAnyKeyWithValue(obj: any) {
  // 检查传入的是不是对象
  if (typeof obj !== 'object' || obj === null) {
    return false; // 如果不是对象或者为空，则返回false
  }
  // 遍历对象的所有键
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) { // 确保是对象自身的属性
      let value = obj[key];
      // 如果值是对象或数组，则递归调用本函数
      if (typeof value === 'object' && value !== null) {
        if (hasAnyKeyWithValue(value)) {
          return true; // 如果子对象中有值，则立即返回true
        }
      } else if (
        value !== undefined &&
        value !== null &&
        !(typeof value === 'string' && value.trim() === '') &&
        value !== 0
      ) {
        // 如果值不是undefined, null, 也不是空字符串（包括只有空白字符的情况），也不是0，则返回true
        return true;
      }
    }
  }

  // 如果所有键都没有值，则返回false
  return false;
}

/**
 * 比较两个对象或数组是否相等，可选择性地忽略一些键
 * @param obj1 第一个对象或数组
 * @param obj2 第二个对象或数组
 * @param keysToRemove 一组要忽略的键名
 * @returns 如果两个对象或数组在忽略指定键后相等，则返回true，否则返回false
 */
export function compareObjects(obj1: any, obj2: any, keysToRemove: string[] = []) {
  // 从两个对象中移除指定的键
  const cleanedObj1 = removeKeys(obj1, keysToRemove);
  const cleanedObj2 = removeKeys(obj2, keysToRemove);

  // 打印处理后的对象用于调试
  // console.log(JSON.stringify(cleanedObj1), '===' , JSON.stringify(cleanedObj2))

  // 比较两个处理后的对象是否相等
  return areObjectsDifferent(cleanedObj1, cleanedObj2);
}

export function areObjectsDifferent(obj1: any, obj2: any) {
  // 使用 JSON.stringify 进行深度比较
  return _.isEqual(obj1, obj2)
  // return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export function checkTwoObjectsDifferent(fromData: any, sourceForm: any, editForm: any, keysToRemove: string[] = []) {
  const cleanedObj1 = removeKeys(fromData, keysToRemove);
  const cleanedObj2 = removeKeys(sourceForm, keysToRemove);
  const cleanedObj3 = removeKeys(editForm, keysToRemove);
  // 比较三个对象之间的差异
  const isFromDataAndSourceFormDifferent = !areObjectsDifferent(cleanedObj1, cleanedObj2);
  const isFromDataAndEditFormDifferent = !areObjectsDifferent(cleanedObj1, cleanedObj3);
  const isSourceFormAndEditFormDifferent = !areObjectsDifferent(cleanedObj2, cleanedObj3);

  // 只要任意两组对象不同，就返回 true
  return (
    (isFromDataAndSourceFormDifferent && isFromDataAndEditFormDifferent) ||
    (isFromDataAndSourceFormDifferent && isSourceFormAndEditFormDifferent) ||
    (isFromDataAndEditFormDifferent && isSourceFormAndEditFormDifferent)
  );
}