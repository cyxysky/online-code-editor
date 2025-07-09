import React, { useState, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import PreviewFrame from './components/PreviewFrame';
import FileSystem, { FileNode } from './components/FileSystem';
import { templates } from './components/Templates';

const App = () => {
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showPreview, setShowPreview] = useState(true);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<Set<string>>(new Set());

  // 初始化文件系统
  useEffect(() => {
    const initialFiles: FileNode[] = [
      {
        id: 'index-html',
        name: 'index.html',
        type: 'file',
        content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React 应用</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
      },
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'main',
            name: 'main.tsx',
            type: 'file',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
          },
          {
            id: 'app',
            name: 'App.tsx',
            type: 'file',
            content: `import React, { useState } from 'react';
import Counter from './components/Counter';

function App() {
  const [message, setMessage] = useState('Hello React! 👋');

  return (
    <div className="app">
      <header className="app-header">
        <h1>{message}</h1>
        <p>欢迎使用 React 在线代码编辑器！</p>
        <button 
          className="btn-primary" 
          onClick={() => setMessage('React 真棒！🚀')}
        >
          点击改变消息
        </button>
      </header>
      
      <main className="app-main">
        <Counter />
      </main>
      
      <footer className="app-footer">
        <p>在左侧编辑器中修改代码，查看实时预览效果</p>
      </footer>
    </div>
  );
}

export default App;`,
          },
          {
            id: 'styles',
            name: 'styles.css',
            type: 'file',
            content: `/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  margin-bottom: 30px;
}

.app-header h1 {
  font-size: 2.5rem;
  color: #2d3748;
  margin-bottom: 10px;
  font-weight: 700;
}

.app-header p {
  font-size: 1.1rem;
  color: #4a5568;
  margin-bottom: 25px;
}

.btn-primary {
  background: linear-gradient(45deg, #0969da, #2196f3);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(9, 105, 218, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(9, 105, 218, 0.4);
}

.app-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 30px;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}`,
          },
          {
            id: 'components',
            name: 'components',
            type: 'folder',
            isOpen: true,
            children: [
              {
                id: 'counter',
                name: 'Counter.tsx',
                type: 'file',
                content: `import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);

  return (
    <div className="counter">
      <h2>计数器组件</h2>
      <div className="counter-display">
        <span className="count-value">{count}</span>
      </div>
      <div className="counter-buttons">
        <button onClick={decrement} className="btn-danger">
          −
        </button>
        <button onClick={reset} className="btn-secondary">
          重置
        </button>
        <button onClick={increment} className="btn-success">
          +
        </button>
      </div>
      <style jsx>{\`
        .counter {
          background: rgba(255, 255, 255, 0.95);
          padding: 30px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          min-width: 320px;
        }

        .counter h2 {
          color: #2d3748;
          margin-bottom: 25px;
          font-size: 1.5rem;
        }

        .counter-display {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .count-value {
          font-size: 3rem;
          font-weight: bold;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .counter-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .counter-buttons button {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          font-weight: 600;
          transition: all 0.3s ease;
          min-width: 60px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .btn-success {
          background: linear-gradient(45deg, #48bb78, #38a169);
          color: white;
        }

        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(72, 187, 120, 0.4);
        }

        .btn-danger {
          background: linear-gradient(45deg, #f56565, #e53e3e);
          color: white;
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 101, 101, 0.4);
        }

        .btn-secondary {
          background: linear-gradient(45deg, #a0aec0, #718096);
          color: white;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(160, 174, 192, 0.4);
        }
      \`}</style>
    </div>
  );
}

export default Counter;`,
              },
            ],
          },
        ],
      },
    ];

    setFiles(initialFiles);
    setActiveFileId('app');
    setOpenFiles(new Set(['app']));
  }, []);

  // 查找文件
  const findFile = (files: FileNode[], id: string): FileNode | null => {
    for (const file of files) {
      if (file.id === id) return file;
      if (file.children) {
        const found = findFile(file.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 更新文件内容
  const updateFileContent = (files: FileNode[], id: string, content: string): FileNode[] => {
    return files.map(file => {
      if (file.id === id) {
        return { ...file, content };
      }
      if (file.children) {
        return { ...file, children: updateFileContent(file.children, id, content) };
      }
      return file;
    });
  };

  // 删除文件
  const deleteFile = (files: FileNode[], id: string): FileNode[] => {
    return files.filter(file => {
      if (file.id === id) return false;
      if (file.children) {
        file.children = deleteFile(file.children, id);
      }
      return true;
    });
  };

  // 重命名文件
  const renameFile = (files: FileNode[], id: string, newName: string): FileNode[] => {
    return files.map(file => {
      if (file.id === id) {
        return { ...file, name: newName };
      }
      if (file.children) {
        return { ...file, children: renameFile(file.children, id, newName) };
      }
      return file;
    });
  };

  // 添加文件
  const addFile = (files: FileNode[], parentId: string | null, name: string, type: 'file' | 'folder'): FileNode[] => {
    const newFile: FileNode = {
      id: `file_${Date.now()}`,
      name,
      type,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      isOpen: type === 'folder' ? false : undefined,
    };

    if (parentId === null) {
      return [...files, newFile];
    }

    return files.map(file => {
      if (file.id === parentId && file.type === 'folder') {
        return {
          ...file,
          children: [...(file.children || []), newFile],
        };
      }
      if (file.children) {
        return {
          ...file,
          children: addFile(file.children, parentId, name, type),
        };
      }
      return file;
    });
  };

  // 切换文件夹
  const toggleFolder = (files: FileNode[], id: string): FileNode[] => {
    return files.map(file => {
      if (file.id === id && file.type === 'folder') {
        return { ...file, isOpen: !file.isOpen };
      }
      if (file.children) {
        return { ...file, children: toggleFolder(file.children, id) };
      }
      return file;
    });
  };

  // 获取当前文件内容
  const getCurrentFileContent = (): string => {
    const currentFile = findFile(files, activeFileId);
    return currentFile?.content || '';
  };

  // 获取当前文件语言
  const getCurrentFileLanguage = (): 'jsx' | 'css' | 'javascript' => {
    const currentFile = findFile(files, activeFileId);
    if (!currentFile) return 'jsx';
    
    const ext = currentFile.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'css': return 'css';
      case 'js': return 'javascript';
      case 'jsx':
      case 'tsx':
      default: return 'jsx';
    }
  };

  // 处理文件选择
  const handleFileSelect = (fileId: string) => {
    const file = findFile(files, fileId);
    if (file && file.type === 'file') {
      setActiveFileId(fileId);
      setOpenFiles(prev => new Set([...prev, fileId]));
    }
  };

  // 处理文件创建
  const handleFileCreate = (parentId: string | null, name: string, type: 'file' | 'folder') => {
    setFiles(prev => addFile(prev, parentId, name, type));
  };

  // 处理文件删除
  const handleFileDelete = (fileId: string) => {
    setFiles(prev => deleteFile(prev, fileId));
    setOpenFiles(prev => {
      const newOpenFiles = new Set(prev);
      newOpenFiles.delete(fileId);
      return newOpenFiles;
    });
    
    // 如果删除的是当前文件，切换到其他文件
    if (fileId === activeFileId) {
      const remainingFiles = Array.from(openFiles).filter(id => id !== fileId);
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0]);
      } else {
        setActiveFileId('');
      }
    }
  };

  // 处理文件重命名
  const handleFileRename = (fileId: string, newName: string) => {
    setFiles(prev => renameFile(prev, fileId, newName));
  };

  // 处理文件夹切换
  const handleFolderToggle = (folderId: string) => {
    setFiles(prev => toggleFolder(prev, folderId));
  };

  // 处理代码变化
  const handleCodeChange = (value: string) => {
    setFiles(prev => updateFileContent(prev, activeFileId, value));
  };

  // 导出项目
  const exportProject = () => {
    const exportData = {
      files,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'react-project.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入项目
  const importProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.files) {
            setFiles(data.files);
            setActiveFileId('');
            setOpenFiles(new Set());
          }
        } catch (error) {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    }
  };

  // 获取预览代码
  const getPreviewCode = () => {
    const allFiles = getAllFiles(files);
    const jsxFiles = allFiles.filter(file => 
      (file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) && 
      file.content && file.content.trim()
    );
    
    const cssFiles = allFiles.filter(file => file.name.endsWith('.css'));
    
    // 构建模块映射
    const modules = jsxFiles.map(file => ({
      id: file.id,
      name: file.name,
      path: getFileRelativePath(file.id),
      content: file.content || ''
    }));
    
    return {
      modules,
      css: cssFiles.map(file => file.content || '').join('\n\n'),
    };
  };

  // 获取文件的相对路径
  const getFileRelativePath = (fileId: string): string => {
    const buildPath = (files: FileNode[], id: string, currentPath: string = ''): string => {
      for (const file of files) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        if (file.id === id) return filePath;
        if (file.children) {
          const found = buildPath(file.children, id, filePath);
          if (found) return found;
        }
      }
      return '';
    };
    
    return buildPath(files, fileId);
  };

  // 获取所有文件（扁平化）
  const getAllFiles = (files: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    for (const file of files) {
      if (file.type === 'file') {
        result.push(file);
      }
      if (file.children) {
        result.push(...getAllFiles(file.children));
      }
    }
    return result;
  };

  // 获取打开的文件标签
  const getOpenFileTabs = () => {
    return Array.from(openFiles).map(fileId => {
      const file = findFile(files, fileId);
      return file;
    }).filter(Boolean) as FileNode[];
  };

  const styles = {
    app: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#ffffff',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      background: '#f6f8fa',
      borderBottom: '1px solid #e1e4e8',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#24292f',
      margin: 0,
    },
    controls: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    button: {
      padding: '6px 12px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      background: '#ffffff',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#24292f',
      transition: 'all 0.2s',
    },
    activeButton: {
      background: '#0969da',
      color: '#ffffff',
      borderColor: '#0969da',
    },
    fileInput: {
      display: 'none',
    },
    main: {
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
    },
    editorSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    tabBar: {
      display: 'flex',
      background: '#f6f8fa',
      borderBottom: '1px solid #e1e4e8',
      overflow: 'auto',
    },
    tab: {
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#24292f',
      borderRight: '1px solid #e1e4e8',
      whiteSpace: 'nowrap' as const,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    activeTab: {
      background: '#ffffff',
      borderBottom: '2px solid #0969da',
    },
    tabCloseBtn: {
      padding: '2px',
      borderRadius: '3px',
      cursor: 'pointer',
      color: '#656d76',
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: layout === 'vertical' ? 'column' : 'row',
      overflow: 'hidden',
    } as React.CSSProperties,
    editorContainer: {
      flex: 1,
      overflow: 'hidden',
    },
    previewContainer: {
      flex: 1,
      overflow: 'hidden',
      borderLeft: layout === 'horizontal' ? '1px solid #e1e4e8' : 'none',
      borderTop: layout === 'vertical' ? '1px solid #e1e4e8' : 'none',
    },
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.title}>React 在线代码编辑器</h1>
        <div style={styles.controls}>
          <button
            style={{
              ...styles.button,
              ...(layout === 'horizontal' ? styles.activeButton : {}),
            }}
            onClick={() => setLayout('horizontal')}
          >
            水平布局
          </button>
          <button
            style={{
              ...styles.button,
              ...(layout === 'vertical' ? styles.activeButton : {}),
            }}
            onClick={() => setLayout('vertical')}
          >
            垂直布局
          </button>
          <button
            style={{
              ...styles.button,
              ...(showPreview ? styles.activeButton : {}),
            }}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '隐藏预览' : '显示预览'}
          </button>
          <button style={styles.button} onClick={exportProject}>
            导出项目
          </button>
          <label style={styles.button}>
            导入项目
            <input
              type="file"
              accept=".json"
              onChange={importProject}
              style={styles.fileInput}
            />
          </label>
        </div>
      </div>

      <div style={styles.main}>
        <FileSystem
          files={files}
          activeFileId={activeFileId}
          onFileSelect={handleFileSelect}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          onFileRename={handleFileRename}
          onFolderToggle={handleFolderToggle}
        />

        <div style={styles.editorSection}>
          <div style={styles.tabBar}>
            {getOpenFileTabs().map(file => (
              <div
                key={file.id}
                style={{
                  ...styles.tab,
                  ...(file.id === activeFileId ? styles.activeTab : {}),
                }}
                onClick={() => setActiveFileId(file.id)}
              >
                <span>{file.name}</span>
                <span
                  style={styles.tabCloseBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOpenFiles = new Set(openFiles);
                    newOpenFiles.delete(file.id);
                    setOpenFiles(newOpenFiles);
                    
                    if (file.id === activeFileId) {
                      const remainingFiles = Array.from(newOpenFiles);
                      if (remainingFiles.length > 0) {
                        setActiveFileId(remainingFiles[0]);
                      } else {
                        setActiveFileId('');
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  ×
                </span>
              </div>
            ))}
          </div>

          <div style={styles.content}>
            <div style={styles.editorContainer}>
              {activeFileId && (
                <CodeEditor
                  key={activeFileId} // 添加key确保组件重新创建
                  value={getCurrentFileContent()}
                  language={getCurrentFileLanguage()}
                  onChange={handleCodeChange}
                  placeholder="请开始编写代码..."
                  fileId={activeFileId} // 传递文件ID
                />
              )}
            </div>

            {showPreview && (
              <div style={styles.previewContainer}>
                <PreviewFrame
                  jsxCode={getPreviewCode().modules.map(mod => 
                    `// File: ${mod.name}\n${mod.content}`
                  ).join('\n\n')}
                  cssCode={getPreviewCode().css}
                  jsCode=""
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 