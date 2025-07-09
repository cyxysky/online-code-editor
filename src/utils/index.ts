/**
 * 组合类名
 * @param classes 类名数组
 * @returns 组合后的类名字符串
 */
export const classNames = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ')
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 深度合并对象
 * @param target 目标对象
 * @param sources 源对象数组
 * @returns 合并后的对象
 */
export const deepMerge = (target: any, ...sources: any[]): any => {
  if (!sources.length) return target
  const source = sources.shift()
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }
  
  return deepMerge(target, ...sources)
}

/**
 * 判断是否为对象
 * @param item 要判断的项
 * @returns 是否为对象
 */
const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item)
} 