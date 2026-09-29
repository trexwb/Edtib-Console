/**
 * @description 格式化时间
 * @param time
 * @param cFormat
 * @returns {string|null}
 */
export function parseTime(time: any, cFormat: string) {
  if (arguments.length === 0) {
    return null
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if (typeof time === 'string' && /^[0-9]+$/.test(time)) {
      time = parseInt(time)
    }
    if (typeof time === 'number' && time.toString().length === 10) {
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj: any = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay(),
  }
  return format.replace(/{([ymdhisa])+}/g, (result, key) => {
    let value = formatObj[key]
    if (key === 'a') {
      return ['日', '一', '二', '三', '四', '五', '六'][value]
    }
    if (result.length > 0 && value < 10) {
      value = `0${value}`
    }
    return value || 0
  })
}

/**
 * @description 格式化时间
 * @param time
 * @param option
 * @returns {string}
 */
export function formatTime(time: any, option: any) {
  if (`${time}`.length === 10) {
    time = parseInt(time) * 1000
  } else {
    time = +time
  }
  const d: any = new Date(time)
  const now: number = Date.now()

  const diff = (now - d) / 1000

  if (diff < 30) {
    return '刚刚'
  } else if (diff < 3600) {
    return `${Math.ceil(diff / 60)}分钟前`
  } else if (diff < 3600 * 24) {
    return `${Math.ceil(diff / 3600)}小时前`
  } else if (diff < 3600 * 24 * 2) {
    return '1天前'
  }
  if (option) {
    return parseTime(time, option)
  } else {
    return `${d.getMonth() + 1}月${d.getDate()}日${d.getHours()}时${d.getMinutes()}分`
  }
}

/**
 * @description 将url请求参数转为json格式
 * @param url
 * @returns {{}|any}
 */
export function paramObj(url: string) {
  const search = url.split('?')[1]
  if (!search) {
    return {}
  }
  return JSON.parse(`{"${decodeURIComponent(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"').replace(/\+/g, ' ')}"}`)
}

/**
 * @description 父子关系的数组转换成树形结构数据
 * @param data
 * @returns {*}
 */
export function translateDataToTree(data: any[]) {
  const parent = data.filter((value) => value.parentId === 'undefined' || value.parentId === null)
  const children = data.filter((value) => value.parentId !== 'undefined' && value.parentId !== null)
  const translator = (parent: any[], children: any[]) => {
    parent.forEach((_parent: any) => {
      children.forEach((current: any, index: number) => {
        if (current.parentId === _parent.id) {
          const temp = JSON.parse(JSON.stringify(children))
          temp.splice(index, 1)
          translator([current], temp)
          typeof _parent.children !== 'undefined' ? _parent.children.push(current) : (_parent.children = [current])
        }
      })
    })
  }
  translator(parent, children)
  return parent
}

/**
 * @description 树形结构数据转换成父子关系的数组
 * @param data
 * @returns {[]}
 */
export function translateTreeToData(data: any) {
  const result: any[] = []
  data.forEach((item: any) => {
    const loop = (data: any) => {
      result.push({
        id: data.id,
        name: data.name,
        parentId: data.parentId,
      })
      const child = data.children
      if (child) {
        for (let i = 0; i < child.length; i++) {
          loop(child[i])
        }
      }
    }
    loop(item)
  })
  return result
}

/**
 * @description 10位时间戳转换
 * @param time
 * @returns {string}
 */
export function tenBitTimestamp(time: number) {
  const date = new Date(time * 1000)
  const y = date.getFullYear()
  let m: string | number = date.getMonth() + 1
  m = m < 10 ? `${m}` : m
  let d: string | number = date.getDate()
  d = d < 10 ? `${d}` : d
  let h: string | number = date.getHours()
  h = h < 10 ? `0${h}` : h
  let minute: string | number = date.getMinutes()
  let second: string | number = date.getSeconds()
  minute = minute < 10 ? `0${minute}` : minute
  second = second < 10 ? `0${second}` : second
  return `${y}年${m}月${d}日 ${h}:${minute}:${second}` //组合
}

/**
 * @description 13位时间戳转换
 * @param time
 * @returns {string}
 */
export function thirteenBitTimestamp(time: number) {
  const date = new Date(time)
  const y = date.getFullYear()
  let m: string | number = date.getMonth() + 1
  m = m < 10 ? `${m}` : m
  let d: string | number = date.getDate()
  d = d < 10 ? `${d}` : d
  let h: string | number = date.getHours()
  h = h < 10 ? `0${h}` : h
  let minute: string | number = date.getMinutes()
  let second: string | number = date.getSeconds()
  minute = minute < 10 ? `0${minute}` : minute
  second = second < 10 ? `0${second}` : second
  return `${y}年${m}月${d}日 ${h}:${minute}:${second}` //组合
}

/**
 * @description 获取随机id
 * @param length
 * @returns {string}
 */
export function uuid(length = 32) {
  const num = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += num.charAt(Math.floor(Math.random() * num.length))
  }
  return str
}

  /**
   * @desc 获取uuid
   */
  export function getUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      return (c === 'x' ? (Math.random() * 16 | 0) : ((Math.random() & 0x3) | 0x8)).toString(16)
    })
  }

/**
 * @description m到n的随机数
 * @param m
 * @param n
 * @returns {number}
 */
export function random(m: number, n: number) {
  return Math.floor(Math.random() * (m - n) + n)
}

/**
 * @description addEventListener
 * @type {function(...[*]=)}
 */
export const on = (function () {
  return function (element: any, event: any, handler: any, useCapture = false) {
    if (element && event && handler) {
      element.addEventListener(event, handler, useCapture)
    }
  }
})()

/**
 * @description removeEventListener
 * @type {function(...[*]=)}
 */
export const off = (function () {
  return function (element: any, event: any, handler: any, useCapture = false) {
    if (element && event) {
      element.removeEventListener(event, handler, useCapture)
    }
  }
})()

/**
 * @description 数组打乱
 * @param array
 * @returns {*}
 */
export function shuffle(array: any[]) {
  let m = array.length,
    t,
    i
  while (m) {
    i = Math.floor(Math.random() * m--)
    t = array[m]
    array[m] = array[i]
    array[i] = t
  }
  return array
}

export const isValidCronFormatFlexible = (rowTime: string) => {
  // 正则表达式匹配Cron格式，秒字段可选：[秒] 分 时 日 月 周
  // 秒（可选）：0-59 或 省略
  // 分钟：0-59
  // 小时：0-23
  // 日期：1-31
  // 月份：1-12
  // 星期：0-6（0和7都代表周日）
  // 使用非捕获组(?:...)和问号?来标记秒字段为可选
  const cronPatternWithSeconds = /^([0-5]?\d|\*|(?:\*\/[1-9][0-9]?))\s([0-5]?\d|\*|(?:\*\/[1-9][0-9]?))\s([01]?\d|2[0-3]|\*)\s([1-9]|1\d|2[0-9]|3[01]|\*)\s(1[0-2]|0?[1-9]|\*)\s([0-6]|\*)$/;
  const cronPatternWithoutSeconds = /^([0-5]?\d|\*|(?:\*\/[1-9][0-9]?))\s([01]?\d|2[0-3]|\*)\s([1-9]|1\d|2[0-9]|3[01]|\*)\s(1[0-2]|0?[1-9]|\*)\s([0-6]|\*)$/;
  return cronPatternWithSeconds.test(rowTime) || cronPatternWithoutSeconds.test(rowTime);
  // 秒字段（可选）：
  // (\*|([0-5]?\d|\*)\s)?：匹配0-59的数字或星号（*），并且是可选的（用?标记为可选）。同时，为了兼容*/10这样的格式，使用了\*。
  // 分钟字段：
  // ([0-5]?\d|\*)\s：匹配0-59的数字或星号（*）。
  // 小时字段：
  // ([01]?\d|2[0-3]|\*)\s：匹配0-23的数字或星号（*）。
  // 日期字段：
  // ([1-9]|1\d|2[0-9]|3[01]|\*)\s：匹配1-31的数字或星号（*）。
  // 月份字段：
  // (1[0-2]|0?[1-9]|\*)\s：匹配1-12的数字或星号（*），注意月份可以是1-9或01-09。
  // 星期字段：
  // ([0-6]|\*)：匹配0-6的数字或星号（*）。
}

// 美化打印实现方法
export const prettyLog = () => {
  const isEmpty = (value: any) => {
    return value == null || value === undefined || value === '';
  }
  const prettyPrint = (title: string, text: string, color: string) => {
    console.log(
      `%c ${title} %c ${text} %c`,
      `background:${color};border:1px solid ${color}; padding: 1px; border-radius: 2px 0 0 2px; color: #fff;`,
      `border:1px solid ${color}; padding: 1px; border-radius: 0 2px 2px 0; color: ${color};`,
      'background:transparent'
    );
  }
  const info = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Info' : textOrTitle;
    const text = isEmpty(content) ? textOrTitle : content;
    prettyPrint(title, text, '#909399');
  }
  const error = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Error' : textOrTitle;
    const text = isEmpty(content) ? textOrTitle : content;
    prettyPrint(title, text, '#F56C6C');
  }
  const warning = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Warning' : textOrTitle;
    const text = isEmpty(content) ? textOrTitle : content;
    prettyPrint(title, text, '#E6A23C');
  }
  const success = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Success ' : textOrTitle;
    const text = isEmpty(content) ? textOrTitle : content;
    prettyPrint(title, text, '#67C23A');
  }
  const table = (data: object) => {
    if (isEmpty(data)) {
      error('error', 'No data');
    }
    console.table(Array.isArray(data) ? data : [data])
  }
  const picture = (url: string, scale = 1) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (ctx) {
        c.width = img.width;
        c.height = img.height;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        const dataUri = c.toDataURL('image/png');

        console.log(
          `%c sup?`,
          `font-size: 1px;
          padding: ${Math.floor((img.height * scale) / 2)}px ${Math.floor((img.width * scale) / 2)}px;
          background-image: url(${dataUri});
          background-repeat: no-repeat;
          background-size: ${img.width * scale}px ${img.height * scale}px;
          color: transparent;`
        );
      }
    }
    img.src = url;
  }

  // return;
  return {
    info,
    error,
    warning,
    success,
    picture,
    table
  }
}
// 创建打印对象

export const log = prettyLog()

// log.info('奥德彪', '我并非无路可走 我还有死路一条! ');
// log.error('奥德彪', '钱没了可以再赚，良心没了便可以赚的更多。 ');
// log.warning('奥德彪', '前方的路看似很危险,实际一点也不安全。 ');
// log.success('奥德彪', '出来的时候穷 生活总是让我穷 所以现在还是穷。');
// log.picture('https://nimg.ws.126.net/?url=http%3A%2F%2Fdingyue.ws.126.net%2F2024%2F0514%2Fd0ea93ebj00sdgx56001xd200u000gtg00hz00a2.jpg&thumbnail=660x2147483647&quality=80&type=jpg');
// log.table(objec);