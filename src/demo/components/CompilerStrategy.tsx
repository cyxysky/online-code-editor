import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// 编译策略枚举
export enum CompilationStrategy {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  WEBCONTAINER = 'webcontainer'
}

// 文件信息接口
export interface FileInfo {
  id: string;
  name: string;
  content: string;
  language: 'jsx' | 'tsx' | 'js' | 'ts' | 'css';
}

// 依赖信息接口
export interface Dependency {
  name: string;
  version: string;
  cdnUrl: string;
  description?: string;
  isLoading?: boolean;
  isInstalled?: boolean;
}

// 编译结果接口
export interface CompilationResult {
  success: boolean;
  bundleCode?: string;
  error?: string;
  strategy: CompilationStrategy;
}

// 编译策略配置
interface StrategyConfig {
  maxFileSize: number; // KB
  maxFiles: number;
  allowedDependencies: string[];
  supportedFeatures: string[];
}

const STRATEGY_CONFIGS: Record<CompilationStrategy, StrategyConfig> = {
  [CompilationStrategy.FRONTEND]: {
    maxFileSize: 100, // 100KB
    maxFiles: 10,
    allowedDependencies: ['react', 'react-dom'],
    supportedFeatures: ['jsx', 'tsx', 'basic-imports']
  },
  [CompilationStrategy.BACKEND]: {
    maxFileSize: 1000, // 1MB
    maxFiles: 100,
    allowedDependencies: ['*'], // 支持所有依赖
    supportedFeatures: ['jsx', 'tsx', 'npm-packages', 'complex-builds']
  },
  [CompilationStrategy.WEBCONTAINER]: {
    maxFileSize: 500, // 500KB
    maxFiles: 50,
    allowedDependencies: ['react', 'react-dom', 'lodash', 'axios', 'styled-components'],
    supportedFeatures: ['jsx', 'tsx', 'npm-packages', 'bundling']
  }
};

interface CompilerStrategyProps {
  files: FileInfo[];
  dependencies: Dependency[];
  onCompilationComplete: (result: CompilationResult) => void;
  preferredStrategy?: CompilationStrategy;
}

export const CompilerStrategy = forwardRef<
  { forceCompile: () => void },
  CompilerStrategyProps
>(({ files, dependencies, onCompilationComplete, preferredStrategy }, ref) => {
  const [currentStrategy, setCurrentStrategy] = useState<CompilationStrategy>(
    preferredStrategy || CompilationStrategy.FRONTEND
  );
  const [isCompiling, setIsCompiling] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // 防抖和变化检测
  const compileTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFilesHashRef = useRef<string>('');
  const lastCompileTimeRef = useRef<number>(0);
  const isFirstCompileRef = useRef(true);

  // 计算文件内容哈希
  const calculateFilesHash = useCallback((files: FileInfo[]): string => {
    const content = files
      .map(file => `${file.name}:${file.content}`)
      .sort()
      .join('|');

    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }, []);



  // 智能防抖编译
  const debouncedCompile = useCallback((forceCompile: boolean = false) => {
    // 清除之前的定时器
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
    }

    // 检查文件是否发生变化
    const currentHash = calculateFilesHash(files);
    const hasChanged = currentHash !== lastFilesHashRef.current;

    if (!hasChanged && !forceCompile && !isFirstCompileRef.current) {
      console.log('📝 文件内容未变化，跳过编译');
      return;
    }

    // 防止过于频繁的编译
    const now = Date.now();
    const timeSinceLastCompile = now - lastCompileTimeRef.current;
    const minCompileInterval = 200; // 最小编译间隔200ms

    if (timeSinceLastCompile < minCompileInterval && !forceCompile) {
      console.log('🕐 编译间隔过短，延迟编译');
      compileTimerRef.current = setTimeout(() => {
        debouncedCompile(true);
      }, minCompileInterval - timeSinceLastCompile);
      return;
    }

    // 设置防抖延迟
    const debounceDelay = isFirstCompileRef.current ? 100 : 800; // 首次编译更快

    console.log(`⏱️ 设置 ${debounceDelay}ms 防抖延迟`);

    compileTimerRef.current = setTimeout(() => {
      if (files.length === 0) return;

      console.log('🔄 开始编译...');
      lastFilesHashRef.current = currentHash;
      lastCompileTimeRef.current = Date.now();
      isFirstCompileRef.current = false;

      // 触发编译
      performCompile();
    }, debounceDelay);
  }, [files, calculateFilesHash]);

  // 分析代码复杂度并选择最佳策略
  const analyzeAndSelectStrategy = useCallback((files: FileInfo[]): CompilationStrategy => {
    const totalSize = files.reduce((size, file) => size + file.content.length, 0) / 1024; // KB
    const fileCount = files.length;

    // 提取依赖
    const dependencies = new Set<string>();
    files.forEach(file => {
      const importMatches = file.content.matchAll(/import\s+[^'"]*from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const dep = match[1];
        if (!dep.startsWith('./') && !dep.startsWith('../')) {
          dependencies.add(dep);
        }
      }
    });

    const depArray = Array.from(dependencies);

    console.log('代码分析结果:', {
      totalSize: `${totalSize.toFixed(2)}KB`,
      fileCount,
      dependencies: depArray
    });

    // 检查是否有复杂依赖
    const hasComplexDependencies = depArray.some(dep =>
      !['react', 'react-dom'].includes(dep) &&
      !dep.startsWith('@types/')
    );

    // 检查是否使用了高级特性
    const hasAdvancedFeatures = files.some(file => {
      const content = file.content;
      return (
        content.includes('require(') ||
        content.includes('process.env') ||
        content.includes('import.meta') ||
        content.includes('dynamic import') ||
        /import\([^)]+\)/.test(content) // 动态import
      );
    });

    // 策略选择逻辑
    if (hasAdvancedFeatures || (hasComplexDependencies && depArray.length > 5)) {
      return CompilationStrategy.BACKEND;
    }

    if (hasComplexDependencies || totalSize > 50 || fileCount > 5) {
      return CompilationStrategy.WEBCONTAINER;
    }

    return CompilationStrategy.FRONTEND;
  }, []);

  // 前端编译（使用WebWorker）
  const compileFrontend = useCallback(async (files: FileInfo[]): Promise<CompilationResult> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        workerRef.current = new Worker('/workers/compilerWorker.js');
      }

      const requestId = ++requestIdRef.current;

      // 监听Worker消息
      const handleMessage = (event: MessageEvent) => {
        const result = event.data;
        if (result.id === requestId.toString()) {
          workerRef.current?.removeEventListener('message', handleMessage);

          resolve({
            success: result.success,
            bundleCode: result.bundleCode,
            error: result.error,
            strategy: CompilationStrategy.FRONTEND
          });
        }
      };

      workerRef.current.addEventListener('message', handleMessage);

      // 转换文件格式
      const modules: Record<string, any> = {};
      files.forEach(file => {
        // CSS文件保留扩展名，JavaScript/TypeScript文件移除扩展名
        const moduleId = file.name.endsWith('.css') 
          ? file.name  // CSS文件保留完整文件名
          : file.name.replace(/\.(tsx?|jsx?|js)$/, ''); // JS/TS文件移除扩展名
        
        modules[moduleId] = {
          id: moduleId,
          content: file.content
        };
      });

      // 发送编译请求
      // 查找入口模块，优先使用 main.js，然后是 App.tsx，最后使用第一个文件
      const entryFile = files.find(f => f.name === 'main.js') || 
                        files.find(f => f.name === 'App.tsx') || 
                        files[0];
      const entryModuleId = entryFile 
        ? (entryFile.name.endsWith('.css') 
            ? entryFile.name  // CSS文件保留完整文件名
            : entryFile.name.replace(/\.(tsx?|jsx?|js)$/, '')) // JS/TS文件移除扩展名
        : 'main';

      workerRef.current.postMessage({
        id: requestId.toString(),
        modules,
        dependencies: dependencies,
        entryModule: entryModuleId
      });
    });
  }, [dependencies]);

  // 后端编译
  const compileBackend = useCallback(async (files: FileInfo[]): Promise<CompilationResult> => {
    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: files.map(file => ({
            name: file.name,
            content: file.content,
            language: file.language
          })),
          dependencies: dependencies
        })
      });

      if (!response.ok) {
        throw new Error(`编译服务错误: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: result.success,
        bundleCode: result.bundleCode,
        error: result.error,
        strategy: CompilationStrategy.BACKEND
      };
    } catch (error: any) {
      return {
        success: false,
        error: `后端编译失败: ${error.message}`,
        strategy: CompilationStrategy.BACKEND
      };
    }
  }, [dependencies]);

  // WebContainer编译（模拟实现）
  const compileWebContainer = useCallback(async (files: FileInfo[]): Promise<CompilationResult> => {
    // 这里是WebContainer的模拟实现
    // 实际实现需要集成@webcontainer/api
    try {
      // 模拟编译过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 简化的bundling逻辑
      const entryFile = files.find(f => f.name === 'main.js') || 
                        files.find(f => f.name === 'App.tsx') || 
                        files[0];
      if (!entryFile) {
        throw new Error('未找到入口文件');
      }

      // 基本的模块替换
      let bundleCode = entryFile.content;

      // 替换相对import
      files.forEach(file => {
        const moduleName = file.name.replace(/\.(tsx?|jsx?)$/, '');
        const modulePattern = new RegExp(`import\\s+[^'"]*from\\s+['"]\\.\/${moduleName}['"]`, 'g');
        bundleCode = bundleCode.replace(modulePattern, `const ${moduleName} = ${file.content};`);
      });

      // 处理外部依赖
      dependencies.forEach(dep => {
        const depPattern = new RegExp(`import\\s+[^'"]*from\\s+['"]${dep.name}['"]`, 'g');
        bundleCode = bundleCode.replace(depPattern, `const ${dep.name} = globalThis.${dep.name};`);
      });

      return {
        success: true,
        bundleCode,
        strategy: CompilationStrategy.WEBCONTAINER
      };
    } catch (error: any) {
      return {
        success: false,
        error: `WebContainer编译失败: ${error.message}`,
        strategy: CompilationStrategy.WEBCONTAINER
      };
    }
  }, [dependencies]);

  // 内部编译执行函数
  const performCompile = useCallback(async (strategy: CompilationStrategy = currentStrategy) => {
    if (isCompiling || files.length === 0) return;

    setIsCompiling(true);
    const startTime = Date.now();

    try {
      console.log(`🚀 开始${getStrategyName(strategy)}编译`);

      let result: CompilationResult;

      switch (strategy) {
        case CompilationStrategy.FRONTEND:
          result = await compileFrontend(files);
          break;
        case CompilationStrategy.BACKEND:
          result = await compileBackend(files);
          break;
        case CompilationStrategy.WEBCONTAINER:
          result = await compileWebContainer(files);
          break;
        default:
          result = await compileFrontend(files);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ 编译完成，耗时: ${duration}ms`);

      onCompilationComplete(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ 编译失败，耗时: ${duration}ms`, error);

      onCompilationComplete({
        success: false,
        error: `编译失败: ${error.message}`,
        strategy
      });
    } finally {
      setIsCompiling(false);
    }
  }, [currentStrategy, files, isCompiling, compileFrontend, compileBackend, compileWebContainer, onCompilationComplete]);

  // 对外暴露的编译函数
  const compile = useCallback(async (strategy?: CompilationStrategy) => {
    await performCompile(strategy);
  }, [performCompile]);

  // 手动强制编译
  const forceCompile = useCallback(() => {
    console.log('🔄 手动强制编译');
    debouncedCompile(true);
  }, [debouncedCompile]);

  // 暴露方法给外部引用
  useImperativeHandle(ref, () => ({
    forceCompile
  }), [forceCompile]);

  // 自动选择策略
  useEffect(() => {
    if (files.length > 0 && !preferredStrategy) {
      const bestStrategy = analyzeAndSelectStrategy(files);
      if (bestStrategy !== currentStrategy) {
        console.log(`🔄 切换编译策略: ${getStrategyName(currentStrategy)} → ${getStrategyName(bestStrategy)}`);
        setCurrentStrategy(bestStrategy);
      }
    }
  }, [files, preferredStrategy, currentStrategy, analyzeAndSelectStrategy]);

  // 当文件或策略改变时触发智能防抖编译
  useEffect(() => {
    if (files.length > 0) {
      debouncedCompile();
    }
  }, [files, currentStrategy, debouncedCompile]);

  // 清理定时器和Worker
  useEffect(() => {
    return () => {
      // 清理编译定时器
      if (compileTimerRef.current) {
        clearTimeout(compileTimerRef.current);
      }

      // 清理Worker
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.strategyInfo}>
        <div style={styles.currentStrategy}>
          <span style={styles.label}>编译策略:</span>
          <span style={{
            ...styles.strategyBadge,
            backgroundColor: getStrategyColor(currentStrategy)
          }}>
            {getStrategyName(currentStrategy)}
          </span>
        </div>

        <div style={styles.controls}>
          <button
            onClick={forceCompile}
            disabled={isCompiling}
            style={{
              ...styles.compileButton,
              opacity: isCompiling ? 0.6 : 1
            }}
          >
            {isCompiling ? '🔄 编译中...' : '🚀 重新编译'}
          </button>

          {isCompiling && (
            <div style={styles.compiling}>
              <span>⏳ 编译中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// 辅助函数
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

function getStrategyColor(strategy: CompilationStrategy): string {
  switch (strategy) {
    case CompilationStrategy.FRONTEND:
      return '#4caf50';
    case CompilationStrategy.BACKEND:
      return '#ff9800';
    case CompilationStrategy.WEBCONTAINER:
      return '#2196f3';
    default:
      return '#gray';
  }
}

const styles = {
  container: {
    padding: '16px',
    borderBottom: '1px solid #e1e4e8',
    backgroundColor: '#f8f9fa',
  },
  strategyInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  currentStrategy: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#586069',
  },
  strategyBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 'bold',
  },
  strategySelector: {
    display: 'flex',
    gap: '8px',
  },
  strategyButton: {
    padding: '6px 12px',
    border: '1px solid #e1e4e8',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  compileButton: {
    padding: '8px 16px',
    border: '1px solid #28a745',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  compiling: {
    display: 'flex',
    alignItems: 'center',
    color: '#586069',
    fontSize: '12px',
  },
};

export default CompilerStrategy; 