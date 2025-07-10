import React, { useState, useCallback, useEffect } from 'react';

export interface Dependency {
  name: string;
  version: string;
  cdnUrl: string;
  description?: string;
  isLoading?: boolean;
  isInstalled?: boolean;
}

interface DependencyManagerProps {
  dependencies: Dependency[];
  onDependencyAdd: (dependency: Dependency) => void;
  onDependencyRemove: (name: string) => void;
  onDependencyUpdate: (name: string, version: string) => void;
}

// 流行的前端生态依赖库
const POPULAR_PACKAGES = [
  {
    name: 'lodash',
    description: '实用工具库',
    defaultVersion: '4.17.21',
    cdnPath: 'lodash.min.js'
  },
  {
    name: 'axios',
    description: 'HTTP客户端',
    defaultVersion: '1.6.0',
    cdnPath: 'dist/axios.min.js'
  },
  {
    name: 'vue',
    description: 'Vue.js框架',
    defaultVersion: '3.3.8',
    cdnPath: 'dist/vue.global.min.js'
  },
  {
    name: 'react',
    description: 'React框架',
    defaultVersion: '18.2.0',
    cdnPath: 'umd/react.production.min.js'
  },
  {
    name: 'react-dom',
    description: 'React DOM',
    defaultVersion: '18.2.0',
    cdnPath: 'umd/react-dom.production.min.js'
  },
  {
    name: 'moment',
    description: '日期处理库',
    defaultVersion: '2.29.4',
    cdnPath: 'moment.min.js'
  },
  {
    name: 'dayjs',
    description: '轻量级日期库',
    defaultVersion: '1.11.10',
    cdnPath: 'dayjs.min.js'
  },
  {
    name: 'three',
    description: '3D图形库',
    defaultVersion: '0.158.0',
    cdnPath: 'build/three.min.js'
  },
  {
    name: 'ramda',
    description: '函数式编程库',
    defaultVersion: '0.29.1',
    cdnPath: 'dist/ramda.min.js'
  },
  {
    name: 'd3',
    description: '数据可视化库',
    defaultVersion: '7.8.5',
    cdnPath: 'dist/d3.min.js'
  }
];

// 包名到CDN路径的映射表
const CDN_PATH_MAP: Record<string, string> = {
  'lodash': 'lodash.min.js',
  'axios': 'dist/axios.min.js', 
  'moment': 'moment.min.js',
  'dayjs': 'dayjs.min.js',
  'ramda': 'dist/ramda.min.js',
  // React 生态
  'react': 'umd/react.production.min.js',
  'react-dom': 'umd/react-dom.production.min.js',
  'react-router-dom': 'dist/umd/react-router-dom.min.js',
  'styled-components': 'dist/styled-components.min.js',
  'prop-types': 'prop-types.min.js',
  'react-transition-group': 'dist/react-transition-group.min.js',
  // Vue 生态
  'vue': 'dist/vue.global.min.js',
  'vuex': 'dist/vuex.global.min.js',
  'vue-router': 'dist/vue-router.global.min.js',
  // 其他流行库
  'three': 'build/three.min.js',
  'd3': 'dist/d3.min.js',
  'gsap': 'dist/gsap.min.js',
  'chart.js': 'dist/chart.min.js',
  'fabric': 'dist/fabric.min.js',
  'pixi.js': 'dist/pixi.min.js',
  'babylonjs': 'dist/babylon.js',
  // 工具库
  'classnames': 'index.js',
  'uuid': 'dist/umd/uuid.min.js',
  'jquery': 'dist/jquery.min.js'
};

const DependencyManager: React.FC<DependencyManagerProps> = ({
  dependencies,
  onDependencyAdd,
  onDependencyRemove,
  onDependencyUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageVersion, setNewPackageVersion] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // 获取包信息从unpkg
  const fetchPackageInfo = useCallback(async (packageName: string): Promise<any> => {
    try {
      const response = await fetch(`https://unpkg.com/${packageName}/package.json`);
      if (!response.ok) {
        throw new Error('包不存在');
      }
      return await response.json();
    } catch (error) {
      throw new Error(`获取包信息失败: ${error}`);
    }
  }, []);

  // 从package.json分析正确的入口文件
  const analyzePackageEntry = useCallback((packageInfo: any): string[] => {
    const possiblePaths: string[] = [];
    
    // 1. 优先使用CDN特定字段
    if (packageInfo.unpkg) {
      possiblePaths.push(packageInfo.unpkg);
    }
    
    if (packageInfo.jsdelivr) {
      possiblePaths.push(packageInfo.jsdelivr);
    }
    
    // 2. 浏览器环境入口
    if (packageInfo.browser) {
      if (typeof packageInfo.browser === 'string') {
        possiblePaths.push(packageInfo.browser);
      } else if (typeof packageInfo.browser === 'object') {
        // browser字段是对象时，查找主入口的映射
        const browserMain = packageInfo.browser[packageInfo.main || './index.js'];
        if (browserMain) {
          possiblePaths.push(browserMain);
        }
      }
    }
    
    // 3. ES模块入口（通常更现代）
    if (packageInfo.module) {
      possiblePaths.push(packageInfo.module);
    }
    
    // 4. CommonJS主入口
    if (packageInfo.main) {
      possiblePaths.push(packageInfo.main);
    }
    
    // 5. 如果都没有，使用默认的index.js
    if (possiblePaths.length === 0) {
      possiblePaths.push('index.js');
    }
    
    // 6. 为每个路径生成可能的变体（压缩版本）
    const allPaths: string[] = [];
    possiblePaths.forEach(path => {
      // 原始路径
      allPaths.push(path.replace(/^\.\//, ''));
      
      // 尝试压缩版本
      if (!path.includes('.min.')) {
        const minPath = path.replace(/\.js$/, '.min.js');
        allPaths.push(minPath.replace(/^\.\//, ''));
      }
      
      // 尝试UMD版本（用于浏览器）
      if (!path.includes('umd') && !path.includes('dist')) {
        const umdPath = `dist/umd/${path.replace(/^\.\//, '')}`;
        allPaths.push(umdPath);
        allPaths.push(umdPath.replace(/\.js$/, '.min.js'));
      }
    });
    
    // 7. 添加常见的fallback路径
    const fallbackPaths = [
      `dist/${packageInfo.name}.min.js`,
      `dist/${packageInfo.name}.js`,
      `${packageInfo.name}.min.js`,
      `${packageInfo.name}.js`,
      'dist/index.min.js',
      'dist/index.js'
    ];
    
    allPaths.push(...fallbackPaths);
    
    // 去重并返回
    return [...new Set(allPaths)];
  }, []);

  // 搜索包
  const searchPackages = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = POPULAR_PACKAGES.filter(pkg =>
      pkg.name.toLowerCase().includes(query.toLowerCase()) ||
      pkg.description.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  }, []);

  // 验证CDN URL是否可访问且是有效的JavaScript文件
  const validateCdnUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      // 先使用HEAD请求检查文件存在性
      const headResponse = await fetch(url, { method: 'HEAD' });
      if (!headResponse.ok) {
        return false;
      }
      
      // 检查Content-Type
      const contentType = headResponse.headers.get('content-type');
      if (contentType && !contentType.includes('javascript') && !contentType.includes('application/javascript')) {
        // 如果Content-Type不是JavaScript，再做一次GET请求检查内容
        const getResponse = await fetch(url);
        if (!getResponse.ok) {
          return false;
        }
        
        // 读取一小部分内容来验证是否是JavaScript
        const text = await getResponse.text();
        
        // 检查是否包含常见的JavaScript模式
        const jsPatterns = [
          /^\/\*[\s\S]*?\*\//, // 注释
          /\bfunction\b/,      // function关键字
          /\bvar\b|\blet\b|\bconst\b/, // 变量声明
          /\bmodule\.exports\b/, // CommonJS
          /\bexport\b/,        // ES模块
          /\breturn\b/,        // return语句
          /[{};]/              // JavaScript语法符号
        ];
        
        const hasJsContent = jsPatterns.some(pattern => pattern.test(text.substring(0, 1000)));
        
        if (!hasJsContent) {
          console.warn(`⚠️ URL返回的内容不是有效的JavaScript: ${url}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ 验证CDN URL失败: ${url}`, error);
      return false;
    }
  }, []);

  // 为包查找可用的CDN URL（基于package.json分析）
  const findValidCdnUrl = useCallback(async (packageName: string, version: string, packageInfo?: any): Promise<string> => {
    console.log(`📦 开始为 ${packageName}@${version} 查找可用CDN URL`);
    
    try {
      // 如果没有传入packageInfo，先获取
      let pkgInfo = packageInfo;
      if (!pkgInfo) {
        console.log(`📋 获取 ${packageName} 的package.json信息...`);
        pkgInfo = await fetchPackageInfo(packageName);
      }
      
      // 分析package.json获取可能的入口文件路径
      const possiblePaths = analyzePackageEntry(pkgInfo);
      console.log(`🔍 从package.json分析得到 ${possiblePaths.length} 个可能路径:`, possiblePaths);
      
      // 按优先级尝试每个路径
      for (let i = 0; i < possiblePaths.length; i++) {
        const path = possiblePaths[i];
        const url = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`;
        
        console.log(`🔍 [${i + 1}/${possiblePaths.length}] 验证: ${url}`);
        
        if (await validateCdnUrl(url)) {
          console.log(`✅ 找到可用CDN URL: ${url}`);
          return url;
        }
      }
      
      console.warn(`⚠️ 所有路径都不可用，使用fallback路径`);
      
    } catch (error) {
      console.error(`❌ 分析package.json失败:`, error);
    }
    
    // Fallback: 使用预定义映射或默认路径
    const knownPath = CDN_PATH_MAP[packageName];
    if (knownPath) {
      const fallbackUrl = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${knownPath}`;
      console.log(`🔄 使用预定义路径: ${fallbackUrl}`);
      return fallbackUrl;
    }
    
    // 最后的fallback
    const defaultUrl = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${packageName}.min.js`;
    console.log(`🔄 使用默认路径: ${defaultUrl}`);
    return defaultUrl;
    
  }, [validateCdnUrl, fetchPackageInfo, analyzePackageEntry]);

  // 添加依赖
  const handleAddDependency = useCallback(async () => {
    if (!newPackageName.trim()) return;

    const dependency: Dependency = {
      name: newPackageName,
      version: newPackageVersion || 'latest',
      cdnUrl: '',
      isLoading: true
    };

    onDependencyAdd(dependency);

    try {
      console.log(`📦 开始添加自定义依赖: ${newPackageName}`);
      
      // 获取package.json信息
      const packageInfo = await fetchPackageInfo(newPackageName);
      const version = newPackageVersion || packageInfo.version;
      
      // 基于package.json分析并查找可用的CDN URL
      const cdnUrl = await findValidCdnUrl(newPackageName, version, packageInfo);

      const finalDependency: Dependency = {
        name: newPackageName,
        version: version,
        cdnUrl: cdnUrl,
        description: packageInfo.description,
        isInstalled: true
      };

      console.log(`✅ 自定义依赖添加成功: ${newPackageName}`, finalDependency);
      onDependencyAdd(finalDependency);
    } catch (error) {
      console.error('添加依赖失败:', error);
      onDependencyRemove(newPackageName);
      alert(`添加依赖失败: ${error}`);
    }

    setNewPackageName('');
    setNewPackageVersion('');
    setShowAddDialog(false);
  }, [newPackageName, newPackageVersion, fetchPackageInfo, findValidCdnUrl, onDependencyAdd, onDependencyRemove]);

  // 快速添加流行包
  const handleQuickAdd = useCallback(async (packageName: string, version: string) => {
    const dependency: Dependency = {
      name: packageName,
      version: version,
      cdnUrl: '',
      isLoading: true
    };

    onDependencyAdd(dependency);

    try {
      console.log(`📦 开始添加依赖: ${packageName}@${version}`);
      
      // 先获取package.json信息
      const packageInfo = await fetchPackageInfo(packageName);
      
      // 基于package.json分析并查找可用的CDN URL
      const cdnUrl = await findValidCdnUrl(packageName, version, packageInfo);

      const finalDependency: Dependency = {
        name: packageName,
        version: version,
        cdnUrl: cdnUrl,
        description: packageInfo.description,
        isInstalled: true
      };

      console.log(`✅ 依赖添加成功: ${packageName}`, finalDependency);
      onDependencyAdd(finalDependency);
    } catch (error) {
      console.error('添加依赖失败:', error);
      onDependencyRemove(packageName);
      alert(`添加依赖失败: ${error}`);
    }
  }, [fetchPackageInfo, findValidCdnUrl, onDependencyAdd, onDependencyRemove]);

  // 实时搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPackages(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchPackages]);

  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      background: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      padding: '12px 16px',
      borderBottom: '1px solid #e1e4e8',
      background: '#f8f9fa',
    },
    title: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#24292f',
      marginBottom: '8px',
    },
    addButton: {
      padding: '6px 12px',
      background: '#0969da',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '16px',
    },
    searchBox: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      fontSize: '14px',
      marginBottom: '16px',
      outline: 'none',
    },
    dependencyList: {
      marginBottom: '24px',
    },
    dependencyItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      border: '1px solid #e1e4e8',
      borderRadius: '8px',
      marginBottom: '8px',
      background: '#fff',
    },
    dependencyInfo: {
      flex: 1,
    },
    dependencyName: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#24292f',
      marginBottom: '4px',
    },
    dependencyMeta: {
      fontSize: '12px',
      color: '#656d76',
    },
    removeBtn: {
      padding: '4px 8px',
      border: '1px solid #d73a49',
      borderRadius: '4px',
      background: '#fff',
      color: '#d73a49',
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    sectionTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#24292f',
      marginBottom: '12px',
    },
    popularGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '8px',
    },
    popularItem: {
      padding: '12px',
      border: '1px solid #e1e4e8',
      borderRadius: '8px',
      background: '#f8f9fa',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    popularName: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#24292f',
      marginBottom: '4px',
    },
    popularDesc: {
      fontSize: '11px',
      color: '#656d76',
    },
    dialog: {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#fff',
      border: '1px solid #e1e4e8',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      zIndex: 1001,
      padding: '24px',
      minWidth: '400px',
    },
    dialogTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#24292f',
      marginBottom: '16px',
    },
    dialogInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      fontSize: '14px',
      marginBottom: '12px',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    dialogButtons: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      marginTop: '16px',
    },
    dialogButton: {
      padding: '8px 16px',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
    },
    primaryButton: {
      background: '#0969da',
      color: '#fff',
      borderColor: '#0969da',
    },
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
  };

  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>📦 依赖管理</div>
          <button
            style={styles.addButton}
            onClick={() => setShowAddDialog(true)}
          >
            + 添加依赖
          </button>
        </div>

        <div style={styles.content}>
          {/* 已安装的依赖 */}
          {dependencies.length > 0 && (
            <div style={styles.dependencyList}>
              <div style={styles.sectionTitle}>已安装的依赖 ({dependencies.length})</div>
              {dependencies.map((dep) => (
                <div key={dep.name} style={styles.dependencyItem}>
                  <div style={styles.dependencyInfo}>
                    <div style={styles.dependencyName}>{dep.name}</div>
                    <div style={styles.dependencyMeta}>
                      v{dep.version} {dep.description && `• ${dep.description}`}
                    </div>
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() => onDependencyRemove(dep.name)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索依赖包..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchBox}
          />

          {/* 搜索结果 */}
          {searchTerm && searchResults.length > 0 && (
            <div style={styles.dependencyList}>
              <div style={styles.sectionTitle}>搜索结果</div>
              <div style={styles.popularGrid}>
                {searchResults.map((pkg) => (
                  <div
                    key={pkg.name}
                    style={styles.popularItem}
                    onClick={() => handleQuickAdd(pkg.name, pkg.defaultVersion)}
                  >
                    <div style={styles.popularName}>{pkg.name}</div>
                    <div style={styles.popularDesc}>{pkg.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 流行的依赖包 */}
          {!searchTerm && (
            <div style={styles.dependencyList}>
              <div style={styles.sectionTitle}>流行的依赖包</div>
              <div style={styles.popularGrid}>
                {POPULAR_PACKAGES.filter(pkg =>
                  !dependencies.some(dep => dep.name === pkg.name)
                ).map((pkg) => (
                  <div
                    key={pkg.name}
                    style={styles.popularItem}
                    onClick={() => handleQuickAdd(pkg.name, pkg.defaultVersion)}
                  >
                    <div style={styles.popularName}>{pkg.name}</div>
                    <div style={styles.popularDesc}>{pkg.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 添加依赖对话框 */}
      {showAddDialog && (
        <>
          <div
            style={styles.overlay}
            onClick={() => setShowAddDialog(false)}
          />
          <div style={styles.dialog}>
            <div style={styles.dialogTitle}>添加新依赖</div>
            <input
              type="text"
              placeholder="包名 (例如: lodash)"
              value={newPackageName}
              onChange={(e) => setNewPackageName(e.target.value)}
              style={styles.dialogInput}
              autoFocus
            />
            <input
              type="text"
              placeholder="版本 (可选，默认最新版本)"
              value={newPackageVersion}
              onChange={(e) => setNewPackageVersion(e.target.value)}
              style={styles.dialogInput}
            />
            <div style={styles.dialogButtons}>
              <button
                style={styles.dialogButton}
                onClick={() => setShowAddDialog(false)}
              >
                取消
              </button>
              <button
                style={{...styles.dialogButton, ...styles.primaryButton}}
                onClick={handleAddDependency}
                disabled={!newPackageName.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DependencyManager; 