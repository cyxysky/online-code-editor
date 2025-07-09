# React组件库

一个基于React和TypeScript构建的现代化UI组件库。

## 特性

- 🔥 使用TypeScript编写，提供完整的类型定义
- 📦 支持ES模块和UMD格式
- 🎨 现代化的UI设计
- 📱 响应式设计
- ⚡ 基于Vite构建，开发体验优秀
- 🛠️ 完善的开发工具链

## 安装

```bash
npm install react-lib
# 或
yarn add react-lib
# 或
pnpm add react-lib
```

## 使用

```tsx
import React from 'react'
import { Button, Input, Card } from 'react-lib'

function App() {
  return (
    <div>
      <Button type="primary">点击我</Button>
      <Input placeholder="请输入内容" />
      <Card title="卡片标题">
        <p>卡片内容</p>
      </Card>
    </div>
  )
}

export default App
```

## 组件

### Button 按钮

基础的按钮组件。

```tsx
<Button type="primary" size="medium" onClick={handleClick}>
  按钮文字
</Button>
```

**Props:**
- `type`: 按钮类型 - `'primary' | 'secondary' | 'danger'`
- `size`: 按钮尺寸 - `'small' | 'medium' | 'large'`
- `disabled`: 是否禁用 - `boolean`
- `onClick`: 点击事件处理器
- `children`: 按钮内容

### Input 输入框

基础的输入框组件。

```tsx
<Input 
  type="text" 
  size="medium" 
  placeholder="请输入内容"
  value={value}
  onChange={handleChange}
/>
```

**Props:**
- `type`: 输入框类型 - `'text' | 'password' | 'email' | 'number'`
- `size`: 输入框尺寸 - `'small' | 'medium' | 'large'`
- `placeholder`: 占位符文本
- `disabled`: 是否禁用
- `error`: 是否显示错误状态
- `value`: 输入框值
- `onChange`: 值变化回调

### Card 卡片

容器组件，用于承载内容。

```tsx
<Card 
  title="卡片标题" 
  bordered 
  hoverable
  actions={[<Button key="1">操作</Button>]}
>
  <p>卡片内容</p>
</Card>
```

**Props:**
- `title`: 卡片标题
- `bordered`: 是否显示边框
- `hoverable`: 是否可悬停
- `actions`: 操作区域内容
- `children`: 卡片内容

## 开发

### 环境要求

- Node.js >= 16
- npm >= 7

### 开始开发

```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建组件库
npm run build
```

### 项目结构

```
react-lib/
├── src/
│   ├── components/          # 组件源码
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Card/
│   ├── utils/              # 工具函数
│   ├── demo/               # 示例应用
│   └── index.ts            # 主入口文件
├── dist/                   # 构建输出
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 构建

```bash
# 构建组件库
npm run build

# 构建产物包括：
# - dist/index.js (UMD格式)
# - dist/index.esm.js (ES模块格式)
# - dist/index.d.ts (类型定义文件)
```

## 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

[MIT](LICENSE) 