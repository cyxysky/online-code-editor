# Lodash 使用示例

## 修正后的CDN配置

现在依赖管理器使用正确的CDN路径：

- **修正前（错误）**: `https://unpkg.com/lodash@4.17.21/dist/index.umd.js`
- **修正后（正确）**: `https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js`

## 如何使用

### 1. 添加 Lodash 依赖

1. 在依赖管理面板中点击 "lodash" 
2. 系统会自动使用正确的CDN路径：`https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js`
3. 添加成功后即可在代码中使用

### 2. 在代码中使用 Lodash

```tsx
import React, { useState } from 'react';
import _ from 'lodash';  // 导入 lodash

const App = () => {
  const [numbers, setNumbers] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [users, setUsers] = useState([
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
    { name: 'Charlie', age: 35 }
  ]);

  // 使用 lodash 的各种功能
  const shuffleNumbers = () => {
    setNumbers(_.shuffle([...numbers]));
  };

  const sortUsersByAge = () => {
    setUsers(_.sortBy([...users], 'age'));
  };

  const getRandomNumbers = () => {
    const randomNums = _.times(5, () => _.random(1, 100));
    setNumbers(randomNums);
  };

  const chunkedNumbers = _.chunk(numbers, 3);
  const evenNumbers = _.filter(numbers, n => n % 2 === 0);
  const sumOfNumbers = _.sum(numbers);

  return (
    <div className="app">
      <h1>Lodash 功能演示</h1>
      
      <div className="section">
        <h3>数组操作</h3>
        <p>当前数组: [{numbers.join(', ')}]</p>
        <p>偶数: [{evenNumbers.join(', ')}]</p>
        <p>总和: {sumOfNumbers}</p>
        
        <div className="button-group">
          <button onClick={shuffleNumbers}>
            🎲 打乱数组 (_.shuffle)
          </button>
          <button onClick={getRandomNumbers}>
            🎯 生成随机数 (_.random + _.times)
          </button>
        </div>

        <div className="chunks">
          <h4>分块显示 (_.chunk):</h4>
          {chunkedNumbers.map((chunk, index) => (
            <div key={index} className="chunk">
              [{chunk.join(', ')}]
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>对象操作</h3>
        <div className="users">
          {users.map((user, index) => (
            <div key={index} className="user">
              {user.name} - {user.age}岁
            </div>
          ))}
        </div>
        <button onClick={sortUsersByAge}>
          📊 按年龄排序 (_.sortBy)
        </button>
      </div>

      <div className="section">
        <h3>实用工具</h3>
        <p>去重数组: {JSON.stringify(_.uniq([1, 2, 2, 3, 3, 4]))}</p>
        <p>数组扁平化: {JSON.stringify(_.flatten([[1, 2], [3, 4], [5]]))}</p>
        <p>深度扁平化: {JSON.stringify(_.flattenDeep([1, [2, [3, [4]], 5]]))}</p>
      </div>
    </div>
  );
};

export default App;
```

### 3. 样式补充

```css
.section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.section h3 {
  color: #495057;
  margin-bottom: 1rem;
}

.chunks {
  margin-top: 1rem;
}

.chunk {
  display: inline-block;
  background: #e3f2fd;
  padding: 0.5rem;
  margin: 0.25rem;
  border-radius: 6px;
  border: 1px solid #90caf9;
}

.users {
  margin: 1rem 0;
}

.user {
  padding: 0.5rem;
  background: #fff3e0;
  margin: 0.25rem 0;
  border-radius: 6px;
  border-left: 4px solid #ff9800;
}
```

## 技术细节

### CDN路径映射

系统现在包含以下包的预配置CDN路径：

```typescript
const CDN_PATH_MAP: Record<string, string> = {
  'lodash': 'lodash.min.js',              // ✅ 正确
  'axios': 'dist/axios.min.js',           // ✅ 正确  
  'moment': 'moment.min.js',              // ✅ 正确
  'classnames': 'index.js',               // ✅ 正确
  'uuid': 'dist/umd/uuid.min.js',         // ✅ 正确
  // ... 更多包
};
```

### 自动路径检测

对于未知包，系统会自动尝试以下路径：
1. `${packageName}.min.js`
2. `dist/${packageName}.min.js`  
3. `dist/umd/${packageName}.min.js`
4. `index.js`
5. `dist/index.js`
6. `${packageName}.js`
7. `dist/${packageName}.js`
8. `dist/index.min.js`

### 调试信息

在浏览器控制台中可以看到详细的依赖加载过程：

```
📦 开始添加依赖: lodash@4.17.21
✅ 找到可用路径: https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js  
✅ 依赖添加成功: lodash
```

## 常见问题

### Q: 为什么改用 jsdelivr 而不是 unpkg？
A: jsdelivr 更稳定，在中国访问速度更快，而且有更好的文件路径支持。

### Q: 如何验证依赖是否正确加载？
A: 在浏览器控制台中输入 `console.log(window._)` 应该能看到 lodash 对象。

### Q: 某个包找不到正确的路径怎么办？
A: 可以手动添加到 `CDN_PATH_MAP` 中，或者系统会自动尝试多种常见路径。

---

🎉 现在可以放心使用 lodash 和其他依赖包了！ 