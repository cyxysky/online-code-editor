import React from 'react'

export interface InputProps {
  /**
   * 输入框类型
   */
  type?: 'text' | 'password' | 'email' | 'number'
  /**
   * 输入框尺寸
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 输入框值
   */
  value?: string
  /**
   * 默认值
   */
  defaultValue?: string
  /**
   * 值变化回调
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  /**
   * 失焦回调
   */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  /**
   * 聚焦回调
   */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 是否显示错误状态
   */
  error?: boolean
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  size = 'medium',
  placeholder,
  disabled = false,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  className = '',
  error = false,
  ...props
}) => {
  const baseClass = 'rl-input'
  const sizeClass = `${baseClass}--${size}`
  const disabledClass = disabled ? `${baseClass}--disabled` : ''
  const errorClass = error ? `${baseClass}--error` : ''

  const classNames = [baseClass, sizeClass, disabledClass, errorClass, className]
    .filter(Boolean)
    .join(' ')

  return (
    <input
      type={type}
      className={classNames}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      {...props}
    />
  )
}

export default Input 