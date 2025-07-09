import { useState, useEffect } from 'react';

export interface Template {
  name: string;
  description: string;
  jsx: string;
  css: string;
  js: string;
}

export const templates: Template[] = [
  {
    name: 'Hello React',
    description: '简单的React Hello World组件',
    jsx: `import React from 'react';

function HelloComponent() {
  return (
    <div className="hello-container">
      <h1>Hello React! 👋</h1>
      <p>这是一个简单的React组件示例</p>
      <button onClick={() => alert('Hello from React!')}>
        点击我
      </button>
    </div>
  );
}

export default HelloComponent;`,
    css: `.hello-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.hello-container h1 {
  color: #0969da;
  margin-bottom: 20px;
  font-size: 2rem;
}

.hello-container p {
  color: #656d76;
  font-size: 16px;
  margin-bottom: 30px;
}

.hello-container button {
  background: #0969da;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.hello-container button:hover {
  background: #0860ca;
}`,
    js: `console.log('Hello React 组件已加载');`
  },
  
  {
    name: '计数器组件',
    description: '带状态的计数器组件',
    jsx: `import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);

  return (
    <div className="counter-container">
      <h2>计数器组件</h2>
      <div className="counter-display">
        <span className="count-value">{count}</span>
      </div>
      <div className="counter-buttons">
        <button onClick={decrement} className="btn-danger">
          -
        </button>
        <button onClick={reset} className="btn-secondary">
          重置
        </button>
        <button onClick={increment} className="btn-primary">
          +
        </button>
      </div>
    </div>
  );
}

export default Counter;`,
    css: `.counter-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 30px;
  text-align: center;
  background: #f6f8fa;
  border-radius: 12px;
  border: 1px solid #e1e4e8;
}

.counter-container h2 {
  color: #24292f;
  margin-bottom: 30px;
  font-size: 1.5rem;
}

.counter-display {
  background: white;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #e1e4e8;
}

.count-value {
  font-size: 3rem;
  font-weight: bold;
  color: #0969da;
}

.counter-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.counter-buttons button {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s;
  min-width: 60px;
}

.btn-primary {
  background: #0969da;
  color: white;
}

.btn-primary:hover {
  background: #0860ca;
}

.btn-danger {
  background: #d1242f;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-secondary {
  background: #656d76;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}`,
    js: `console.log('计数器组件已加载');`
  },
  
  {
    name: '待办事项列表',
    description: '简单的待办事项管理组件',
    jsx: `import React, { useState } from 'react';

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, { 
        id: Date.now(), 
        text: inputValue, 
        completed: false 
      }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="todo-container">
      <h2>待办事项</h2>
      <div className="todo-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入待办事项..."
        />
        <button onClick={addTodo}>添加</button>
      </div>
      <div className="todo-list">
        {todos.map(todo => (
          <div key={todo.id} className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span className="todo-text">{todo.text}</span>
            <button 
              onClick={() => deleteTodo(todo.id)}
              className="delete-btn"
            >
              删除
            </button>
          </div>
        ))}
        {todos.length === 0 && (
          <p className="empty-message">暂无待办事项</p>
        )}
      </div>
      <div className="todo-stats">
        <p>总计: {todos.length} | 已完成: {todos.filter(t => t.completed).length}</p>
      </div>
    </div>
  );
}

export default TodoList;`,
    css: `.todo-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: #f6f8fa;
  border-radius: 12px;
  border: 1px solid #e1e4e8;
}

.todo-container h2 {
  color: #24292f;
  margin-bottom: 20px;
  text-align: center;
}

.todo-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-input input {
  flex: 1;
  padding: 12px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  font-size: 14px;
}

.todo-input input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.1);
}

.todo-input button {
  padding: 12px 20px;
  background: #0969da;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.todo-input button:hover {
  background: #0860ca;
}

.todo-list {
  margin-bottom: 20px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.todo-item:hover {
  border-color: #0969da;
}

.todo-item.completed {
  opacity: 0.6;
  background: #f0f0f0;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
}

.todo-text {
  flex: 1;
  color: #24292f;
}

.delete-btn {
  padding: 6px 12px;
  background: #d1242f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.delete-btn:hover {
  background: #b91c1c;
}

.empty-message {
  text-align: center;
  color: #656d76;
  font-style: italic;
  padding: 40px 20px;
}

.todo-stats {
  text-align: center;
  color: #656d76;
  font-size: 14px;
  border-top: 1px solid #e1e4e8;
  padding-top: 15px;
}`,
    js: `console.log('待办事项组件已加载');`
  },

  {
    name: '多组件示例',
    description: '展示组件间通信的示例',
    jsx: `// File: Button.tsx
import React from 'react';

function Button({ children, onClick, variant = 'primary' }) {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;

// File: Card.tsx  
import React from 'react';

function Card({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}

export default Card;

// File: App.tsx
import React, { useState } from 'react';
import Button from './Button';
import Card from './Card';

function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('欢迎使用模块化组件!');

  return (
    <div className="app">
      <h1>多组件示例</h1>
      
      <Card title="计数器卡片">
        <p>当前计数: <strong>{count}</strong></p>
        <div className="button-group">
          <Button onClick={() => setCount(count - 1)} variant="danger">
            减少
          </Button>
          <Button onClick={() => setCount(0)} variant="secondary">
            重置
          </Button>
          <Button onClick={() => setCount(count + 1)}>
            增加
          </Button>
        </div>
      </Card>

      <Card title="消息卡片">
        <p>{message}</p>
        <Button 
          onClick={() => setMessage('组件通信成功! 🎉')}
          variant="success"
        >
          更改消息
        </Button>
      </Card>
    </div>
  );
}

export default App;`,
    css: `.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.app h1 {
  text-align: center;
  color: #24292f;
  margin-bottom: 30px;
}

.card {
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  background: #f6f8fa;
  padding: 15px 20px;
  border-bottom: 1px solid #e1e4e8;
}

.card-header h3 {
  margin: 0;
  color: #24292f;
  font-size: 1.2rem;
}

.card-body {
  padding: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #0969da;
  color: white;
}

.btn-primary:hover {
  background: #0860ca;
}

.btn-danger {
  background: #d1242f;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-secondary {
  background: #656d76;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-success {
  background: #1a7f37;
  color: white;
}

.btn-success:hover {
  background: #166f2f;
}`,
    js: `console.log('多组件示例已加载');`
  }
];

export function getTemplate(name: string): Template | undefined {
  return templates.find(template => template.name === name);
}

export function getTemplateNames(): string[] {
  return templates.map(template => template.name);
} 