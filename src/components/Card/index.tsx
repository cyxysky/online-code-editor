import React from 'react'

export interface CardProps {
  /**
   * 卡片标题
   */
  title?: string
  /**
   * 卡片内容
   */
  children: React.ReactNode
  /**
   * 是否显示边框
   */
  bordered?: boolean
  /**
   * 是否可悬停
   */
  hoverable?: boolean
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 自定义样式
   */
  style?: React.CSSProperties
  /**
   * 卡片操作区域
   */
  actions?: React.ReactNode[]
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  bordered = true,
  hoverable = false,
  className = '',
  style,
  actions,
  ...props
}) => {
  const baseClass = 'rl-card'
  const borderedClass = bordered ? `${baseClass}--bordered` : ''
  const hoverableClass = hoverable ? `${baseClass}--hoverable` : ''
  
  const classNames = [baseClass, borderedClass, hoverableClass, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classNames} style={style} {...props}>
      {title && (
        <div className={`${baseClass}__header`}>
          <div className={`${baseClass}__title`}>{title}</div>
        </div>
      )}
      <div className={`${baseClass}__body`}>
        {children}
      </div>
      {actions && actions.length > 0 && (
        <div className={`${baseClass}__actions`}>
          {actions.map((action, index) => (
            <div key={index} className={`${baseClass}__action`}>
              {action}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Card 