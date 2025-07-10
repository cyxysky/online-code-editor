// WebWorker for compiling JavaScript/TypeScript code with Babel
// 在Web Worker中进行代码编译，避免阻塞主线程

declare const Babel: any;
declare function importScripts(...urls: string[]): void;

// 模块信息接口
interface Module {
  id: string;
  content: string;
  compiled?: string;
  dependencies?: string[];
  exports?: any;
}

// 编译请求接口
interface CompileRequest {
  id: string;
  modules: Record<string, Module>;
  entryModule: string;
}

// 编译结果接口
interface CompileResult {
  id: string;
  success: boolean;
  compiledModules?: Record<string, string>;
  bundleCode?: string;
  error?: string;
}

// 导入Babel (在Worker中需要通过importScripts加载)
importScripts('https://unpkg.com/@babel/standalone/babel.min.js');

// 预处理模块内容
function preprocessModule(content: string, moduleId: string): { content: string; dependencies: string[] } {
  let processedContent = content;
  const dependencies: string[] = [];

  // 收集import依赖
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // 处理相对路径import
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const cleanPath = importPath.replace(/\.(tsx?|jsx?)$/, '');
      dependencies.push(cleanPath);
    } else if (importPath === 'react') {
      // React特殊处理
      dependencies.push('react');
    }
  }

  // 替换React导入
  processedContent = processedContent.replace(
    /import\s+React\s+from\s+['"]react['"];?\s*/g,
    'const React = globalThis.React;\n'
  );

  // 替换React hooks导入
  processedContent = processedContent.replace(
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]react['"];?\s*/g,
    (match, hooks) => {
      const hookList = hooks.split(',').map((h: string) => h.trim());
      return hookList.map((hook: string) => `const ${hook} = React.${hook};`).join('\n') + '\n';
    }
  );

  // 替换相对路径导入
  processedContent = processedContent.replace(
    /import\s+(\w+)\s+from\s+['"](\.[^'"]+)['"];?\s*/g,
    (match, varName, modulePath) => {
      const cleanModulePath = modulePath.replace(/\.(tsx?|jsx?)$/, '');
      return `const ${varName} = __getModule('${cleanModulePath}');\n`;
    }
  );

  // 替换命名导入
  processedContent = processedContent.replace(
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"](\.[^'"]+)['"];?\s*/g,
    (match, imports, modulePath) => {
      const cleanModulePath = modulePath.replace(/\.(tsx?|jsx?)$/, '');
      const importList = imports.split(',').map((imp: string) => imp.trim());
      const moduleVar = `__module_${cleanModulePath.replace(/[./]/g, '_')}`;
      let result = `const ${moduleVar} = __getModule('${cleanModulePath}');\n`;
      importList.forEach((imp: string) => {
        result += `const ${imp} = ${moduleVar}.${imp} || ${moduleVar}.default?.${imp};\n`;
      });
      return result;
    }
  );

  // 处理export default
  processedContent = processedContent.replace(
    /export\s+default\s+(\w+);?\s*$/m,
    'globalThis.__moduleExports = $1; globalThis.__moduleExports.default = $1;'
  );

  // 处理命名export
  processedContent = processedContent.replace(
    /export\s+\{\s*([^}]+)\s*\};?\s*$/m,
    (match, exports) => {
      const exportList = exports.split(',').map((exp: string) => exp.trim());
      let result = 'globalThis.__moduleExports = globalThis.__moduleExports || {};\n';
      exportList.forEach((exp: string) => {
        result += `globalThis.__moduleExports.${exp} = ${exp};\n`;
      });
      return result;
    }
  );

  // 如果没有export，自动检测并导出组件
  const hasExport = /export\s+(default\s+)?/.test(processedContent);
  if (!hasExport) {
    const functionMatch = processedContent.match(/function\s+(\w+)/);
    const componentMatch = processedContent.match(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/);
    
    const componentName = functionMatch?.[1] || componentMatch?.[1];
    if (componentName) {
      processedContent += `\nglobalThis.__moduleExports = ${componentName}; globalThis.__moduleExports.default = ${componentName};`;
    }
  }

  return { content: processedContent, dependencies };
}

// 编译单个模块
function compileModule(content: string, moduleId: string): string {
  try {
    const compiled = Babel.transform(content, {
      presets: [
        ['react', { 
          runtime: 'classic',
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ],
      plugins: [
        'transform-typescript'
      ],
      filename: `${moduleId}.tsx`
    });

    return compiled.code || '';
  } catch (error: any) {
    throw new Error(`编译模块 ${moduleId} 失败: ${error.message}`);
  }
}

// 构建模块依赖图
function buildDependencyGraph(modules: Record<string, Module>): { order: string[]; errors: string[] } {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];
  const errors: string[] = [];

  function visit(moduleId: string) {
    if (visiting.has(moduleId)) {
      errors.push(`检测到循环依赖: ${moduleId}`);
      return;
    }
    
    if (visited.has(moduleId)) {
      return;
    }

    if (!modules[moduleId]) {
      errors.push(`模块未找到: ${moduleId}`);
      return;
    }

    visiting.add(moduleId);
    
    const module = modules[moduleId];
    if (module.dependencies) {
      for (const dep of module.dependencies) {
        if (dep !== 'react') { // 跳过React依赖
          visit(dep);
        }
      }
    }
    
    visiting.delete(moduleId);
    visited.add(moduleId);
    order.push(moduleId);
  }

  // 访问所有模块
  for (const moduleId in modules) {
    visit(moduleId);
  }

  return { order, errors };
}

// 生成最终的bundle代码
function generateBundle(compiledModules: Record<string, string>, moduleOrder: string[], entryModule: string): string {
  const moduleRegistry = `
    // 模块注册表和加载器
    const __moduleCache = new Map();
    const __moduleRegistry = new Map();
    
    // 注册模块
    function __registerModule(id, factory) {
      __moduleRegistry.set(id, factory);
    }
    
    // 获取模块
    function __getModule(id) {
      if (__moduleCache.has(id)) {
        return __moduleCache.get(id);
      }
      
      const factory = __moduleRegistry.get(id);
      if (!factory) {
        throw new Error('模块未找到: ' + id);
      }
      
      // 创建模块上下文
      globalThis.__moduleExports = {};
      
      try {
        factory();
        const exports = globalThis.__moduleExports;
        __moduleCache.set(id, exports);
        return exports;
      } catch (error) {
        throw new Error('执行模块 ' + id + ' 失败: ' + error.message);
      }
    }
    
    // 确保React可用
    if (!globalThis.React) {
      throw new Error('React未加载，请确保在加载此代码前已加载React');
    }
  `;

  // 注册所有模块
  let moduleRegistrations = '';
  for (const moduleId of moduleOrder) {
    const compiledCode = compiledModules[moduleId];
    moduleRegistrations += `
      __registerModule('${moduleId}', function() {
        ${compiledCode}
      });
    `;
  }

  // 执行入口模块
  const entryExecution = `
    // 执行入口模块
    try {
      const entryModule = __getModule('${entryModule}');
      if (entryModule && (entryModule.default || entryModule)) {
        const Component = entryModule.default || entryModule;
        
        // 确保组件可以被渲染
        if (typeof Component === 'function') {
          globalThis.__EntryComponent = Component;
        } else {
          throw new Error('入口模块没有导出有效的React组件');
        }
      }
    } catch (error) {
      console.error('执行入口模块失败:', error);
      throw error;
    }
  `;

  return moduleRegistry + moduleRegistrations + entryExecution;
}

// 处理编译请求
self.onmessage = function(event) {
  const request: CompileRequest = event.data;
  
  try {
    console.log('Worker开始编译, 模块数量:', Object.keys(request.modules).length);
    
    // 预处理所有模块
    const processedModules: Record<string, Module> = {};
    
    for (const [moduleId, module] of Object.entries(request.modules)) {
      const { content, dependencies } = preprocessModule(module.content, moduleId);
      processedModules[moduleId] = {
        ...module,
        content,
        dependencies
      };
    }
    
    // 构建依赖图
    const { order, errors } = buildDependencyGraph(processedModules);
    
    if (errors.length > 0) {
      throw new Error('依赖分析失败:\n' + errors.join('\n'));
    }
    
    // 编译所有模块
    const compiledModules: Record<string, string> = {};
    
    for (const moduleId of order) {
      const module = processedModules[moduleId];
      compiledModules[moduleId] = compileModule(module.content, moduleId);
    }
    
    // 生成最终bundle
    const bundleCode = generateBundle(compiledModules, order, request.entryModule);
    
    const result: CompileResult = {
      id: request.id,
      success: true,
      compiledModules,
      bundleCode
    };
    
    console.log('Worker编译完成');
    self.postMessage(result);
    
  } catch (error: any) {
    console.error('Worker编译失败:', error);
    
    const result: CompileResult = {
      id: request.id,
      success: false,
      error: error.message
    };
    
    self.postMessage(result);
  }
};

// 类型声明
export {}; 