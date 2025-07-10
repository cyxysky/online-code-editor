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

// 流行的React生态依赖库
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
    name: 'moment',
    description: '日期处理库',
    defaultVersion: '2.29.4',
    cdnPath: 'moment.min.js'
  },
  {
    name: 'classnames',
    description: 'CSS类名工具',
    defaultVersion: '2.3.2',
    cdnPath: 'index.js'
  },
  {
    name: 'uuid',
    description: 'UUID生成器',
    defaultVersion: '9.0.1',
    cdnPath: 'dist/umd/uuid.min.js'
  },
  {
    name: 'dayjs',
    description: '轻量级日期库',
    defaultVersion: '1.11.10',
    cdnPath: 'dayjs.min.js'
  },
  {
    name: 'ramda',
    description: '函数式编程库',
    defaultVersion: '0.29.1',
    cdnPath: 'dist/ramda.min.js'
  }
];

// 包名到CDN路径的映射表
const CDN_PATH_MAP: Record<string, string> = {
  'lodash': 'lodash.min.js',
  'axios': 'dist/axios.min.js', 
  'moment': 'moment.min.js',
  'classnames': 'index.js',
  'uuid': 'dist/umd/uuid.min.js',
  'dayjs': 'dayjs.min.js',
  'ramda': 'dist/ramda.min.js',
  'react-router-dom': 'dist/umd/react-router-dom.min.js',
  'styled-components': 'dist/styled-components.min.js',
  'prop-types': 'prop-types.min.js',
  'react-transition-group': 'dist/react-transition-group.min.js'
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

  // 生成CDN URL
  const generateCdnUrl = useCallback((packageName: string, version: string): string => {
    // 优先使用已知的CDN路径映射
    const knownPath = CDN_PATH_MAP[packageName];
    if (knownPath) {
      return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${knownPath}`;
    }
    
    // 对于未知包，尝试常见的几种路径
    const commonPaths = [
      `${packageName}.min.js`,           // 包名.min.js
      `dist/${packageName}.min.js`,      // dist/包名.min.js  
      `dist/umd/${packageName}.min.js`,  // dist/umd/包名.min.js
      'index.js',                        // index.js
      'dist/index.js'                    // dist/index.js
    ];
    
    // 默认返回第一个路径，实际使用时会自动尝试其他路径
    return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${commonPaths[0]}`;
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

  // 验证CDN URL是否可访问
  const validateCdnUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // 为包查找可用的CDN URL
  const findValidCdnUrl = useCallback(async (packageName: string, version: string): Promise<string> => {
    const knownPath = CDN_PATH_MAP[packageName];
    if (knownPath) {
      return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${knownPath}`;
    }

    // 对于未知包，尝试多种常见路径
    const tryPaths = [
      `${packageName}.min.js`,
      `dist/${packageName}.min.js`,
      `dist/umd/${packageName}.min.js`,
      'index.js',
      'dist/index.js',
      `${packageName}.js`,
      `dist/${packageName}.js`,
      'dist/index.min.js'
    ];

    for (const path of tryPaths) {
      const url = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`;
      console.log(`🔍 尝试CDN路径: ${url}`);
      if (await validateCdnUrl(url)) {
        console.log(`✅ 找到可用路径: ${url}`);
        return url;
      }
    }

    // 如果都不行，返回默认路径
    return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${packageName}.min.js`;
  }, [validateCdnUrl]);

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
      
      const packageInfo = await fetchPackageInfo(newPackageName);
      const version = newPackageVersion || packageInfo.version;
      const cdnUrl = await findValidCdnUrl(newPackageName, version);

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
      
      // 并行获取包信息和CDN URL
      const [packageInfo, cdnUrl] = await Promise.all([
        fetchPackageInfo(packageName),
        findValidCdnUrl(packageName, version)
      ]);

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