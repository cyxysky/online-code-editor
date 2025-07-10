import React, { useState, useCallback, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import { AdvancedPreview } from './components/AdvancedPreview';
import FileSystem, { FileNode } from './components/FileSystem';
import { FileInfo, CompilationStrategy } from './components/CompilerStrategy';

// 默认的示例文件
const DEFAULT_FILES: FileNode[] = [
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
      
      <div className="message-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="修改消息..."
        />
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
}`
  }
];

const App: React.FC = () => {
  
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('app');
  const [compilationStrategy, setCompilationStrategy] = useState<CompilationStrategy>(CompilationStrategy.FRONTEND);
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
    main: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 2fr 3fr',
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
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.title}>
          <span style={styles.logo}>⚛️</span>
          <span>React 在线编辑器 Pro</span>
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
            strategy={compilationStrategy}
          />
        </div>
      </main>
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