// WebWorker for compiling JavaScript/TypeScript code with Babel
// 使用 Babel 的原生模块转换功能

// 导入Babel
importScripts('https://unpkg.com/@babel/standalone/babel.min.js');

// 创建自定义的模块解析插件
function createModuleResolverPlugin(modules, dependencies = []) {
  return function({ types: t }) {
    return {
      name: 'custom-module-resolver',
      visitor: {
        ImportDeclaration(path) {
          const source = path.node.source.value;
          
          // 处理React导入 - 转换为全局变量
          if (source === 'react') {
            const specifiers = path.node.specifiers;
            const declarations = [];
            
            specifiers.forEach(spec => {
              if (spec.type === 'ImportDefaultSpecifier') {
                // import React from 'react'
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
                // import { useState } from 'react'
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
          
          // 处理外部依赖导入
          const dependency = dependencies.find(dep => dep.name === source);
          if (dependency) {
            const specifiers = path.node.specifiers;
            const declarations = [];
            
            specifiers.forEach(spec => {
              if (spec.type === 'ImportDefaultSpecifier') {
                // import _ from 'lodash'
                declarations.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      spec.local,
                      t.logicalExpression(
                        '||',
                        t.memberExpression(
                          t.memberExpression(
                            t.identifier('globalThis'),
                            t.identifier(dependency.name)
                          ),
                          t.identifier('default')
                        ),
                        t.memberExpression(
                          t.identifier('globalThis'),
                          t.identifier(dependency.name)
                        )
                      )
                    )
                  ])
                );
              } else if (spec.type === 'ImportSpecifier') {
                // import { cloneDeep } from 'lodash'
                declarations.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      spec.local,
                      t.memberExpression(
                        t.memberExpression(
                          t.identifier('globalThis'),
                          t.identifier(dependency.name)
                        ),
                        spec.imported
                      )
                    )
                  ])
                );
              } else if (spec.type === 'ImportNamespaceSpecifier') {
                // import * as _ from 'lodash'
                declarations.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      spec.local,
                      t.memberExpression(
                        t.identifier('globalThis'),
                        t.identifier(dependency.name)
                      )
                    )
                  ])
                );
              }
            });
            
            path.replaceWithMultiple(declarations);
            return;
          }
          
          // 处理CSS导入 - 直接移除
          if (source.endsWith('.css')) {
            path.remove();
            return;
          }
          
          // 处理相对路径导入 - 转换为模块获取
          if (source.startsWith('./') || source.startsWith('../')) {
            const resolvedPath = source.replace(/^\.\//, '').replace(/\.(tsx?|jsx?)$/, '');
            
            if (modules[resolvedPath]) {
              const specifiers = path.node.specifiers;
              const declarations = [];
              
              specifiers.forEach(spec => {
                if (spec.type === 'ImportDefaultSpecifier') {
                  // import Button from './Button'
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
                  // import { Button } from './components'
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
                } else if (spec.type === 'ImportNamespaceSpecifier') {
                  // import * as Components from './components'
                  declarations.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        spec.local,
                        t.callExpression(
                          t.identifier('__getModule'),
                          [t.stringLiteral(resolvedPath)]
                        )
                      )
                    ])
                  );
                }
              });
              
              path.replaceWithMultiple(declarations);
            } else {
              // 模块不存在，移除导入
              console.warn(`模块不存在: ${resolvedPath}`);
              path.remove();
            }
          }
        },
        
        // 处理导出语句
        ExportDefaultDeclaration(path) {
          // export default Component -> __moduleExports.default = Component
          const declaration = path.node.declaration;
          
          path.replaceWith(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier('__moduleExports'),
                  t.identifier('default')
                ),
                declaration
              )
            )
          );
        },
        
        ExportNamedDeclaration(path) {
          const node = path.node;
          const statements = [];
          
          if (node.specifiers && node.specifiers.length > 0) {
            // export { Button, Input }
            node.specifiers.forEach(spec => {
              statements.push(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(
                      t.identifier('__moduleExports'),
                      spec.exported
                    ),
                    spec.local
                  )
                )
              );
            });
          } else if (node.declaration) {
            // export const Button = () => {}
            if (node.declaration.type === 'VariableDeclaration') {
              const declarations = node.declaration.declarations;
              statements.push(path.node.declaration); // 保留原声明
              
              declarations.forEach(decl => {
                if (decl.id.type === 'Identifier') {
                  statements.push(
                    t.expressionStatement(
                      t.assignmentExpression(
                        '=',
                        t.memberExpression(
                          t.identifier('__moduleExports'),
                          decl.id
                        ),
                        decl.id
                      )
                    )
                  );
                }
              });
            } else if (node.declaration.type === 'FunctionDeclaration') {
              // export function Component() {}
              statements.push(node.declaration); // 保留原声明
              statements.push(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(
                      t.identifier('__moduleExports'),
                      node.declaration.id
                    ),
                    node.declaration.id
                  )
                )
              );
            }
          }
          
          if (statements.length > 0) {
            path.replaceWithMultiple(statements);
          } else {
            path.remove();
          }
        }
      }
    };
  };
}

// 编译单个模块
function compileModule(content, moduleId, allModules, dependencies = []) {
  try {
    console.log(`🔄 编译模块: ${moduleId}`);
    
    // 检查是否是CSS文件
    const isCssContent = (
      /[.#][\w-]+\s*\{[^}]*\}/s.test(content) ||
      /[\w-]+\s*:\s*[^;{]+;/s.test(content) ||
      /@(media|keyframes|import|charset|namespace|supports|document|page|font-face|viewport)/.test(content) ||
      /(?:color|background|margin|padding|border|font|display|position|width|height|top|left|right|bottom)\s*:/i.test(content)
    ) && !(
      /(?:import|export|const|let|var|function|class|interface|type)\s/.test(content) ||
      /=>\s*\{/.test(content) ||
      /<[A-Z]/.test(content) ||
      /React\./.test(content)
    );
    
    if (isCssContent) {
      // CSS文件处理
      console.log(`📄 处理CSS文件: ${moduleId}`);
      return `
        // CSS模块: ${moduleId}
        const style = document.createElement('style');
        style.textContent = \`${content.replace(/`/g, '\\`')}\`;
        document.head.appendChild(style);
        
        const __moduleExports = {};
        __moduleExports.default = {};
      `;
    }
    
    // 使用 Babel 编译，使用自定义插件处理模块
    const result = Babel.transform(content, {
      presets: [
        ['env', { 
          targets: { browsers: ['last 2 versions'] },
          modules: false // 不使用标准模块转换，使用我们的自定义插件
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
        createModuleResolverPlugin(allModules, dependencies) // 我们的自定义模块处理插件
      ],
      filename: `${moduleId}.tsx`
    });

    // 在编译后的代码前添加模块导出初始化
    const compiledCode = `
      const __moduleExports = {};
      ${result.code}
      // 确保有导出对象
      if (typeof __moduleExports.default === 'undefined' && Object.keys(__moduleExports).length === 0) {
        // 尝试自动检测可能的组件
        const possibleExports = Object.keys(this || {}).filter(key => 
          typeof this[key] === 'function' && 
          key[0] === key[0].toUpperCase()
        );
        if (possibleExports.length > 0) {
          __moduleExports.default = this[possibleExports[0]];
        }
      }
    `.trim();
    
    console.log(`✅ 模块 ${moduleId} 编译成功`);
    return compiledCode;
    
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
function generateBundle(compiledModules, moduleOrder, entryModule, dependencies = []) {
  const moduleRegistry = `
    const __moduleCache = new Map();
    const __moduleRegistry = new Map();
    
    function __registerModule(id, factory) {
      __moduleRegistry.set(id, factory);
    }
    
    function __getModule(id) {
      if (__moduleCache.has(id)) {
        return __moduleCache.get(id);
      }
      
      const factory = __moduleRegistry.get(id);
      if (!factory) {
        console.error('模块未找到:', id, '可用模块:', Array.from(__moduleRegistry.keys()));
        throw new Error('模块未找到: ' + id);
      }
      
      const exports = factory();
      __moduleCache.set(id, exports);
      return exports;
    }
    
    // 检查React是否可用
    if (!globalThis.React) {
      throw new Error('React未加载，请确保React已正确加载');
    }
  `;

  // 依赖加载代码
  const dependencyLoader = dependencies.length > 0 ? `
    // 外部依赖检查
    const requiredDependencies = ${JSON.stringify(dependencies.map(d => d.name))};
    const missingDependencies = requiredDependencies.filter(dep => !globalThis[dep]);
    
    if (missingDependencies.length > 0) {
      console.warn('以下依赖尚未加载:', missingDependencies);
      // 可以在这里添加动态加载逻辑
    }
  ` : '';

  // 模块注册
  let moduleRegistrations = '';
  moduleOrder.forEach(moduleId => {
    const compiledCode = compiledModules[moduleId];
    moduleRegistrations += `
      __registerModule('${moduleId}', function() {
        ${compiledCode}
        return __moduleExports;
      });
    `;
  });

  // 入口模块执行
  const entryExecution = `
    try {
      const entryModule = __getModule('${entryModule}');
      const Component = entryModule.default || entryModule;
      
      if (typeof Component === 'function') {
        globalThis.__EntryComponent = Component;
        console.log('✅ 入口组件加载成功');
      } else {
        throw new Error('入口模块没有导出有效的React组件');
      }
    } catch (error) {
      console.error('❌ 执行入口模块失败:', error);
      throw error;
    }
  `;

  return moduleRegistry + dependencyLoader + moduleRegistrations + entryExecution;
}

// 处理编译请求
self.onmessage = function(event) {
  const request = event.data;
  
  try {
    console.log('🚀 开始编译，模块数量:', Object.keys(request.modules).length);
    console.log('📦 依赖数量:', (request.dependencies || []).length);
    
    // 构建依赖图
    const dependencyResult = buildDependencyGraph(request.modules);
    
    if (dependencyResult.errors.length > 0) {
      throw new Error('依赖分析失败:\n' + dependencyResult.errors.join('\n'));
    }
    
    console.log('📋 编译顺序:', dependencyResult.order);
    
    // 编译所有模块
    const compiledModules = {};
    
    dependencyResult.order.forEach(moduleId => {
      const module = request.modules[moduleId];
      const compiledCode = compileModule(
        module.content, 
        moduleId, 
        request.modules, 
        request.dependencies || []
      );
      compiledModules[moduleId] = compiledCode;
    });
    
    // 生成最终bundle
    const bundleCode = generateBundle(
      compiledModules, 
      dependencyResult.order, 
      request.entryModule, 
      request.dependencies || []
    );
    
    console.log('✅ 编译完成');
    
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