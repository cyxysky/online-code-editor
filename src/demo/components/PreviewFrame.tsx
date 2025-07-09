import React, { useState, useEffect, useRef } from 'react';

interface PreviewFrameProps {
  jsxCode: string;
  cssCode: string;
  jsCode: string;
}

// 模块信息接口
interface ModuleInfo {
  id: string;
  name: string;
  content: string;
  blobUrl?: string;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({
  jsxCode,
  cssCode,
  jsCode
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleUrls, setModuleUrls] = useState<string[]>([]);

  // 解析文件内容为模块
  const parseModules = (combinedCode: string): ModuleInfo[] => {
    if (!combinedCode.trim()) return [];

    // 按 "// File:" 分割文件
    const fileBlocks = combinedCode.split(/\/\/ File: /).filter(block => block.trim());
    
    return fileBlocks.map((fileBlock, index) => {
      const lines = fileBlock.split('\n');
      const fileName = lines[0] || `module${index}.tsx`;
      const content = lines.slice(1).join('\n').trim();
      
      return {
        id: `module_${index}`,
        name: fileName,
        content
      };
    });
  };

  // 处理模块内容，确保正确的import/export
  const processModuleContent = (content: string, fileName: string): string => {
    let processed = content;

    // 如果没有export，自动添加default export
    const hasExport = /export\s+(default\s+)?/.test(processed);
    const hasFunction = /function\s+\w+/.test(processed);
    const hasComponent = /const\s+\w+\s*=\s*\([^)]*\)\s*=>/.test(processed);

    if (!hasExport && (hasFunction || hasComponent)) {
      // 查找组件名
      const functionMatch = processed.match(/function\s+(\w+)/);
      const componentMatch = processed.match(/const\s+(\w+)\s*=/);
      
      const componentName = functionMatch?.[1] || componentMatch?.[1];
      if (componentName) {
        processed += `\n\nexport default ${componentName};`;
      }
    }

    // 处理React import
    if (!processed.includes('import React') && processed.includes('React')) {
      processed = `import React from 'react';\n${processed}`;
    }

    // 处理相对路径import（简化处理）
    processed = processed.replace(
      /import\s+([^'"]+)\s+from\s+['"]\.\/([^'"]+)['"]/g,
      (match, imports, path) => {
        // 移除文件扩展名
        const moduleName = path.replace(/\.(tsx?|jsx?)$/, '');
        return `import ${imports} from './${moduleName}'`;
      }
    );

    return processed;
  };

  // 创建模块Blob URL
  const createModuleBlob = (content: string): string => {
    const blob = new Blob([content], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  };

  // 构建模块系统
  const buildModuleSystem = (modules: ModuleInfo[]): string => {
    if (modules.length === 0) return '';

    // 构建模块映射
    const moduleMap = new Map<string, string>();
    
    modules.forEach(module => {
      const processedContent = processModuleContent(module.content, module.name);
      
      // 模块名映射（去掉扩展名）
      const moduleName = module.name.replace(/\.(tsx?|jsx?)$/, '');
      moduleMap.set(moduleName, processedContent);
      moduleMap.set(`./${moduleName}`, processedContent);
    });

    // 创建模块加载器（使用字符串拼接）
    const moduleMapJson = JSON.stringify(Array.from(moduleMap.entries()));
    
    const moduleLoader = 
      '// ES6 模块系统与JSX支持\n' +
      'const moduleMap = new Map(' + moduleMapJson + ');\n' +
      'const compiledModules = new Map();\n\n' +
      
      '// 使用Babel转换JSX\n' +
      'const compileModule = (code, moduleName) => {\n' +
      '  try {\n' +
      '    console.log("Compiling module:", moduleName);\n' +
      '    \n' +
      '    // 预处理import语句\n' +
      '    let processedCode = code;\n' +
      '    \n' +
      '    // 替换React导入\n' +
      '    processedCode = processedCode.replace(\n' +
      '      /import\\s+React\\s+from\\s+[\'"]react[\'"];?\\s*/g,\n' +
      '      "const React = window.React;\\n"\n' +
      '    );\n' +
      '    \n' +
      '    // 替换React hooks导入\n' +
      '    processedCode = processedCode.replace(\n' +
      '      /import\\s+\\{\\s*([^}]+)\\s*\\}\\s+from\\s+[\'"]react[\'"];?\\s*/g,\n' +
      '      function(match, hooks) {\n' +
      '        const hookList = hooks.split(",").map(function(h) { return h.trim(); });\n' +
      '        return hookList.map(function(hook) {\n' +
      '          return "const " + hook + " = React." + hook + ";";\n' +
      '        }).join("\\n") + "\\n";\n' +
      '      }\n' +
      '    );\n' +
      '    \n' +
      '    // 替换相对路径导入\n' +
      '    processedCode = processedCode.replace(\n' +
      '      /import\\s+(\\w+)\\s+from\\s+[\'"]\\.\\/([^\'"]+)[\'"];?\\s*/g,\n' +
      '      function(match, varName, modulePath) {\n' +
      '        const cleanModulePath = modulePath.replace(/\\.(tsx?|jsx?)$/, "");\n' +
      '        return "const " + varName + " = getModule(\\"./" + cleanModulePath + "\\");\\n";\n' +
      '      }\n' +
      '    );\n' +
      '    \n' +
      '    // 替换export default\n' +
      '    processedCode = processedCode.replace(\n' +
      '      /export\\s+default\\s+(\\w+);?\\s*$/,\n' +
      '      function(match, componentName) {\n' +
      '        return "module.exports.default = " + componentName + "; module.exports = " + componentName + ";";\n' +
      '      }\n' +
      '    );\n' +
      '    \n' +
      '    console.log("Processed code for", moduleName, ":", processedCode.substring(0, 200) + "...");\n' +
      '    \n' +
      '    // 使用Babel转换JSX\n' +
      '    const compiled = Babel.transform(processedCode, {\n' +
      '      presets: ["react"],\n' +
      '      plugins: []\n' +
      '    }).code;\n' +
      '    \n' +
      '    console.log("Compiled successfully:", moduleName);\n' +
      '    return compiled;\n' +
      '  } catch (error) {\n' +
      '    console.error("Babel compilation error for", moduleName, ":", error);\n' +
      '    throw new Error("Failed to compile " + moduleName + ": " + error.message);\n' +
      '  }\n' +
      '};\n\n' +
      
      '// 模块获取函数\n' +
      'const getModule = (moduleName) => {\n' +
      '  console.log("Getting module:", moduleName);\n' +
      '  \n' +
      '  if (compiledModules.has(moduleName)) {\n' +
      '    return compiledModules.get(moduleName);\n' +
      '  }\n' +
      '  \n' +
      '  if (!moduleMap.has(moduleName)) {\n' +
      '    throw new Error("Module not found: " + moduleName);\n' +
      '  }\n' +
      '  \n' +
      '  const sourceCode = moduleMap.get(moduleName);\n' +
      '  const compiledCode = compileModule(sourceCode, moduleName);\n' +
      '  \n' +
      '  // 执行编译后的代码并获取exports\n' +
      '  const moduleExports = {};\n' +
      '  const moduleScope = {\n' +
      '    React: window.React,\n' +
      '    useState: React.useState,\n' +
      '    useEffect: React.useEffect,\n' +
      '    useRef: React.useRef,\n' +
      '    useCallback: React.useCallback,\n' +
      '    useMemo: React.useMemo,\n' +
      '    useContext: React.useContext,\n' +
      '    exports: moduleExports,\n' +
      '    module: { exports: moduleExports },\n' +
      '    getModule: getModule,\n' +
      '    console: console\n' +
      '  };\n' +
      '  \n' +
      '  try {\n' +
      '    // 创建函数作用域来执行模块代码\n' +
      '    const moduleFunction = new Function(\n' +
      '      "React", "useState", "useEffect", "useRef", "useCallback", "useMemo", "useContext",\n' +
      '      "exports", "module", "getModule", "console",\n' +
      '      compiledCode + "; return typeof module.exports.default !== \\"undefined\\" ? module.exports.default : module.exports;"\n' +
      '    );\n' +
      '    \n' +
      '    const result = moduleFunction(\n' +
      '      moduleScope.React,\n' +
      '      moduleScope.useState,\n' +
      '      moduleScope.useEffect,\n' +
      '      moduleScope.useRef,\n' +
      '      moduleScope.useCallback,\n' +
      '      moduleScope.useMemo,\n' +
      '      moduleScope.useContext,\n' +
      '      moduleScope.exports,\n' +
      '      moduleScope.module,\n' +
      '      moduleScope.getModule,\n' +
      '      moduleScope.console\n' +
      '    );\n' +
      '    \n' +
      '    compiledModules.set(moduleName, result);\n' +
      '    console.log("Module loaded successfully:", moduleName, typeof result);\n' +
      '    return result;\n' +
      '    \n' +
      '  } catch (error) {\n' +
      '    console.error("Module execution error for", moduleName, ":", error);\n' +
      '    throw new Error("Failed to execute " + moduleName + ": " + error.message);\n' +
      '  }\n' +
      '};\n\n' +
      
      '// 启动应用\n' +
      'async function startApp() {\n' +
      '  try {\n' +
      '    console.log("Available modules:", Array.from(moduleMap.keys()));\n' +
      '    \n' +
      '    // 查找主模块（通常是App或main）\n' +
      '    const mainModuleCandidates = ["./App", "./main", "./index", "App", "main", "index"];\n' +
      '    let mainModule = null;\n' +
      '    let mainModuleName = "";\n' +
      '    \n' +
      '    for (const candidate of mainModuleCandidates) {\n' +
      '      if (moduleMap.has(candidate)) {\n' +
      '        console.log("Loading main module:", candidate);\n' +
      '        mainModuleName = candidate;\n' +
      '        mainModule = getModule(candidate);\n' +
      '        break;\n' +
      '      }\n' +
      '    }\n' +
      '    \n' +
      '    // 如果没找到主模块，使用第一个模块\n' +
      '    if (!mainModule && moduleMap.size > 0) {\n' +
      '      const firstModuleName = Array.from(moduleMap.keys())[0];\n' +
      '      console.log("Loading first available module:", firstModuleName);\n' +
      '      mainModuleName = firstModuleName;\n' +
      '      mainModule = getModule(firstModuleName);\n' +
      '    }\n' +
      '    \n' +
      '    if (!mainModule) {\n' +
      '      throw new Error("No modules found to load");\n' +
      '    }\n' +
      '    \n' +
      '    // 渲染组件\n' +
      '    const Component = mainModule.default || mainModule;\n' +
      '    \n' +
      '    if (typeof Component === "function") {\n' +
      '      const root = ReactDOM.createRoot(document.getElementById("root"));\n' +
      '      root.render(React.createElement(Component));\n' +
      '      \n' +
      '      console.log("✅ App rendered successfully");\n' +
      '    } else {\n' +
      '      throw new Error("Main module \\"" + mainModuleName + "\\" does not export a valid component. Got: " + typeof Component);\n' +
      '    }\n' +
      '    \n' +
      '  } catch (error) {\n' +
      '    console.error("❌ Failed to start app:", error);\n' +
      '    document.getElementById("root").innerHTML = \n' +
      '      "<div style=\\"color: red; padding: 20px; border: 2px solid red; margin: 20px; border-radius: 8px;\\">" +\n' +
      '        "<h3>❌ 模块加载错误</h3>" +\n' +
      '        "<p><strong>错误信息:</strong> " + error.message + "</p>" +\n' +
      '        "<p><strong>可用模块:</strong> " + Array.from(moduleMap.keys()).join(", ") + "</p>" +\n' +
      '        "<details style=\\"margin-top: 15px;\\">" +\n' +
      '          "<summary>调试信息</summary>" +\n' +
      '          "<pre style=\\"background: #f5f5f5; padding: 10px; margin-top: 10px; font-size: 12px;\\">" +\n' +
      '          "错误堆栈: " + (error.stack || "无堆栈信息") +\n' +
      '          "</pre>" +\n' +
      '        "</details>" +\n' +
      '      "</div>";\n' +
      '  }\n' +
      '}\n\n' +
      
      '// 等待DOM和Babel加载完成后启动\n' +
      'if (document.readyState === "loading") {\n' +
      '  document.addEventListener("DOMContentLoaded", startApp);\n' +
      '} else {\n' +
      '  startApp();\n' +
      '}';

    return moduleLoader;
  };

  // 更新预览
  const updatePreview = () => {
    if (!iframeRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!doc) {
        setError('无法访问预览框架');
        setIsLoading(false);
        return;
      }

      // 清理之前的blob URLs
      moduleUrls.forEach(url => URL.revokeObjectURL(url));
      setModuleUrls([]);

      // 解析模块
      const modules = parseModules(jsxCode);
      console.log('Parsed modules:', modules);

      // 构建模块系统
      const moduleScript = buildModuleSystem(modules);

      // 构建HTML文档
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>React 组件预览</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #24292f;
              background: #ffffff;
            }
            .error-message {
              color: #d1242f;
              background: #ffebe9;
              padding: 12px;
              border-radius: 6px;
              margin: 12px 0;
              border: 1px solid #ffcdd2;
            }
            .console-output {
              background: #f6f8fa;
              color: #24292f;
              padding: 8px 12px;
              margin: 4px 0;
              border-radius: 6px;
              font-family: monospace;
              font-size: 13px;
              border: 1px solid #e1e4e8;
              white-space: pre-wrap;
            }
            .console-error { background: #ffebe9; color: #d1242f; }
            .console-warn { background: #fef3cd; color: #856404; }
            #root { min-height: 100px; }
            ${cssCode}
          </style>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        </head>
        <body>
          <div id="root"></div>
          
          <script>
            // 错误处理
            window.onerror = function(msg, url, line, col, error) {
              console.error('Global error:', msg, error);
              const errorDiv = document.createElement('div');
              errorDiv.className = 'error-message';
              errorDiv.innerHTML = '<strong>JavaScript错误:</strong> ' + msg + ' (行 ' + line + ')';
              document.body.insertBefore(errorDiv, document.body.firstChild);
              return true;
            };
            
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              const errorDiv = document.createElement('div');
              errorDiv.className = 'error-message';
              errorDiv.innerHTML = '<strong>Promise错误:</strong> ' + event.reason;
              document.body.insertBefore(errorDiv, document.body.firstChild);
            });
            
            // 控制台重定向
            const createLogElement = (message, type = 'log') => {
              const logDiv = document.createElement('div');
              logDiv.className = 'console-output console-' + type;
              logDiv.innerHTML = '<strong>Console ' + type + ':</strong> ' + 
                (typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message));
              document.body.appendChild(logDiv);
            };
            
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            
            console.log = (...args) => {
              originalLog.apply(console, args);
              createLogElement(args.join(' '), 'log');
            };
            
            console.error = (...args) => {
              originalError.apply(console, args);
              createLogElement(args.join(' '), 'error');
            };
            
            console.warn = (...args) => {
              originalWarn.apply(console, args);
              createLogElement(args.join(' '), 'warn');
            };
            
            // 执行用户JavaScript代码
            try {
              ${jsCode}
            } catch (error) {
              console.error('用户代码执行错误:', error.message);
            }
          </script>
          
          <script type="module">
            ${moduleScript}
          </script>
        </body>
        </html>
      `;

      // 写入iframe
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setIsLoading(false);
      
    } catch (error) {
      console.error('Preview update error:', error);
      setError(error instanceof Error ? error.message : '预览更新失败');
      setIsLoading(false);
    }
  };

  // 清理blob URLs
  useEffect(() => {
    return () => {
      moduleUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [moduleUrls]);

  // 监听代码变化
  useEffect(() => {
    const timer = setTimeout(updatePreview, 800);
    return () => clearTimeout(timer);
  }, [jsxCode, cssCode, jsCode]);

  const handleRefresh = () => {
    updatePreview();
  };

  const styles = {
    previewContainer: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      border: '1px solid #e1e4e8',
      borderRadius: '8px',
      overflow: 'hidden',
      background: '#ffffff',
    },
    previewHeader: {
      background: '#f6f8fa',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #e1e4e8',
    },
    previewTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#24292f',
      margin: 0,
    },
    refreshButton: {
      background: '#0969da',
      color: '#ffffff',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
    },
    loadingOverlay: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center' as const,
      zIndex: 1000,
      border: '1px solid #e1e4e8',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #f3f4f6',
      borderTop: '2px solid #0969da',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '8px',
    },
    errorMessage: {
      color: '#d1242f',
      background: '#ffebe9',
      padding: '12px',
      margin: '12px',
      borderRadius: '6px',
      border: '1px solid #ffcdd2',
      fontSize: '14px',
    },
    iframe: {
      flex: 1,
      border: 'none',
      background: '#ffffff',
      width: '100%',
      height: '100%',
    },
  };

  return (
    <div style={styles.previewContainer}>
      <div style={styles.previewHeader}>
        <h3 style={styles.previewTitle}>React 组件预览 (ES6 模块)</h3>
        <button 
          style={styles.refreshButton} 
          onClick={handleRefresh}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#0860ca'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#0969da'}
        >
          刷新
        </button>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}></div>
            <div>加载中...</div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          style={styles.iframe}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          title="React组件预览"
        />
      </div>
    </div>
  );
};

export default PreviewFrame; 