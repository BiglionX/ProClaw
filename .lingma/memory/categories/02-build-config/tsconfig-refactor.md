# tsconfig移除baseUrl和paths

> 创建时间：2026-06-08  
> 最后更新：2026-06-08  
> 关键词：tsconfig、baseUrl、paths、TypeScript、路径别名

## 变更背景

为了统一项目配置和提升构建性能，ProClaw决定移除tsconfig.json中的baseUrl和paths配置。

## 变更内容

### 变更前
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

### 变更后
```json
{
  "compilerOptions": {
    // baseUrl 和 paths 已移除
  }
}
```

## 影响范围

| 项目目录 | 是否受影响 |
|----------|------------|
| 根目录 src/ | 是 |
| cloud-store/ | 否（独立配置） |
| mobile/ | 否（独立配置） |
| marketing-site/ | 否（独立配置） |

## 迁移指南

### 导入语句变更

**变更前：**
```typescript
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
```

**变更后：**
```typescript
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
```

### 自动化工具

可以使用脚本来批量替换导入语句：
- 搜索模式：`from '@/`
- 替换为：`from '../`（根据文件层级调整）

## 注意事项

1. 相对路径层级需要注意
2. 确保所有导入路径正确
3. IDE可能需要重新索引
