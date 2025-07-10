import React, { useState, useCallback, useRef, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import { AdvancedPreview } from './components/AdvancedPreview';
import FileSystem, { FileNode } from './components/FileSystem';
import { FileInfo, CompilationStrategy, Dependency } from './components/CompilerStrategy';
import DependencyManager from './components/DependencyManager';

// 默认的示例文件
const DEFAULT_FILES: FileNode[] = [
  {
    id: 'index',
    name: 'index.html',
    type: 'file',
    content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>前端在线编辑器</title>
    <style>
        body { 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: #f5f5f5;
        }
        #app { 
            min-height: 100vh;
            padding: 20px; 
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #666;
        }
    </style>

    <!-- 依赖库会自动注入到这里 -->
    <!-- AUTO_INJECT_DEPENDENCIES -->
</head>
<body>
    <div id="app">
        <div class="loading">正在加载应用...</div>
    </div>
    
    <!-- 你可以在这里添加其他HTML内容 -->
    <footer style="text-align: center; margin-top: 40px; color: #666; font-size: 14px;">
        <p>🚀 支持 React、Vue、原生JavaScript | 可在依赖管理中添加更多库</p>
    </footer>

    <!-- main.js 会被自动注入到这里 -->
    <!-- AUTO_INJECT_MAIN_JS -->
</body>
</html>`
  },
  {
    id: 'main',
    name: 'main.js',
    type: 'file',
    content: `// 前端应用入口文件 - 选择你要使用的框架
// 预览器会自动加载这个文件，你可以在这里初始化应用

// ================================
// 🚀 框架选择 - 取消注释你想用的框架
// ================================

// 1️⃣ 使用 React (推荐)  
// 注意：通过CDN加载时，React和ReactDOM已经是全局变量
// 如果使用npm/模块系统，请改为：import React from 'react'; import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

// 智能检测DOM状态并初始化应用
function initializeApp() {
  console.log('🔄 开始初始化React应用');
  
  // 检查全局变量是否已加载
  if (typeof window.React === 'undefined') {
    console.error('❌ React未加载！请检查CDN链接');
    document.getElementById('app').innerHTML = '<div style="color: red; padding: 20px;">❌ React未加载！请检查CDN链接</div>';
    return;
  }
  
  if (typeof window.ReactDOM === 'undefined') {
    console.error('❌ ReactDOM未加载！请检查CDN链接');
    document.getElementById('app').innerHTML = '<div style="color: red; padding: 20px;">❌ ReactDOM未加载！请检查CDN链接</div>';
    return;
  }

  // 检查app容器是否存在
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('❌ 找不到#app容器！');
    return;
  }

  // React 18 语法 - createRoot  
  try {
    if (window.ReactDOM.createRoot) {
      console.log('🚀 使用React 18语法初始化');
      const root = window.ReactDOM.createRoot(appContainer);
      root.render(window.React.createElement(App));
    } else {
      // 降级到 React 17 语法
      console.log('🚀 使用React 17语法初始化');
      window.ReactDOM.render(window.React.createElement(App), appContainer);
    }
    console.log('✅ React应用初始化成功');
  } catch (error) {
    console.error('❌ React应用初始化失败:', error);
    document.getElementById('app').innerHTML = \`<div style="color: red; padding: 20px;">❌ React应用初始化失败: \${error.message}</div>\`;
  }
}

// 智能DOM检测 - 支持已加载和未加载的情况
if (document.readyState === 'loading') {
  // DOM还在加载中，等待DOMContentLoaded事件
  console.log('⏳ DOM加载中，等待DOMContentLoaded事件');
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM已经加载完成，直接初始化
  console.log('✅ DOM已就绪，立即初始化应用');
  initializeApp();
}

// 2️⃣ 使用 Vue.js (取消下面注释，注释掉上面React代码)
/*
import { createApp } from 'vue';
import VueApp from './VueApp.js';
import './styles.css';

createApp(VueApp).mount('#app');
*/

// 3️⃣ 使用原生 JavaScript (取消下面注释，注释掉上面代码)
/*
import VanillaApp from './VanillaApp.js';
import './styles.css';

// 初始化原生JavaScript应用
new VanillaApp('app');
*/

// ================================
// 🛠️ 通用初始化代码 
// ================================

// 添加一些全局事件监听
console.log('🚀 应用已启动！');

// 可以在这里添加其他初始化逻辑
// 比如：全局错误处理、性能监控、主题设置等
window.addEventListener('load', () => {
  console.log('📱 页面加载完成');
});

`
  },
  {
    id: 'app',
    name: 'App.tsx',
    type: 'file',
    content: `import React, { useState } from 'react';
import Button from './Button';
import './styles.css';

const App = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Hello World!');
  const [items, setItems] = useState(['React', 'Vue', 'JavaScript']);

  // 示例：添加新项目到列表
  const addItem = () => {
    const newItem = \`Item \${items.length + 1}\`;
    setItems([...items, newItem]);
  };

  return (
    <div className="app">
      <h1>{message}</h1>
      
      <div className="counter">
        <p>计数: <span className="count">{count}</span></p>
        <div className="button-group">
          <Button 
            onClick={() => setCount(count - 1)}
            variant="outline"
          >
            -1
          </Button>
          <Button 
            onClick={() => setCount(0)}
            variant="secondary"
          >
            重置
          </Button>
          <Button 
            onClick={() => setCount(count + 1)}
            variant="primary"
          >
            +1
          </Button>
        </div>
      </div>

      <div className="item-list">
        <h3>支持的框架 ({items.length})</h3>
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <Button onClick={addItem} variant="primary">
          添加框架
        </Button>
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="修改消息..."
        />
        <p className="tip">
          💡 提示：在main.js中切换框架，点击依赖管理添加库来扩展功能！
        </p>
      </div>
    </div>
  );
};

export default App;`
  },
  {
    id: 'button',
    name: 'Button.tsx',
    type: 'file',
    content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}) => {
  const getButtonClass = () => {
    const baseClass = 'btn';
    const variantClass = \`btn-\${variant}\`;
    const disabledClass = disabled ? 'btn-disabled' : '';
    return [baseClass, variantClass, disabledClass].filter(Boolean).join(' ');
  };

  return (
    <button 
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;`
  },
  {
    id: 'vue-app',
    name: 'VueApp.js', 
    type: 'file',
    content: `// Vue.js 示例 - 如果你想用Vue而不是React
const { createApp, ref } = Vue;

const VueApp = {
  setup() {
    const count = ref(0);
    const message = ref('Hello Vue!');
    const items = ref(['Vue', 'React', 'JavaScript']);
    
    const addItem = () => {
      const newItem = \`Item \${items.value.length + 1}\`;
      items.value.push(newItem);
    };
    
    return {
      count,
      message,
      items,
      addItem
    };
  },
  template: \`
    <div class="app">
      <h1>{{ message }}</h1>
      
      <div class="counter">
        <p>计数: <span class="count">{{ count }}</span></p>
        <div class="button-group">
          <button class="btn btn-outline" @click="count--">-1</button>
          <button class="btn btn-secondary" @click="count = 0">重置</button>
          <button class="btn btn-primary" @click="count++">+1</button>
        </div>
      </div>

      <div class="item-list">
        <h3>支持的框架 ({{ items.length }})</h3>
        <ul>
          <li v-for="(item, index) in items" :key="index">{{ item }}</li>
        </ul>
        <button class="btn btn-primary" @click="addItem">添加框架</button>
      </div>
      
      <div class="message-input">
        <input
          type="text"
          v-model="message"
          placeholder="修改消息..."
        />
                 <p class="tip">
           💡 提示：这是Vue.js版本！在main.js中切换框架
         </p>
      </div>
    </div>
  \`
};

// 注意：不要在这里挂载！挂载代码在 main.js 中
// 这个组件会被 main.js 导入并挂载

export default VueApp;`
  },
  {
    id: 'vanilla-app',
    name: 'VanillaApp.js',
    type: 'file',
    content: `// 原生JavaScript示例 - 不依赖任何框架
class VanillaApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.state = {
      count: 0,
      message: 'Hello JavaScript!',
      items: ['JavaScript', 'React', 'Vue']
    };
    
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = \`
      <div class="app">
        <h1>\${this.state.message}</h1>
        
        <div class="counter">
          <p>计数: <span class="count">\${this.state.count}</span></p>
          <div class="button-group">
            <button class="btn btn-outline" data-action="decrement">-1</button>
            <button class="btn btn-secondary" data-action="reset">重置</button>
            <button class="btn btn-primary" data-action="increment">+1</button>
          </div>
        </div>

        <div class="item-list">
          <h3>支持的技术 (\${this.state.items.length})</h3>
          <ul>
            \${this.state.items.map(item => \`<li>\${item}</li>\`).join('')}
          </ul>
          <button class="btn btn-primary" data-action="addItem">添加技术</button>
        </div>
        
        <div class="message-input">
          <input
            type="text"
            value="\${this.state.message}"
            placeholder="修改消息..."
            data-action="updateMessage"
          />
                     <p class="tip">
             💡 提示：这是原生JavaScript版本！在main.js中切换到此框架
           </p>
        </div>
      </div>
    \`;
  }
  
  bindEvents() {
    // 按钮事件
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      switch (action) {
        case 'increment':
          this.state.count++;
          this.render();
          this.bindEvents();
          break;
        case 'decrement':
          this.state.count--;
          this.render();
          this.bindEvents();
          break;
        case 'reset':
          this.state.count = 0;
          this.render();
          this.bindEvents();
          break;
        case 'addItem':
          this.state.items.push(\`Tech \${this.state.items.length + 1}\`);
          this.render();
          this.bindEvents();
          break;
      }
    });
    
    // 输入框事件
    const input = this.container.querySelector('[data-action="updateMessage"]');
    if (input) {
      input.addEventListener('input', (e) => {
        this.state.message = e.target.value;
        this.render();
        this.bindEvents();
      });
    }
  }
}

// 注意：不要在这里初始化！初始化代码在 main.js 中
// 这个类会被 main.js 导入并实例化

export default VanillaApp;`
  },
  {
    id: 'styles',
    name: 'styles.css',
    type: 'file',
    content: `.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 2.5rem;
  font-weight: 600;
}

.counter {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.counter p {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #495057;
}

.count {
  font-weight: bold;
  font-size: 2rem;
  color: #007bff;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.btn:hover:not(.btn-disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(.btn-disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(.btn-disabled) {
  background: #545b62;
}

.btn-outline {
  background: transparent;
  color: #007bff;
  border: 2px solid #007bff;
}

.btn-outline:hover:not(.btn-disabled) {
  background: #007bff;
  color: white;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.message-input {
  margin-top: 2rem;
}

.message-input input {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.message-input input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
}

.item-list {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.item-list h3 {
  color: #495057;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.item-list ul {
  list-style: none;
  margin-bottom: 1rem;
}

.item-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
}

.item-list li:last-child {
  border-bottom: none;
}

.tip {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  border-radius: 4px;
  color: #1565c0;
  font-size: 0.9rem;
  line-height: 1.4;
}`
  }
];

const App: React.FC = () => {
  
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('index');
  const [compilationStrategy, setCompilationStrategy] = useState<CompilationStrategy>(CompilationStrategy.FRONTEND);
  const [dependencies, setDependencies] = useState<Dependency[]>([
    {
      name: 'react',
      version: '18.2.0',
      cdnUrl: 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js',
      description: 'React框架 - 用户界面库',
      isInstalled: true
    },
    {
      name: 'react-dom',
      version: '18.2.0', 
      cdnUrl: 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js',
      description: 'ReactDOM - React的DOM操作库',
      isInstalled: true
    }
  ]);
  const [showDependencyModal, setShowDependencyModal] = useState<boolean>(false);
  const previewRef = useRef<{ forceCompile: () => void } | null>(null);

  // 处理保存事件（Ctrl+S）
  const handleSave = useCallback(() => {
    console.log('🔄 保存文件，立即编译');
    if (previewRef.current) {
      previewRef.current.forceCompile();
    }
  }, []);



  // 获取当前活动文件
  const getActiveFile = useCallback((): FileNode | null => {
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === activeFileId) return node;
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFile(files);
  }, [files, activeFileId]);

  // 更新文件内容
  const updateFileContent = useCallback((fileId: string, content: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === fileId) {
          return { ...node, content };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    setFiles(updateNode(files));
  }, [files]);

  // 依赖同步到index.html
  const syncDependenciesToHtml = useCallback(() => {
    const indexFile = files.find(f => f.name === 'index.html');
    if (!indexFile || !indexFile.content) return;

    // 生成依赖script标签
    const validDependencies = dependencies.filter(dep => dep.isInstalled && dep.cdnUrl);
    
    if (validDependencies.length === 0) {
      console.log('⚠️ 没有有效的依赖需要注入');
      return;
    }

    const dependencyScripts = validDependencies
      .map(dep => {
        // 确保CDN URL是有效的
        if (!dep.cdnUrl || dep.cdnUrl.trim() === '') {
          console.warn(`⚠️ 依赖 ${dep.name} 的CDN URL为空`);
          return null;
        }
        return `    <script crossorigin src="${dep.cdnUrl.trim()}"></script>`;
      })
      .filter(Boolean)
      .join('\n');

    if (!dependencyScripts) {
      console.log('⚠️ 没有生成有效的依赖script标签');
      return;
    }

    // 更新HTML内容
    let newContent = indexFile.content;
    
    // 替换依赖注入标记
    if (newContent.includes('<!-- AUTO_INJECT_DEPENDENCIES -->')) {
      const dependencySection = `<!-- 依赖库 - 自动生成，请勿手动修改此部分 -->\n${dependencyScripts}\n    <!-- AUTO_INJECT_DEPENDENCIES -->`;
      
      newContent = newContent.replace(
        /<!-- 依赖库.*?<!-- AUTO_INJECT_DEPENDENCIES -->/s,
        dependencySection
      );
    } else {
      // 如果没找到标记，直接插入到head结束标签前
      newContent = newContent.replace(
        '</head>',
        `    <!-- 依赖库 - 自动生成 -->\n${dependencyScripts}\n</head>`
      );
    }

    // 如果内容有变化则更新
    if (newContent !== indexFile.content) {
      updateFileContent(indexFile.id, newContent);
      console.log('🔄 已同步依赖到 index.html', {
        依赖数量: validDependencies.length,
        依赖列表: validDependencies.map(d => d.name)
      });
    }
  }, [dependencies, files, updateFileContent]);

  // 监听依赖变化，自动同步到HTML
  useEffect(() => {
    syncDependenciesToHtml();
  }, [dependencies, syncDependenciesToHtml]);

  // 文件系统操作
  const handleFileCreate = useCallback((parentId: string | null, name: string, type: 'file' | 'folder') => {
    const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: FileNode = {
      id: newId,
      name,
      type,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      isOpen: type === 'folder' ? false : undefined
    };

    if (parentId === null) {
      setFiles([...files, newNode]);
    } else {
      const addToParent = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId && node.type === 'folder') {
            return {
              ...node,
              children: [...(node.children || []), newNode]
            };
          }
          if (node.children) {
            return { ...node, children: addToParent(node.children) };
          }
          return node;
        });
      };
      setFiles(addToParent(files));
    }

    if (type === 'file') {
      setActiveFileId(newId);
    }
  }, [files]);

  const handleFileDelete = useCallback((fileId: string) => {
    const deleteNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === fileId) return false;
        if (node.children) {
          node.children = deleteNode(node.children);
        }
        return true;
      });
    };

    setFiles(deleteNode(files));

    if (activeFileId === fileId) {
      const remainingFiles = deleteNode(files);
      const firstFile = remainingFiles.find(f => f.type === 'file');
      setActiveFileId(firstFile?.id || '');
    }
  }, [files, activeFileId]);

  const handleFileRename = useCallback((fileId: string, newName: string) => {
    const renameNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === fileId) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: renameNode(node.children) };
        }
        return node;
      });
    };

    setFiles(renameNode(files));
  }, [files]);

  const handleFolderToggle = useCallback((folderId: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === folderId && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };

    setFiles(toggleNode(files));
  }, [files]);

  // 依赖管理回调
  const handleDependencyAdd = useCallback((dependency: Dependency) => {
    setDependencies(prevDeps => {
      const existingIndex = prevDeps.findIndex(dep => dep.name === dependency.name);
      if (existingIndex >= 0) {
        // 更新现有依赖
        const newDeps = [...prevDeps];
        newDeps[existingIndex] = dependency;
        return newDeps;
      } else {
        // 添加新依赖
        return [...prevDeps, dependency];
      }
    });
  }, []);

  const handleDependencyRemove = useCallback((name: string) => {
    setDependencies(prevDeps => prevDeps.filter(dep => dep.name !== name));
  }, []);

  const handleDependencyUpdate = useCallback((name: string, version: string) => {
    setDependencies(prevDeps => 
      prevDeps.map(dep => 
        dep.name === name ? { ...dep, version } : dep
      )
    );
  }, []);

  // 转换为FileInfo格式供编译器使用
  const getFileInfos = useCallback((): FileInfo[] => {
    const extractFiles = (nodes: FileNode[]): FileInfo[] => {
      const result: FileInfo[] = [];
      for (const node of nodes) {
        if (node.type === 'file' && node.content !== undefined) {
          const ext = node.name.split('.').pop()?.toLowerCase();
          let language: FileInfo['language'] = 'js';

          switch (ext) {
            case 'tsx': language = 'tsx'; break;
            case 'jsx': language = 'jsx'; break;
            case 'ts': language = 'ts'; break;
            case 'js': language = 'js'; break;
            case 'css': language = 'css'; break;
            default: language = 'js';
          }

          result.push({
            id: node.id,
            name: node.name,
            content: node.content,
            language
          });
        }
        if (node.children) {
          result.push(...extractFiles(node.children));
        }
      }
      return result;
    };

    return extractFiles(files);
  }, [files]);

  const activeFile = getActiveFile();
  const fileInfos = getFileInfos();

  const styles = {
    app: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      background: '#f6f8fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      height: '60px',
      background: '#24292f',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      borderBottom: '1px solid #30363d',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    logo: {
      fontSize: '24px',
    },
    strategySelector: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    strategyLabel: {
      fontSize: '14px',
      color: '#f0f6fc',
    },
    strategyButton: {
      padding: '6px 12px',
      border: '1px solid #444c56',
      borderRadius: '6px',
      background: 'transparent',
      color: '#f0f6fc',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    dependencyBtn: {
      padding: '8px 16px',
      border: '1px solid #444c56',
      borderRadius: '6px',
      background: '#238636',
      color: '#ffffff',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontWeight: 500,
    },
    main: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '250px 1fr 1fr',
      overflow: 'hidden',
    },
    sidebar: {
      background: '#ffffff',
      borderRight: '1px solid #e1e4e8',
    },
    editorArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    editorHeader: {
      background: '#ffffff',
      borderBottom: '1px solid #e1e4e8',
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
    },
    editorTitle: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#24292f',
    },
    editorContent: {
      flex: 1,
      background: '#ffffff',
      overflow: 'hidden',
    },

    previewArea: {
      background: '#ffffff',
      borderLeft: '1px solid #e1e4e8',
    },
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: '#ffffff',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid #e1e4e8',
      background: '#f6f8fa',
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#24292f',
    },
    modalCloseBtn: {
      border: 'none',
      background: 'transparent',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#656d76',
      padding: '4px',
      borderRadius: '4px',
    },
    modalBody: {
      height: '500px',
      overflow: 'auto',
    },
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.title}>
          <span style={styles.logo}>🚀</span>
          <span>前端在线编辑器 Pro</span>
        </div>
        
        <div style={styles.headerActions}>
          <button 
            style={styles.dependencyBtn}
            onClick={() => setShowDependencyModal(true)}
          >
            📦 依赖管理
          </button>
        </div>

      </header>

      <main style={styles.main}>
        <div style={styles.sidebar}>
          <FileSystem
            files={files}
            activeFileId={activeFileId}
            onFileSelect={setActiveFileId}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            onFolderToggle={handleFolderToggle}
          />
        </div>

        <div style={styles.editorArea}>
          {activeFile && (
            <>
              <div style={styles.editorHeader}>
                <div style={styles.editorTitle}>
                  📝 {activeFile.name}
                </div>
              </div>
              <div style={styles.editorContent}>
                <CodeEditor
                  value={activeFile.content || ''}
                  language={getEditorLanguage(activeFile.name)}
                  onChange={(value) => updateFileContent(activeFile.id, value)}
                  onSave={handleSave}
                  fileId={activeFile.id}
                  fileName={activeFile.name}
                  placeholder={`在此编写 ${activeFile.name} 的代码...`}
                />
              </div>
            </>
          )}
        </div>

        <div style={styles.previewArea}>
          <AdvancedPreview
            ref={previewRef}
            files={fileInfos}
            dependencies={dependencies}
            strategy={compilationStrategy}
          />
        </div>
      </main>
      
      {/* 依赖管理弹窗 */}
      {showDependencyModal && (
        <div style={styles.modal} onClick={() => setShowDependencyModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>📦 依赖管理</div>
              <button 
                style={styles.modalCloseBtn}
                onClick={() => setShowDependencyModal(false)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <DependencyManager
                dependencies={dependencies}
                onDependencyAdd={handleDependencyAdd}
                onDependencyRemove={handleDependencyRemove}
                onDependencyUpdate={handleDependencyUpdate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 辅助函数
function getEditorLanguage(fileName: string): 'jsx' | 'css' | 'javascript' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return 'jsx';
    case 'css':
      return 'css';
    case 'html':
      // HTML 使用 javascript 语言模式，因为编辑器组件还没有专门的 HTML 模式
      // 但注释功能会正确识别为 HTML 注释
      return 'javascript';
    case 'ts':
    case 'js':
    default:
      return 'javascript';
  }
}

function getStrategyName(strategy: CompilationStrategy): string {
  switch (strategy) {
    case CompilationStrategy.FRONTEND:
      return '前端编译';
    case CompilationStrategy.BACKEND:
      return '后端编译';
    case CompilationStrategy.WEBCONTAINER:
      return 'WebContainer';
    default:
      return '未知';
  }
}

export default App; 