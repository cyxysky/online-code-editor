import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { CompilerStrategy, CompilationStrategy, CompilationResult, FileInfo, Dependency } from './CompilerStrategy';

interface AdvancedPreviewProps {
  files: FileInfo[];
  dependencies: Dependency[];
  strategy?: CompilationStrategy;
  onForceCompile?: () => void; // 新增强制编译回调
}

export const AdvancedPreview = forwardRef<
  { forceCompile: () => void },
  AdvancedPreviewProps
>(({ files, dependencies, strategy, onForceCompile }, ref) => {
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string>('');
  const compilerRef = useRef<{ forceCompile: () => void } | null>(null);

  // 生成预览HTML - 使用用户的index.html作为模板
  const generatePreviewHTML = useCallback((bundleCode: string, cssCode?: string): string => {
    // 查找用户的index.html文件
    const indexHtmlFile = files.find(file => file.name === 'index.html');
    
    if (!indexHtmlFile || !indexHtmlFile.content) {
      console.warn('⚠️ 未找到index.html文件，使用默认模板');
      // 如果没有index.html，使用默认模板
      return generateFallbackHTML(bundleCode, cssCode);
    }
    
    console.log('📄 使用用户的index.html作为预览模板');
    let htmlContent = indexHtmlFile.content;
    
    // 注入编译后的JavaScript代码
    const scriptInjection = `
    <script>
        console.log('🚀 预览页面开始初始化');
        
        // 错误处理
        window.onerror = function(message, source, lineno, colno, error) {
            console.error('Runtime Error:', error);
            showError('运行时错误', error ? error.stack : message);
            return true;
        };
        
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled Promise Rejection:', event.reason);
            showError('Promise 错误', event.reason.toString());
        });
        
        function showError(title, stack) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = 
                '<div style="background:#fee;border:1px solid #fcc;border-radius:8px;padding:16px;margin:16px;color:#c33;">' +
                    '<div style="font-weight:bold;margin-bottom:8px;">' + title + '</div>' +
                    '<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:8px;border-radius:4px;margin-top:8px;overflow-x:auto;">' + stack + '</pre>' +
                '</div>';
            document.body.appendChild(errorDiv);
        }
        
        // 等待DOM加载完成后执行
        function initApp() {
            try {
                console.log('🔄 开始执行编译代码...');
                // 执行编译后的代码
                ${bundleCode}
                
                console.log('✅ 代码执行完成');
                
                // 兼容旧模式：如果有__EntryComponent，则渲染React组件
                if (window.__EntryComponent) {
                    console.log('🎨 检测到React组件模式，开始渲染...');
                    const container = document.getElementById('app');
                    if (container && window.React && window.ReactDOM) {
                        const element = window.React.createElement(window.__EntryComponent);
                        if (window.ReactDOM.createRoot) {
                            const root = window.ReactDOM.createRoot(container);
                            root.render(element);
                        } else {
                            window.ReactDOM.render(element, container);
                        }
                        console.log('✅ React组件渲染成功');
                    }
                }
            } catch (error) {
                console.error('❌ 执行错误:', error);
                showError('执行错误', error.stack || error.message);
            }
        }
        
        // 页面加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
        } else {
            initApp();
        }
    </script>`;
    
    // 注入JavaScript代码到页面末尾
    if (htmlContent.includes('<!-- AUTO_INJECT_MAIN_JS -->')) {
      htmlContent = htmlContent.replace('<!-- AUTO_INJECT_MAIN_JS -->', scriptInjection);
    } else {
      // 如果没有注入标记，插入到body结束标签前
      htmlContent = htmlContent.replace('</body>', scriptInjection + '\n</body>');
    }
    
    // 如果用户有额外的CSS，注入到head中
    if (cssCode) {
      const cssInjection = `<style>${cssCode}</style>`;
      htmlContent = htmlContent.replace('</head>', cssInjection + '\n</head>');
    }
    
    return htmlContent;
  }, [files]);

  // 默认HTML模板（当没有index.html时使用）
  const generateFallbackHTML = useCallback((bundleCode: string, cssCode?: string): string => {
    const dependencyScripts = dependencies
      .filter(dep => dep.isInstalled && dep.cdnUrl)
      .map(dep => `<script crossorigin src="${dep.cdnUrl}"></script>`)
      .join('\n    ');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>前端预览</title>
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
        ${cssCode || ''}
    </style>
    ${dependencyScripts}
</head>
<body>
    <div id="app">
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: #666;">
            正在加载应用...
        </div>
    </div>
    
    <script>
        // 执行编译后的代码
        ${bundleCode}
    </script>
</body>
</html>`;
  }, [dependencies]);

  // 创建预览URL
  const createPreviewUrl = useCallback((compilationResult: CompilationResult) => {
    // 清理之前的blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    if (!compilationResult.success || !compilationResult.bundleCode) {
      setError(compilationResult.error || '编译失败');
      return;
    }

    try {
      // 提取CSS代码
      const cssFile = files.find(file => file.language === 'css');
      const cssCode = cssFile?.content || '';

      // 生成HTML
      const html = generatePreviewHTML(
        compilationResult.bundleCode,
        cssCode
      );

      // 创建blob URL
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      blobUrlRef.current = url;
      setPreviewUrl(url);
      setError(null);
    } catch (err: any) {
      setError(`预览生成失败: ${err.message}`);
    }
  }, [files, generatePreviewHTML]);

  // 处理编译完成
  const handleCompilationComplete = useCallback((result: CompilationResult) => {
    setCompilationResult(result);
    setIsLoading(false);

    if (result.success) {
      createPreviewUrl(result);
    } else {
      setError(result.error || '编译失败');
    }
  }, [createPreviewUrl]);

  // 刷新预览
  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  // 在新窗口打开
  const openInNewWindow = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  }, [previewUrl]);

  // 强制编译
  const forceCompile = useCallback(() => {
    if (compilerRef.current) {
      compilerRef.current.forceCompile();
    }
  }, []);

  // 暴露强制编译方法给父组件
  useImperativeHandle(ref, () => ({
    forceCompile
  }), [forceCompile]);

  // 清理blob URL
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      background: '#fff',
      border: '1px solid #e1e4e8',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#f8f9fa',
      borderBottom: '1px solid #e1e4e8',
    },
    title: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#24292f',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    actions: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      padding: '6px 12px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      background: '#fff',
      fontSize: '12px',
      cursor: 'pointer',
      color: '#24292f',
      transition: 'all 0.2s',
    },
    strategyBadge: {
      padding: '2px 6px',
      borderRadius: '10px',
      fontSize: '10px',
      fontWeight: 'bold',
      color: 'white',
      background: '#2196f3',
    },
    previewArea: {
      flex: 1,
      position: 'relative' as const,
      background: '#fff',
    },
    iframe: {
      width: '100%',
      height: '100%',
      border: 'none',
      background: '#fff',
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#586069',
      fontSize: '14px',
    },
    error: {
      padding: '20px',
      color: '#d73a49',
      background: '#ffeaea',
      border: '1px solid #fdb8c0',
      borderRadius: '8px',
      margin: '20px',
      fontSize: '14px',
      lineHeight: 1.5,
    },
    errorTitle: {
      fontWeight: 'bold',
      marginBottom: '8px',
    },
    noFiles: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#586069',
      fontSize: '14px',
      flexDirection: 'column' as const,
      gap: '8px',
    },
  };

  if (files.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>
            📱 预览
          </div>
        </div>
        <div style={styles.noFiles}>
          <div>📄</div>
          <div>请添加文件开始编码</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          📱 预览
          {compilationResult && (
            <span style={styles.strategyBadge}>
              {getStrategyDisplayName(compilationResult.strategy)}
            </span>
          )}
        </div>
        <div style={styles.actions}>
          <button
            style={styles.actionButton}
            onClick={refreshPreview}
            disabled={!previewUrl}
            title="刷新预览"
          >
            🔄 刷新
          </button>
          <button
            style={styles.actionButton}
            onClick={openInNewWindow}
            disabled={!previewUrl}
            title="在新窗口中打开"
          >
            🔗 新窗口
          </button>
        </div>
      </div>

      <div style={styles.previewArea}>
        {isLoading ? (
          <div style={styles.loading}>
            <div>🔄 编译中...</div>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <div style={styles.errorTitle}>❌ 预览错误</div>
            <div>{error}</div>
          </div>
        ) : previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={styles.iframe}
            title="预览"
            sandbox="allow-scripts allow-same-origin allow-downloads"
            onLoad={() => {
              console.log('预览加载完成');
            }}
          />
        ) : (
          <div style={styles.loading}>
            <div>等待编译...</div>
          </div>
        )}
      </div>

      {/* 编译策略组件 */}
      <CompilerStrategy
        ref={compilerRef}
        files={files}
        dependencies={dependencies}
        onCompilationComplete={handleCompilationComplete}
        preferredStrategy={strategy}
      />
    </div>
  );
});

// 辅助函数
function getStrategyDisplayName(strategy: CompilationStrategy): string {
  switch (strategy) {
    case CompilationStrategy.FRONTEND:
      return '前端';
    case CompilationStrategy.BACKEND:
      return '后端';
    case CompilationStrategy.WEBCONTAINER:
      return 'WC';
    default:
      return '未知';
  }
}

export default AdvancedPreview; 