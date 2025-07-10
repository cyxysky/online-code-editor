#!/usr/bin/env node

/**
 * React 在线代码编辑器 Pro - 设置脚本
 * 自动配置改进的编译系统和相关文件
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 React 在线代码编辑器 Pro - 自动设置');
console.log('==========================================\n');

// 检查必要目录
const requiredDirs = [
  'src/demo/components',
  'src/demo/workers', 
  'public/workers'
];

function ensureDirectories() {
  console.log('📁 检查并创建必要目录...');
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ 创建目录: ${dir}`);
    } else {
      console.log(`  ✓ 目录已存在: ${dir}`);
    }
  });
  
  console.log('');
}

// 检查WebWorker文件
function checkWebWorker() {
  console.log('🔧 检查WebWorker文件...');
  
  const workerPath = 'public/workers/compilerWorker.js';
  if (fs.existsSync(workerPath)) {
    console.log('  ✅ WebWorker文件已存在');
  } else {
    console.log('  ❌ WebWorker文件不存在');
    console.log('  💡 请确保 public/workers/compilerWorker.js 文件存在');
  }
  console.log('');
}

// 生成配置文件
function generateConfig() {
  console.log('⚙️  生成配置文件...');
  
  const config = {
    compiler: {
      strategies: {
        frontend: {
          enabled: true,
          workerUrl: '/workers/compilerWorker.js',
          maxFileSize: 100, // KB
          maxFiles: 10
        },
        backend: {
          enabled: false, // 需要服务器支持
          apiUrl: process.env.COMPILER_API_URL || 'http://localhost:3001/api/compile',
          maxFileSize: 1000, // KB
          maxFiles: 100
        },
        webcontainer: {
          enabled: true,
          timeout: 10000,
          maxFileSize: 500, // KB
          maxFiles: 50
        }
      },
      babel: {
        presets: [
          ['@babel/preset-react', { runtime: 'classic' }],
          ['@babel/preset-typescript', { allowDeclareFields: true }]
        ],
        plugins: []
      }
    },
    editor: {
      theme: 'light',
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      lineNumbers: true,
      autoSave: true,
      autoSaveDelay: 500
    },
    preview: {
      refreshDelay: 300,
      errorBoundary: true,
      sandbox: {
        allowScripts: true,
        allowSameOrigin: true,
        allowModals: false
      }
    }
  };
  
  const configPath = 'src/demo/config.json';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`  ✅ 配置文件已生成: ${configPath}`);
  console.log('');
}

// 生成示例项目文件
function generateExamples() {
  console.log('📝 生成示例项目...');
  
  const examples = {
    'simple-counter': {
      name: '简单计数器',
      description: '使用useState的基础计数器组件',
      files: {
        'App.tsx': `import React, { useState } from 'react';

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>React 计数器</h1>
      <div style={{ 
        fontSize: '2rem', 
        margin: '1rem 0',
        color: '#007bff'
      }}>
        {count}
      </div>
      <div>
        <button 
          onClick={() => setCount(count - 1)}
          style={{ margin: '0 0.5rem', padding: '0.5rem 1rem' }}
        >
          -1
        </button>
        <button 
          onClick={() => setCount(0)}
          style={{ margin: '0 0.5rem', padding: '0.5rem 1rem' }}
        >
          重置
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          style={{ margin: '0 0.5rem', padding: '0.5rem 1rem' }}
        >
          +1
        </button>
      </div>
    </div>
  );
};

export default App;`
      }
    },
    'todo-list': {
      name: '待办事项列表',
      description: '完整的CRUD操作示例',
      files: {
        'App.tsx': `import React, { useState } from 'react';
import TodoItem from './TodoItem';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');

  const addTodo = () => {
    if (inputText.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: inputText.trim(),
        completed: false
      };
      setTodos([...todos, newTodo]);
      setInputText('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>待办事项列表</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="添加新的待办事项..."
          style={{ 
            width: '70%', 
            padding: '0.5rem',
            marginRight: '0.5rem'
          }}
        />
        <button onClick={addTodo} style={{ padding: '0.5rem 1rem' }}>
          添加
        </button>
      </div>

      <div>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
        
        {todos.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666' }}>
            还没有待办事项，添加一个吧！
          </p>
        )}
      </div>
      
      <div style={{ marginTop: '1rem', color: '#666' }}>
        总计: {todos.length} 项，已完成: {todos.filter(t => t.completed).length} 项
      </div>
    </div>
  );
};

export default App;`,
        'TodoItem.tsx': `import React from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0.5rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      marginBottom: '0.5rem',
      backgroundColor: todo.completed ? '#f0f8f0' : '#fff'
    }}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        style={{ marginRight: '0.5rem' }}
      />
      
      <span style={{
        flex: 1,
        textDecoration: todo.completed ? 'line-through' : 'none',
        color: todo.completed ? '#666' : '#000'
      }}>
        {todo.text}
      </span>
      
      <button 
        onClick={() => onDelete(todo.id)}
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        删除
      </button>
    </div>
  );
};

export default TodoItem;`
      }
    }
  };
  
  const examplesPath = 'src/demo/examples.json';
  fs.writeFileSync(examplesPath, JSON.stringify(examples, null, 2));
  console.log(`  ✅ 示例项目已生成: ${examplesPath}`);
  console.log('');
}

// 生成启动脚本
function generateStartScript() {
  console.log('🚀 生成启动脚本...');
  
  const packageJsonPath = 'package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 添加启动脚本
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['dev:editor'] = 'vite --port 3000';
    packageJson.scripts['build:editor'] = 'vite build';
    packageJson.scripts['preview:editor'] = 'vite preview';
    
    // 添加必要依赖
    packageJson.dependencies = packageJson.dependencies || {};
    if (!packageJson.dependencies['react']) {
      packageJson.dependencies['react'] = '^18.2.0';
    }
    if (!packageJson.dependencies['react-dom']) {
      packageJson.dependencies['react-dom'] = '^18.2.0';
    }
    
    packageJson.devDependencies = packageJson.devDependencies || {};
    if (!packageJson.devDependencies['@types/react']) {
      packageJson.devDependencies['@types/react'] = '^18.2.0';
    }
    if (!packageJson.devDependencies['@types/react-dom']) {
      packageJson.devDependencies['@types/react-dom'] = '^18.2.0';
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('  ✅ package.json 已更新');
  } else {
    console.log('  ⚠️  package.json 不存在，跳过脚本更新');
  }
  console.log('');
}

// 检查并提示后续步骤
function showNextSteps() {
  console.log('✨ 设置完成！后续步骤：');
  console.log('==========================================');
  console.log('');
  console.log('1. 安装依赖:');
  console.log('   npm install');
  console.log('');
  console.log('2. 启动开发服务器:');
  console.log('   npm run dev:editor');
  console.log('');
  console.log('3. 在浏览器中打开:');
  console.log('   http://localhost:3000');
  console.log('');
  console.log('📚 文档和示例:');
  console.log('   - 查看 src/demo/README.md 了解详细功能');
  console.log('   - 查看 src/demo/examples.json 获取示例项目');
  console.log('   - 修改 src/demo/config.json 自定义配置');
  console.log('');
  console.log('🔧 高级配置:');
  console.log('   - 后端编译: 需要设置编译服务器');
  console.log('   - WebContainer: 自动启用，支持npm包');
  console.log('   - 前端编译: 默认启用，适合简单项目');
  console.log('');
  console.log('如有问题，请查看文档或提交Issue！');
  console.log('');
  console.log('🎉 祝您使用愉快！');
}

// 主执行函数
function main() {
  try {
    ensureDirectories();
    checkWebWorker();
    generateConfig();
    generateExamples();
    generateStartScript();
    showNextSteps();
  } catch (error) {
    console.error('❌ 设置过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 运行设置
main(); 