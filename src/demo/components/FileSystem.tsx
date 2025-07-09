import React, { useState, useCallback } from 'react';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface FileSystemProps {
  files: FileNode[];
  activeFileId?: string;
  onFileSelect: (fileId: string) => void;
  onFileCreate: (parentId: string | null, name: string, type: 'file' | 'folder') => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFolderToggle: (folderId: string) => void;
}

const FileSystem: React.FC<FileSystemProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFolderToggle
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileId: string | null;
    type: 'file' | 'folder' | 'root';
  } | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState<{
    parentId: string | null;
    type: 'file' | 'folder';
  } | null>(null);
  const [createFileName, setCreateFileName] = useState('');

  const handleContextMenu = useCallback((e: React.MouseEvent, fileId: string | null, type: 'file' | 'folder' | 'root') => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId,
      type
    });
  }, []);

  const handleCreateFile = useCallback((type: 'file' | 'folder') => {
    setShowCreateDialog({
      parentId: contextMenu?.fileId || null,
      type: type
    });
    const defaultName = type === 'file' ? 'newFile.tsx' : 'newFolder';
    setCreateFileName(defaultName);
    setContextMenu(null);
  }, [contextMenu]);

  const handleCreateConfirm = useCallback(() => {
    if (createFileName.trim() && showCreateDialog) {
      onFileCreate(showCreateDialog.parentId, createFileName.trim(), showCreateDialog.type);
      setShowCreateDialog(null);
      setCreateFileName('');
    }
  }, [createFileName, showCreateDialog, onFileCreate]);

  const handleCreateCancel = useCallback(() => {
    setShowCreateDialog(null);
    setCreateFileName('');
  }, []);

  const handleDelete = useCallback(() => {
    if (contextMenu?.fileId) {
      onFileDelete(contextMenu.fileId);
      setContextMenu(null);
    }
  }, [contextMenu, onFileDelete]);

  const handleRename = useCallback(() => {
    if (contextMenu?.fileId) {
      // 找到要重命名的文件，获取其当前名称
      const findNodeName = (nodes: FileNode[], id: string): string => {
        for (const node of nodes) {
          if (node.id === id) return node.name;
          if (node.children) {
            const found = findNodeName(node.children, id);
            if (found) return found;
          }
        }
        return '';
      };
      
      const currentName = findNodeName(files, contextMenu.fileId);
      setNewFileName(currentName);
      setRenamingFileId(contextMenu.fileId);
      setContextMenu(null);
    }
  }, [contextMenu, files]);

  const handleRenameSubmit = useCallback((fileId: string) => {
    if (newFileName.trim()) {
      onFileRename(fileId, newFileName.trim());
    }
    setRenamingFileId(null);
    setNewFileName('');
  }, [newFileName, onFileRename]);

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'folder') {
      return node.isOpen ? '📂' : '📁';
    }
    const ext = node.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx': return '⚛️';
      case 'ts':
      case 'js': return '📄';
      case 'css': return '🎨';
      case 'json': return '📋';
      default: return '📄';
    }
  };

  const renderFileNode = (node: FileNode, level = 0) => {
    const isActive = node.id === activeFileId;
    const isRenaming = node.id === renamingFileId;

    return (
      <div key={node.id}>
        <div
          style={{
            ...styles.fileItem,
            paddingLeft: `${level * 20 + 8}px`,
            backgroundColor: isActive ? '#e3f2fd' : 'transparent',
            borderLeft: isActive ? '3px solid #2196f3' : '3px solid transparent',
          }}
          onClick={() => {
            if (node.type === 'folder') {
              onFolderToggle(node.id);
            } else {
              onFileSelect(node.id);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node.id, node.type)}
        >
          <span style={styles.fileIcon}>{getFileIcon(node)}</span>
          {isRenaming ? (
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => handleRenameSubmit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit(node.id);
                } else if (e.key === 'Escape') {
                  setRenamingFileId(null);
                  setNewFileName('');
                }
              }}
              style={styles.renameInput}
              autoFocus
            />
          ) : (
            <span style={styles.fileName}>{node.name}</span>
          )}
        </div>
        {node.type === 'folder' && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const styles = {
    fileSystem: {
      width: '250px',
      height: '100%',
      background: '#f8f9fa',
      borderRight: '1px solid #e1e4e8',
      overflow: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      padding: '12px',
      borderBottom: '1px solid #e1e4e8',
      background: '#ffffff',
      fontWeight: 600,
      fontSize: '14px',
      color: '#24292f',
    },
    fileList: {
      padding: '8px 0',
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '6px 8px',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#24292f',
      transition: 'background-color 0.2s',
      userSelect: 'none' as const,
    },
    fileIcon: {
      marginRight: '8px',
      fontSize: '16px',
    },
    fileName: {
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    renameInput: {
      flex: 1,
      border: '1px solid #2196f3',
      borderRadius: '4px',
      padding: '2px 4px',
      fontSize: '14px',
      outline: 'none',
    },
    contextMenu: {
      position: 'fixed' as const,
      background: '#ffffff',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      minWidth: '150px',
    },
    contextMenuItem: {
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '14px',
      borderBottom: '1px solid #f6f8fa',
      transition: 'background-color 0.2s',
    },
    createDialog: {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#ffffff',
      border: '1px solid #e1e4e8',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      zIndex: 1001,
      padding: '20px',
      minWidth: '300px',
    },
    createDialogTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#24292f',
      marginBottom: '16px',
    },
    createDialogInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      fontSize: '14px',
      marginBottom: '16px',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    createDialogButtons: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
    },
    createDialogButton: {
      padding: '8px 16px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
    },
    createDialogPrimaryButton: {
      background: '#0969da',
      color: '#ffffff',
      borderColor: '#0969da',
    },
  };

  return (
    <>
      <div style={styles.fileSystem}>
        <div style={styles.header}>
          文件资源管理器
        </div>
        <div 
          style={styles.fileList}
          onContextMenu={(e) => handleContextMenu(e, null, 'root')}
        >
          {files.map(file => renderFileNode(file))}
        </div>
      </div>

      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              ...styles.contextMenu,
              top: contextMenu.y,
              left: contextMenu.x,
            }}
          >
            <div
              style={styles.contextMenuItem}
              onClick={() => handleCreateFile('file')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f6f8fa'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              📄 新建文件
            </div>
            <div
              style={styles.contextMenuItem}
              onClick={() => handleCreateFile('folder')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f6f8fa'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              📁 新建文件夹
            </div>
            {contextMenu.type !== 'root' && (
              <>
                <div
                  style={styles.contextMenuItem}
                  onClick={handleRename}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f6f8fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✏️ 重命名
                </div>
                <div
                  style={{
                    ...styles.contextMenuItem,
                    color: '#d73a49',
                    borderBottom: 'none',
                  }}
                  onClick={handleDelete}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffeef0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  🗑️ 删除
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showCreateDialog && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
            }}
            onClick={handleCreateCancel}
          />
          <div style={styles.createDialog}>
            <div style={styles.createDialogTitle}>
              新建{showCreateDialog.type === 'file' ? '文件' : '文件夹'}
            </div>
            <input
              type="text"
              value={createFileName}
              onChange={(e) => setCreateFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateConfirm();
                } else if (e.key === 'Escape') {
                  handleCreateCancel();
                }
              }}
              style={styles.createDialogInput}
              placeholder={`请输入${showCreateDialog.type === 'file' ? '文件' : '文件夹'}名称`}
              autoFocus
            />
            <div style={styles.createDialogButtons}>
              <button
                style={styles.createDialogButton}
                onClick={handleCreateCancel}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f6f8fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                取消
              </button>
              <button
                style={{
                  ...styles.createDialogButton,
                  ...styles.createDialogPrimaryButton,
                }}
                onClick={handleCreateConfirm}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0860ca';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0969da';
                }}
              >
                创建
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FileSystem; 