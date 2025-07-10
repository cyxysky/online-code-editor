// WebWorker for compiling JavaScript/TypeScript code with Babel
// 完全使用Babel标准模块转换，不手动处理import/export

// 导入Babel
importScripts('https://unpkg.com/@babel/standalone/babel.min.js');

// 简单的模块加载系统
const moduleSystem = {
  modules: new Map(),
  cache: new Map(),
  
  define(id, factory) {
    this.modules.set(id, factory);
  },
  
  require(id) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const factory = this.modules.get(id);
    if (!factory) {
      throw new Error(`Module not found: ${id}`);
    }
    
    const module = { exports: {} };
    const exports = module.exports;
    
    factory.call(exports, this.require.bind(this), module, exports);
    
    this.cache.set(id, module.exports);
    return module.exports;
  }
};

// 预定义的外部模块
function setupExternalModules(dependencies) {
  // React
  moduleSystem.define('react', function(require, module, exports) {
    if (typeof globalThis.React !== 'undefined') {
      module.exports = globalThis.React;
      module.exports.default = globalThis.React;
    } else {
      throw new Error('React is not available globally');
    }
  });
  
  // React DOM
  moduleSystem.define('react-dom', function(require, module, exports) {
    if (typeof globalThis.ReactDOM !== 'undefined') {
      module.exports = globalThis.ReactDOM;
      module.exports.default = globalThis.ReactDOM;
            } else {
      throw new Error('ReactDOM is not available globally');
    }
  });
  
  // 外部依赖
  dependencies.forEach(dep => {
    moduleSystem.define(dep.name, function(require, module, exports) {
      if (typeof globalThis[dep.name] !== 'undefined') {
        module.exports = globalThis[dep.name];
        module.exports.default = globalThis[dep.name];
      } else {
        throw new Error(`${dep.name} is not available globally`);
      }
    });
  });
}

// 编译单个模块
function compileModule(content, moduleId, allModules, dependencies = []) {
  try {
    console.log(`🔄 编译模块: ${moduleId}`);
    
    // HTML文件处理 - 不编译，跳过
    if (moduleId.endsWith('.html')) {
      console.log(`📄 跳过HTML文件编译: ${moduleId}`);
      return `
        // HTML文件: ${moduleId} - 不需要编译
        module.exports = {};
      `;
    }
    
    // CSS文件处理 - 只根据后缀名判断
    if (moduleId.endsWith('.css')) {
      console.log(`📄 处理CSS文件: ${moduleId}`);
      return `
        // CSS模块: ${moduleId}
        const style = document.createElement('style');
        style.textContent = \`${content.replace(/`/g, '\\`')}\`;
        document.head.appendChild(style);
        
        module.exports = {};
      `;
    }
    
    // Vue文件基础支持
    if (moduleId.endsWith('.vue')) {
      console.log(`🔧 Vue文件暂不完全支持，将作为模块导出: ${moduleId}`);
      return `
        // Vue模块: ${moduleId}
        console.warn('Vue文件需要vue-loader或@vue/compiler-sfc支持');
        module.exports = { 
          template: \`${content.replace(/`/g, '\\`')}\`,
          __isVue: true 
        };
      `;
    }
    
    // Svelte文件基础支持  
    if (moduleId.endsWith('.svelte')) {
      console.log(`🔧 Svelte文件暂不完全支持，将作为模块导出: ${moduleId}`);
      return `
        // Svelte模块: ${moduleId}
        console.warn('Svelte文件需要svelte/compiler支持');
        module.exports = { 
          source: \`${content.replace(/`/g, '\\`')}\`,
          __isSvelte: true 
        };
      `;
    }
    
    // 自定义Babel插件：移除CSS导入语句并收集CSS文件
    const removeCssImportsPlugin = function() {
      return {
        visitor: {
          ImportDeclaration(path) {
            const source = path.node.source.value;
            // 只移除.css文件的导入语句
            if (source && source.endsWith('.css')) {
              console.log(`🎨 移除CSS导入: ${source} 来自模块 ${moduleId}`);
              
              // 如果是相对路径CSS文件，尝试注入CSS内容
              if (source.startsWith('./') && allModules) {
                const cssModuleId = source.replace(/^\.\//, '').replace(/\.css$/, '');
                if (allModules[cssModuleId]) {
                  console.log(`📄 找到CSS模块: ${cssModuleId}`);
                  // CSS内容将在后续统一处理
                }
              }
              
              // 移除这个导入语句
              path.remove();
            }
          }
        }
      };
    };

    // 使用 Babel 标准编译，使用CommonJS模块
    const result = Babel.transform(content, {
      presets: [
        ['env', { 
          targets: { browsers: ['last 2 versions'] },
          modules: 'cjs' // 使用CommonJS模块
        }],
        ['react', { 
          runtime: 'classic',
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }],
        ['typescript', {
          isTSX: true,
          allExtensions: true,
          allowDeclareFields: true
        }]
      ],
      plugins: [
        'proposal-class-properties',
        'proposal-object-rest-spread',
        removeCssImportsPlugin // 添加自定义插件
      ],
      filename: `${moduleId}`,
      sourceType: 'module'
    });
    
    console.log(`✅ 模块 ${moduleId} 编译成功`);
    return result.code;
    
  } catch (error) {
    console.error(`❌ 编译模块 ${moduleId} 失败:`, error);
    throw new Error(`编译模块 ${moduleId} 失败: ${error.message}`);
  }
}

// 构建依赖图
function buildDependencyGraph(modules) {
  const visited = new Set();
  const visiting = new Set();
  const order = [];
  const errors = [];

  function extractDependencies(content) {
    const deps = [];
    const importRegex = /(?:import|require)\s*\(['"](\.\/[^'"]+)['"]\)|import\s+[^'"]*from\s+['"](\.\/[^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && importPath.startsWith('./')) {
        // 忽略CSS文件和HTML文件导入
        if (importPath.endsWith('.css') || importPath.endsWith('.html')) {
          console.log(`🎨 忽略非JS文件导入: ${importPath}`);
          continue;
        }
        
        const resolvedPath = importPath.replace(/^\.\//, '').replace(/\.(tsx?|jsx?|js|ts|vue|svelte|mjs|cjs)$/, '');
        if (modules[resolvedPath]) {
          deps.push(resolvedPath);
        }
      }
    }
    
    return deps;
  }

  function visit(moduleId) {
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
    
    const deps = extractDependencies(modules[moduleId].content);
    deps.forEach(dep => visit(dep));
    
    visiting.delete(moduleId);
    visited.add(moduleId);
    order.push(moduleId);
  }

  for (const moduleId in modules) {
    visit(moduleId);
  }

  return { order, errors };
}

// 生成最终的bundle
function generateBundle(compiledModules, moduleOrder, entryModule, dependencies = [], cssFiles = []) {
  const parts = [];
  
  // 1. 注入CSS文件
  if (cssFiles.length > 0) {
    console.log(`🎨 注入 ${cssFiles.length} 个CSS文件`);
    cssFiles.forEach(cssFile => {
      parts.push(`
// CSS from ${cssFile.id}
(function() {
  const style = document.createElement('style');
  style.setAttribute('data-source', '${cssFile.id}');
  style.textContent = \`${cssFile.content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`;
  document.head.appendChild(style);
  console.log('✅ CSS已注入:', '${cssFile.id}');
})();
`);
    });
  }
  
  // 2. 模块系统设置
  parts.push(`
const moduleSystem = {
  modules: new Map(),
  cache: new Map(),
  
  define(id, factory) {
    this.modules.set(id, factory);
  },
  
  require(id) {
    // 规范化模块ID
    let normalizedId = id;
    if (id.startsWith('./')) {
      normalizedId = id.replaceAll('./', '');
    }
    if (id.startsWith('../')) {
      normalizedId = id.replaceAll('../', '');
    }
    
    // CSS文件保留扩展名，JavaScript/TypeScript文件移除扩展名
    if (!normalizedId.endsWith('.css')) {
      normalizedId = normalizedId.replace(/\\.(tsx?|jsx?|js|ts|vue|svelte|mjs|cjs)$/, '');
    }
    
    if (this.cache.has(normalizedId)) {
      return this.cache.get(normalizedId);
    }
    
    const factory = this.modules.get(normalizedId);
    if (!factory) {
      console.error('Module not found:', id, 'normalized:', normalizedId);
      console.error('Available modules:', Array.from(this.modules.keys()));
      throw new Error('Module not found: ' + id);
    }
    
    const module = { exports: {} };
    const exports = module.exports;
    
    factory.call(exports, this.require.bind(this), module, exports);
    
    this.cache.set(normalizedId, module.exports);
    return module.exports;
  }
};

const require = moduleSystem.require.bind(moduleSystem);
`);

  // 3. React和ReactDOM
  parts.push(`
moduleSystem.define('react', function(require, module, exports) {
  if (typeof globalThis.React !== 'undefined') {
    module.exports = globalThis.React;
    module.exports.default = globalThis.React;
  } else {
    throw new Error('React is not available globally');
  }
});

moduleSystem.define('react-dom', function(require, module, exports) {
  if (typeof globalThis.ReactDOM !== 'undefined') {
    module.exports = globalThis.ReactDOM;
    module.exports.default = globalThis.ReactDOM;
  } else {
    throw new Error('ReactDOM is not available globally');
  }
});
`);

  // 4. 外部依赖
  dependencies.forEach(dep => {
    // 依赖名称到全局变量的映射
    const globalVarMapping = {
      'lodash': '_',
      'axios': 'axios', 
      'dayjs': 'dayjs',
      'ramda': 'R',
      'moment': 'moment',
      'jquery': '$',
      // React 生态
      'react': 'React',
      'react-dom': 'ReactDOM',
      // Vue 生态
      'vue': 'Vue',
      'vuex': 'Vuex',
      'vue-router': 'VueRouter',
      // 其他流行库
      'three': 'THREE',
      'gsap': 'gsap',
      'chart.js': 'Chart',
      'chartjs': 'Chart',
      'd3': 'd3',
      'fabric': 'fabric',
      'pixi.js': 'PIXI',
      'babylonjs': 'BABYLON'
    };
    
    // 智能查找全局变量名
    function findGlobalVarName(packageName) {
      // 1. 首先查找预定义映射
      if (globalVarMapping[packageName]) {
        return globalVarMapping[packageName];
      }
      
      // 2. 尝试常见的命名约定
      const candidates = [
        packageName,                           // 原始名称: axios
        packageName.charAt(0).toUpperCase() + packageName.slice(1), // 首字母大写: Axios
        packageName.toUpperCase(),             // 全大写: AXIOS
        packageName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()), // 驼峰命名: reactDom
        packageName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(''), // PascalCase: ReactDom
        packageName.replace(/[.-]/g, ''),      // 移除分隔符: reactdom
        packageName.replace(/[.-]/g, '').toUpperCase() // 移除分隔符并大写: REACTDOM
      ];
      
      return candidates;
    }
    
    const globalVarCandidates = findGlobalVarName(dep.name);
    const candidatesArray = Array.isArray(globalVarCandidates) ? globalVarCandidates : [globalVarCandidates];
    
    parts.push(`
moduleSystem.define('${dep.name}', function(require, module, exports) {
  // 尝试多个候选全局变量名
  const candidates = ${JSON.stringify(candidatesArray)};
  let foundGlobalVar = null;
  let foundVarName = null;
  
  for (const candidate of candidates) {
    if (typeof globalThis[candidate] !== 'undefined') {
      foundGlobalVar = globalThis[candidate];
      foundVarName = candidate;
      break;
    }
  }
  
  if (foundGlobalVar) {
    module.exports = foundGlobalVar;
    module.exports.default = foundGlobalVar;
    console.log('✅ 外部依赖已注册: ${dep.name} -> globalThis.' + foundVarName);
  } else {
    console.error('❌ 全局变量未找到，尝试的候选名称:', candidates);
    console.error('❌ 可用的全局变量:', Object.keys(globalThis).filter(k => k.length < 20 && /^[A-Za-z]/.test(k)));
    throw new Error('${dep.name} is not available globally. Tried: ' + candidates.join(', '));
  }
});
`);
  });

  // 5. 用户模块
  moduleOrder.forEach(moduleId => {
    const compiledCode = compiledModules[moduleId];
    
    if (!compiledCode || typeof compiledCode !== 'string') {
      console.error(`❌ 模块 ${moduleId} 编译代码无效:`, compiledCode);
      parts.push(`
moduleSystem.define('${moduleId}', function(require, module, exports) {
  throw new Error('模块 ${moduleId} 编译失败');
});
`);
    } else {
      parts.push(`
moduleSystem.define('${moduleId}', function(require, module, exports) {
        ${compiledCode}
      });
`);
    }
  });

  // 6. 启动应用
  parts.push(`
try {
  console.log('🚀 开始执行入口模块: ${entryModule}');
  const entryModuleExports = require('${entryModule}');
  
  // 如果入口模块导出了组件（旧模式兼容）
  const Component = entryModuleExports.default || entryModuleExports;
  if (typeof Component === 'function') {
    globalThis.__EntryComponent = Component;
    console.log('✅ 入口组件模式：组件已加载');
  } else {
    // 新模式：main.js直接执行，不需要导出组件
    console.log('✅ 执行模式：入口模块已执行完成');
  }
} catch (error) {
  console.error('❌ 执行入口模块失败:', error);
  throw error;
}
`);

  return parts.join('\n');
}

// 处理编译请求
self.onmessage = function(event) {
  const request = event.data;
  
  try {
    console.log('🚀 开始编译，模块数量:', Object.keys(request.modules).length);
    
    // 1. 收集CSS文件 - 只根据后缀名判断
    const cssFiles = [];
    Object.keys(request.modules).forEach(moduleId => {
      const module = request.modules[moduleId];
      
      // 简单直接：只有.css后缀的文件才当作CSS处理
      if (moduleId.endsWith('.css')) {
        cssFiles.push({ id: moduleId, content: module.content });
        console.log(`🎨 发现CSS文件: ${moduleId}`);
      }
    });

    // 2. 构建依赖图（排除CSS文件和HTML文件）
    const jsModules = {};
    Object.keys(request.modules).forEach(moduleId => {
      const module = request.modules[moduleId];
      
      // 简单直接：根据文件后缀名排除
      if (!moduleId.endsWith('.css') && !moduleId.endsWith('.html')) {
        jsModules[moduleId] = module;
        console.log(`📄 包含JS模块: ${moduleId}`);
      } else {
        console.log(`📄 跳过非JS文件: ${moduleId}`);
      }
    });
    
    const dependencyResult = buildDependencyGraph(jsModules);
    
    if (dependencyResult.errors.length > 0) {
      throw new Error('依赖分析失败:\n' + dependencyResult.errors.join('\n'));
    }
    
    console.log('📋 编译顺序:', dependencyResult.order);
    
    // 3. 编译所有JS模块
    const compiledModules = {};
    
    dependencyResult.order.forEach(moduleId => {
      const module = jsModules[moduleId];
      const compiledCode = compileModule(
        module.content, 
        moduleId, 
        request.modules, // 传递全部模块以便CSS检测
        request.dependencies || []
      );
        compiledModules[moduleId] = compiledCode;
    });
    
    // 4. 生成最终bundle（包含CSS）
    const bundleCode = generateBundle(
      compiledModules, 
      dependencyResult.order, 
      request.entryModule, 
      request.dependencies || [],
      cssFiles // 传递CSS文件
    );
    
    console.log('✅ 编译完成');
    
    // 调试：输出生成的bundle代码前100行
    const bundleLines = bundleCode.split('\n');
    
    self.postMessage({
      id: request.id,
      success: true,
      bundleCode: bundleCode
    });
    
  } catch (error) {
    console.error('❌ 编译失败:', error);
    
    self.postMessage({
      id: request.id,
      success: false,
      error: error.message
    });
  }
}; 