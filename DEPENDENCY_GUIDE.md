# React 代码编辑器 - 依赖管理指南

## 功能概述

我们的 React 代码编辑器现在支持完整的依赖管理功能，允许你从 CDN 动态添加和使用第三方库。

## 主要特性

### 📦 依赖管理面板
- 位于编辑器和预览区之间的专用面板
- 显示已安装的依赖列表
- 提供搜索和快速添加功能

### 🔍 智能依赖搜索
- 内置流行 React 生态库列表
- 实时搜索过滤
- 显示包描述和版本信息

### 🚀 一键安装
- 点击即可安装流行的依赖包
- 自动从 unpkg CDN 获取包信息
- 支持指定版本安装

### ⚡ 智能编译
- 自动处理外部依赖的导入
- 支持多种导入语法
- 运行时依赖注入

## 如何使用

### 1. 添加依赖

#### 方法一：快速添加流行包
1. 在依赖管理面板中查看"流行的依赖包"列表
2. 点击任意包即可快速安装

#### 方法二：手动添加
1. 点击"+ 添加依赖"按钮
2. 输入包名（如：lodash）
3. 可选择指定版本
4. 点击"添加"完成安装

#### 方法三：搜索添加
1. 在搜索框中输入关键词
2. 从搜索结果中选择需要的包
3. 点击安装

### 2. 在代码中使用依赖

安装依赖后，你可以在代码中正常导入和使用：

```tsx
import React, { useState } from 'react';
import _ from 'lodash';  // 使用 lodash
import axios from 'axios';  // 使用 axios

const App = () => {
  const [items, setItems] = useState([1, 2, 3, 4, 5]);
  
  // 使用 lodash 的 shuffle 函数
  const shuffleItems = () => {
    setItems(_.shuffle(items));
  };
  
  // 使用 axios 发起请求
  const fetchData = async () => {
    try {
      const response = await axios.get('https://api.example.com/data');
      console.log(response.data);
    } catch (error) {
      console.error('请求失败:', error);
    }
  };

  return (
    <div>
      <h1>依赖管理示例</h1>
      <button onClick={shuffleItems}>
        打乱数组 (使用 lodash)
      </button>
      <button onClick={fetchData}>
        获取数据 (使用 axios)
      </button>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default App;
```

### 3. 支持的导入语法

```tsx
// 默认导入
import _ from 'lodash';
import axios from 'axios';

// 命名导入
import { debounce, throttle } from 'lodash';

// 命名空间导入
import * as _ from 'lodash';
```

### 4. 删除依赖

1. 在已安装依赖列表中找到要删除的包
2. 点击"删除"按钮
3. 确认删除操作

## 支持的依赖库

### 内置流行库
- **lodash** - 实用工具库
- **axios** - HTTP 客户端
- **moment** - 日期处理库
- **classnames** - CSS 类名工具
- **uuid** - UUID 生成器

### 自定义添加
支持任何在 unpkg 上可用的 UMD 格式包。

## 技术实现

### 编译策略
代码编辑器支持三种编译策略，都能正确处理外部依赖：

1. **前端编译** - 使用 WebWorker 和 Babel
2. **后端编译** - 服务器端编译
3. **WebContainer** - 模拟 Node.js 环境

### 依赖注入机制
1. **静态注入** - 在 HTML 中预加载依赖脚本
2. **动态加载** - 运行时异步加载依赖
3. **全局变量映射** - 将依赖暴露为全局变量

### CDN 支持
- 主要使用 unpkg.com
- 自动生成 UMD 格式 URL
- 支持版本锁定

## 最佳实践

### 1. 版本管理
- 建议锁定特定版本而不是使用 `latest`
- 定期检查依赖更新
- 注意版本兼容性

### 2. 性能优化
- 避免添加过多大型依赖
- 优先使用轻量级替代方案
- 按需导入减少包体积

### 3. 错误处理
- 检查依赖是否成功加载
- 处理网络错误情况
- 提供降级方案

## 故障排除

### 常见问题

#### 1. 依赖加载失败
**现象**: 控制台显示依赖加载错误
**解决方案**:
- 检查网络连接
- 确认包名正确
- 尝试不同版本

#### 2. 导入语法错误
**现象**: 编译报错，提示模块未找到
**解决方案**:
- 确认依赖已正确安装
- 检查导入语法是否正确
- 查看包的文档确认导出方式

#### 3. 类型错误（TypeScript）
**现象**: TypeScript 类型检查失败
**解决方案**:
- 添加对应的 @types 包
- 使用 `any` 类型临时解决
- 查看包的 TypeScript 支持情况

### 调试技巧

1. **查看控制台** - 检查依赖加载和错误信息
2. **检查网络面板** - 确认 CDN 请求状态
3. **使用调试器** - 在代码中设置断点检查变量

## 更新日志

### v1.0.0
- ✅ 基础依赖管理功能
- ✅ 流行包快速安装
- ✅ 多种导入语法支持
- ✅ 三种编译策略集成
- ✅ 错误处理和调试支持

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进依赖管理功能！

### 添加新的流行包
编辑 `DependencyManager.tsx` 中的 `POPULAR_PACKAGES` 数组。

### 改进编译逻辑
查看 `compilerWorker.js` 中的依赖处理逻辑。

---

🎉 **现在开始使用依赖管理功能，构建更强大的 React 应用吧！** 