import React, { useMemo } from 'react'

export interface ButtonProps {
  /**
   * 按钮类型
   */
  type?: 'primary' | 'secondary' | 'danger'
  /**
   * 按钮尺寸
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 按钮内容
   */
  children: React.ReactNode
  /**
   * 点击事件处理器
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /**
   * 自定义类名
   */
  className?: string
}

const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  disabled = false,
  children,
  onClick,
  className = '',
  ...props
}) => {
  const baseClass = 'rl-button'
  const typeClass = `${baseClass}--${type}`
  const sizeClass = `${baseClass}--${size}`
  const disabledClass = disabled ? `${baseClass}--disabled` : ''

  const classNames = useMemo(() => {
    return [baseClass, typeClass, sizeClass, disabledClass, className].filter(Boolean)
      .join(' ')
  }, [baseClass, typeClass, sizeClass, disabledClass, className])


  return (
    <button
      className={classNames}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button 