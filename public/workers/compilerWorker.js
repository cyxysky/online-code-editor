// WebWorker for compiling JavaScript/TypeScript code with Babel
// 使用 Babel 的正确API，直接操作AST节点

// 导入Babel
importScripts('https://unpkg.com/@babel/standalone/babel.min.js');

// 创建自定义的模块解析插件
function createModuleResolverPlugin(modules) {
  return function({ types: t }) {
    return {
      name: 'custom-module-resolver',
      visitor: {
        ImportDeclaration(path) {
          const source = path.node.source.value;
          
          // 处理React导入
          if (source === 'react') {
            const specifiers = path.node.specifiers;
            const declarations = [];
            
            specifiers.forEach(spec => {
              if (spec.type === 'ImportDefaultSpecifier') {
                // import React from 'react' -> const React = globalThis.React
                declarations.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      spec.local,
                      t.memberExpression(
                        t.identifier('globalThis'),
                        t.identifier('React')
                      )
                    )
                  ])
                );
              } else if (spec.type === 'ImportSpecifier') {
                // import { useState } from 'react' -> const useState = globalThis.React.useState
                declarations.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      spec.local,
                      t.memberExpression(
                        t.memberExpression(
                          t.identifier('globalThis'),
                          t.identifier('React')
                        ),
                        spec.imported
                      )
                    )
                  ])
                );
              }
            });
            
            path.replaceWithMultiple(declarations);
            return;
          }
          
          // 处理CSS导入
          if (source.endsWith('.css')) {
            path.remove();
            return;
          }
          
          // 处理相对路径导入
          if (source.startsWith('./') || source.startsWith('../')) {
            const resolvedPath = source.replace(/^\.\//, '').replace(/\.(tsx?|jsx?)$/, '');
            
            if (modules[resolvedPath]) {
              const specifiers = path.node.specifiers;
              const declarations = [];
              
              specifiers.forEach(spec => {
                if (spec.type === 'ImportDefaultSpecifier') {
                  // import Button from './Button' -> const Button = __getModule('button').default || __getModule('button')
                  declarations.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        spec.local,
                        t.logicalExpression(
                          '||',
                          t.memberExpression(
                            t.callExpression(
                              t.identifier('__getModule'),
                              [t.stringLiteral(resolvedPath)]
                            ),
                            t.identifier('default')
                          ),
                          t.callExpression(
                            t.identifier('__getModule'),
                            [t.stringLiteral(resolvedPath)]
                          )
                        )
                      )
                    ])
                  );
                } else if (spec.type === 'ImportSpecifier') {
                  // import { Button } from './Button' -> const Button = __getModule('button').Button
                  declarations.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        spec.local,
                        t.memberExpression(
                          t.callExpression(
                            t.identifier('__getModule'),
                            [t.stringLiteral(resolvedPath)]
                          ),
                          spec.imported
                        )
                      )
                    ])
                  );
                }
              });
              
              path.replaceWithMultiple(declarations);
            } else {
              // 模块不存在，移除导入
              path.remove();
            }
          }
        },
        
        ExportDefaultDeclaration(path) {
          // export default Component -> globalThis.__moduleExports = Component; globalThis.__moduleExports.default = Component;
          const declaration = path.node.declaration;
          
          let statements;
          
          if (declaration.type === 'Identifier') {
            // 对于标识符，创建新的标识符节点避免重复使用
            const exportRef = t.identifier(declaration.name);
            const defaultRef = t.identifier(declaration.name);
            
            statements = [
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier('globalThis'),
                  t.identifier('__moduleExports')
                ),
                exportRef
              ),
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.memberExpression(
                    t.identifier('globalThis'),
                    t.identifier('__moduleExports')
                  ),
                  t.identifier('default')
                ),
                defaultRef
              )
            ];
          } else {
            // 对于复杂表达式，先赋值给__moduleExports，然后让default指向它
            statements = [
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier('globalThis'),
                  t.identifier('__moduleExports')
                ),
                declaration
              ),
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.memberExpression(
                    t.identifier('globalThis'),
                    t.identifier('__moduleExports')
                  ),
                  t.identifier('default')
                ),
                t.memberExpression(
                  t.identifier('globalThis'),
                  t.identifier('__moduleExports')
                )
              )
            ];
          }
          
          path.replaceWithMultiple(statements.map(stmt => t.expressionStatement(stmt)));
        },
        
        ExportNamedDeclaration(path) {
          // export { Button, Input } -> globalThis.__moduleExports = globalThis.__moduleExports || {}; globalThis.__moduleExports.Button = Button; ...
          if (path.node.specifiers.length > 0) {
            const statements = [
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier('globalThis'),
                  t.identifier('__moduleExports')
                ),
                t.logicalExpression(
                  '||',
                  t.memberExpression(
                    t.identifier('globalThis'),
                    t.identifier('__moduleExports')
                  ),
                  t.objectExpression([])
                )
              )
            ];
            
            path.node.specifiers.forEach(spec => {
              statements.push(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(
                    t.memberExpression(
                      t.identifier('globalThis'),
                      t.identifier('__moduleExports')
                    ),
                    spec.exported
                  ),
                  spec.local
                )
              );
            });
            
            path.replaceWithMultiple(statements.map(stmt => t.expressionStatement(stmt)));
          }
        }
      }
    };
  };
}

// 编译单个模块
function compileModule(content, moduleId, allModules) {
  try {
    // 检查是否是CSS文件 - 更精确的检测
    const isCssContent = (
      // 包含 CSS 选择器模式：.class-name { ... } 或 #id { ... }
      /[.#][\w-]+\s*\{[^}]*\}/s.test(content) ||
      // 包含 CSS 属性模式：property: value;
      /[\w-]+\s*:\s*[^;{]+;/s.test(content) ||
      // 包含 @media, @keyframes 等 CSS @ 规则
      /@(media|keyframes|import|charset|namespace|supports|document|page|font-face|viewport)/.test(content) ||
      // 检查是否有典型的 CSS 属性
      /(?:color|background|margin|padding|border|font|display|position|width|height|top|left|right|bottom)\s*:/i.test(content)
    ) && 
    // 排除包含明显 JavaScript/TypeScript 语法的内容
    !(
      /(?:import|export|const|let|var|function|class|interface|type)\s/.test(content) ||
      /=>\s*\{/.test(content) ||  // 箭头函数
      /<[A-Z]/.test(content) ||   // JSX 组件
      /React\./.test(content)     // React 相关代码
    );
    
    if (isCssContent) {
      // CSS文件处理
      return `
        // CSS模块: ${moduleId}
        const style = document.createElement('style');
        style.textContent = \`${content.replace(/`/g, '\\`')}\`;
        document.head.appendChild(style);
        
        globalThis.__moduleExports = {};
        globalThis.__moduleExports.default = {};
      `;
    }
    
    // 使用 Babel 编译 JavaScript/TypeScript，但不处理 import/export
    const result = Babel.transform(content, {
      presets: [
        ['env', { 
          targets: { 
            browsers: ['last 2 versions'] 
          },
          modules: false
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
        // 先不用自定义插件，用后处理的方式
        'proposal-class-properties',
        'proposal-object-rest-spread'
      ],
      filename: `${moduleId}.tsx`
    });

    let compiledCode = result.code;
    
    // 后处理：手动处理 import/export
    // 1. 处理 React 导入
    compiledCode = compiledCode.replace(
      /import\s+React\s*,?\s*(\{[^}]*\})?\s*from\s+['"]react['"];?\s*/g,
      function(match, hooks) {
        let replacement = 'const React = globalThis.React;\n';
        if (hooks) {
          // 处理 hooks 导入
          const hookList = hooks.replace(/[{}]/g, '').split(',').map(h => h.trim()).filter(h => h);
          hookList.forEach(hook => {
            replacement += `const ${hook} = React.${hook};\n`;
          });
        }
        return replacement;
      }
    );
    
    // 2. 处理纯 hooks 导入
    compiledCode = compiledCode.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?\s*/g,
      function(match, hooks) {
        const hookList = hooks.split(',').map(h => h.trim());
        return hookList.map(hook => `const ${hook} = React.${hook};`).join('\n') + '\n';
      }
    );
    
    // 3. 处理相对路径导入
    compiledCode = compiledCode.replace(
      /import\s+(\w+)\s+from\s+['"](\.[^'"]+)['"];?\s*/g,
      function(match, varName, importPath) {
        const resolvedPath = importPath.replace(/^\.\//, '').replace(/\.(tsx?|jsx?)$/, '');
        return `const ${varName} = __getModule('${resolvedPath}').default || __getModule('${resolvedPath}');\n`;
      }
    );
    
    // 4. 移除 CSS 导入
    compiledCode = compiledCode.replace(/import\s+['"][^'"]*\.css['"];?\s*/g, '');
    
    // 5. 处理 export default
    // 处理多种形式的 export default
    compiledCode = compiledCode.replace(
      /export\s+default\s+([^;]+);?\s*/g,
      function(match, exportName) {
        // 清理导出名称中的多余空格
        const cleanExportName = exportName.trim();
        console.log(`🔄 处理 export default: "${exportName}" -> "${cleanExportName}"`);
        return `globalThis.__moduleExports = ${cleanExportName};\nglobalThis.__moduleExports.default = ${cleanExportName};\n`;
      }
    );
    
    // 处理可能的其他 export 形式
    compiledCode = compiledCode.replace(
      /export\s*\{\s*([^}]+)\s+as\s+default\s*\};?\s*/g,
      function(match, exportName) {
        const cleanExportName = exportName.trim();
        console.log(`🔄 处理 export {name as default}: "${exportName}" -> "${cleanExportName}"`);
        return `globalThis.__moduleExports = ${cleanExportName};\nglobalThis.__moduleExports.default = ${cleanExportName};\n`;
      }
    );
    
    // 6. 处理命名 export
    compiledCode = compiledCode.replace(
      /export\s+\{\s*([^}]+)\s*\};?\s*/g,
      function(match, exports) {
        const exportList = exports.split(',').map(exp => exp.trim());
        let result = 'globalThis.__moduleExports = globalThis.__moduleExports || {};\n';
        exportList.forEach(exp => {
          result += `globalThis.__moduleExports.${exp} = ${exp};\n`;
        });
        return result;
      }
    );
    
    // 7. 检查是否还有未处理的 export 语句
    const remainingExports = compiledCode.match(/export\s+[^;]+;?/g);
    if (remainingExports) {
      console.warn(`⚠️ ${moduleId} 中发现未处理的 export:`, remainingExports);
      
      // 尝试处理剩余的 export 语句
      remainingExports.forEach(exportStatement => {
        console.log(`🔍 分析未处理的 export: "${exportStatement}"`);
      });
    }
    
    // 8. 如果没有 export，检查是否有组件可以自动导出
    if (!compiledCode.includes('globalThis.__moduleExports')) {
      console.log(`⚠️ ${moduleId} 没有导出，尝试自动检测组件`);
      
      // 查找可能的组件定义
      const componentMatch = compiledCode.match(/(?:const|var|let)\s+(\w+)\s*=/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        console.log(`🔍 自动导出组件: ${componentName}`);
        compiledCode += `\nglobalThis.__moduleExports = ${componentName};\nglobalThis.__moduleExports.default = ${componentName};\n`;
      }
    }
    
    return compiledCode;
  } catch (error) {
    console.error(`编译模块 ${moduleId} 失败:`, error);
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
    const importRegex = /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const resolvedPath = importPath.replace(/^\.\//, '').replace(/\.(tsx?|jsx?)$/, '');
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
function generateBundle(compiledModules, moduleOrder, entryModule) {
  const moduleRegistry = `
    const __moduleCache = new Map();
    const __moduleRegistry = new Map();
    
    function __registerModule(id, factory) {
      __moduleRegistry.set(id, factory);
    }
    
    function __getModule(id) {
      console.log('请求模块:', id);
      
      if (__moduleCache.has(id)) {
        console.log('从缓存返回模块:', id);
        return __moduleCache.get(id);
      }
      
      const factory = __moduleRegistry.get(id);
      if (!factory) {
        console.error('模块未找到:', id);
        console.log('可用模块:', Array.from(__moduleRegistry.keys()));
        throw new Error('模块未找到: ' + id);
      }
      
      console.log('执行模块工厂:', id);
      globalThis.__moduleExports = {};
      
      try {
        factory();
        const exports = globalThis.__moduleExports;
        console.log('模块导出:', id, exports);
        __moduleCache.set(id, exports);
        return exports;
      } catch (error) {
        console.error('执行模块失败:', id, error);
        throw new Error('执行模块 ' + id + ' 失败: ' + error.message);
      }
    }
    
    if (!globalThis.React) {
      throw new Error('React未加载');
    }
  `;

  let moduleRegistrations = '';
  moduleOrder.forEach(moduleId => {
    const compiledCode = compiledModules[moduleId];
    console.log(`注册模块 ${moduleId}, 编译后代码长度:`, compiledCode.length);
    moduleRegistrations += `
      __registerModule('${moduleId}', function() {
        ${compiledCode}
      });
    `;
  });

  const entryExecution = `
    try {
      const entryModule = __getModule('${entryModule}');
      const Component = entryModule.default || entryModule;
      
      if (typeof Component === 'function') {
        globalThis.__EntryComponent = Component;
      } else {
        throw new Error('入口模块没有导出有效的React组件');
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
  const request = event.data;
  
  try {
    console.log('开始编译，模块数量:', Object.keys(request.modules).length);
    console.log('模块列表:', Object.keys(request.modules));
    
    // 输出所有模块的详细信息
    Object.entries(request.modules).forEach(([moduleId, module]) => {
      console.log(`模块 ${moduleId}:`, {
        id: module.id,
        content: module.content.substring(0, 100) + '...'
      });
    });
    
    const dependencyResult = buildDependencyGraph(request.modules);
    
    if (dependencyResult.errors.length > 0) {
      throw new Error('依赖分析失败:\n' + dependencyResult.errors.join('\n'));
    }
    
    console.log('依赖顺序:', dependencyResult.order);
    
    const compiledModules = {};
    
    dependencyResult.order.forEach(moduleId => {
      const module = request.modules[moduleId];
      console.log(`编译模块: ${moduleId}`);
      
      try {
        const compiledCode = compileModule(module.content, moduleId, request.modules);
        compiledModules[moduleId] = compiledCode;
        console.log(`✓ 模块 ${moduleId} 编译成功`);
        
        // 输出编译后的代码以便调试
        if (moduleId.toLowerCase() === 'cas' || moduleId === 'Cas') {
          console.log(`🔍 ${moduleId} 原始代码:`, module.content);
          console.log(`🔍 ${moduleId} 编译后代码:`, compiledCode);
        }
      } catch (error) {
        console.error(`✗ 模块 ${moduleId} 编译失败:`, error);
        throw error;
      }
    });
    
    const bundleCode = generateBundle(compiledModules, dependencyResult.order, request.entryModule);
    
    console.log('编译完成');
    
    self.postMessage({
      id: request.id,
      success: true,
      bundleCode: bundleCode
    });
    
  } catch (error) {
    console.error('编译失败:', error);
    
    self.postMessage({
      id: request.id,
      success: false,
      error: error.message
    });
  }
}; 