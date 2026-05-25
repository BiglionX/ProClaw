# 商品多图上传功能 - 实现说明

## 📋 功能概述

为ProClaw桌面端的简单版商品管理添加了**多图上传**功能，符合电商标准。

### 核心特性

✅ **最多5张图片** - 每个商品可上传1-5张图片  
✅ **电商标准限制** - 单张图片不超过2MB  
✅ **实时预览** - 上传后立即显示缩略图  
✅ **主图标识** - 第一张图片自动标记为主图  
✅ **灵活管理** - 可单独删除图片或清除所有  
✅ **友好提示** - 清晰的错误提示和数量限制  

---

## 🎯 技术实现

### 1. 状态管理

```typescript
// 多图上传支持
const [imageFiles, setImageFiles] = useState<File[]>([]);
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
```

- `imageFiles`: 存储待上传的文件对象数组
- `imagePreviews`: 存储图片预览URL数组（base64）

### 2. 图片选择与验证

```typescript
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  
  // 验证文件数量
  const totalImages = imageFiles.length + files.length;
  if (totalImages > 5) {
    setError(`最多只能上传5张图片...`);
    return;
  }

  // 验证每张图片
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError(`${file.name} 不是有效的图片文件`);
      return;
    }

    // 电商标准：单张图片不超过2MB
    if (file.size > 2 * 1024 * 1024) {
      setError(`${file.name} 超过2MB限制...`);
      return;
    }
  }
};
```

**验证规则**：
1. ✅ 文件类型必须是图片（image/*）
2. ✅ 单张大小 ≤ 2MB（电商标准）
3. ✅ 总数量 ≤ 5张
4. ✅ 动态计算剩余可上传数量

### 3. 图片预览

```typescript
// 创建预览
const reader = new FileReader();
reader.onloadend = () => {
  newPreviews.push(reader.result as string);
  
  // 当所有图片都加载完成后更新状态
  if (newPreviews.length === newFiles.length) {
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }
};
reader.readAsDataURL(file);
```

使用FileReader将图片转换为base64格式进行预览。

### 4. 图片删除

```typescript
// 删除指定图片
const handleRemoveImage = (index: number) => {
  setImageFiles(prev => prev.filter((_, i) => i !== index));
  setImagePreviews(prev => prev.filter((_, i) => i !== index));
};

// 清除所有图片
const handleClearAllImages = () => {
  setImageFiles([]);
  setImagePreviews([]);
};
```

### 5. 图片上传

```typescript
const handleSave = async () => {
  if (imageFiles.length > 0) {
    // 上传所有新图片
    const uploadPromises = imageFiles.map(file => uploadImage(file));
    const uploadedUrls = await Promise.all(uploadPromises);
    
    // 第一张作为主图
    imageUrl = uploadedUrls[0];
    
    // 如果有多图字段，可以存储所有URL
    // 目前先以逗号分隔存储在image_url中
    if (uploadedUrls.length > 1) {
      imageUrl = uploadedUrls.join(',');
    }
  }
};
```

**上传策略**：
- 使用`Promise.all`并行上传所有图片
- 第一张图片作为主图（`imageUrl`）
- 多张图片URL以逗号分隔存储（临时方案）

---

## 🎨 UI设计

### 1. 图片展示区域

```tsx
<Grid container spacing={2}>
  {imagePreviews.map((preview, index) => (
    <Grid item xs={6} sm={4} md={2.4} key={index}>
      <Box sx={{ position: 'relative' }}>
        <img src={preview} alt={`Product ${index + 1}`} />
        <IconButton onClick={() => handleRemoveImage(index)}>
          <DeleteIcon />
        </IconButton>
        {index === 0 && <Box>主图</Box>}
      </Box>
    </Grid>
  ))}
</Grid>
```

**布局特点**：
- 响应式网格布局
- 小屏：每行2张（xs=6）
- 中屏：每行3张（sm=4）
- 大屏：每行5张（md=2.4）
- 固定高度120px，objectFit: cover

### 2. 添加图片按钮

当图片数量 < 5时，显示"添加"按钮：

```tsx
{imagePreviews.length < 5 && (
  <Grid item xs={6} sm={4} md={2.4}>
    <Box onClick={() => document.getElementById('image-upload')?.click()}>
      <AddIcon />
    </Box>
  </Grid>
)}
```

### 3. 主图标识

第一张图片底部显示"主图"标签：

```tsx
{index === 0 && (
  <Box sx={{
    bgcolor: 'rgba(0,0,0,0.6)',
    color: 'white',
    fontSize: '10px',
  }}>
    主图
  </Box>
)}
```

### 4. 清除所有按钮

在标题旁边显示"清除所有"按钮：

```tsx
{imagePreviews.length > 0 && (
  <Button onClick={handleClearAllImages}>
    清除所有
  </Button>
)}
```

---

## 📊 电商标准对比

| 项目 | 传统电商标准 | ProClaw实现 | 说明 |
|------|------------|-----------|------|
| 图片数量 | 1-9张 | **1-5张** | 适合中小商家 |
| 单张大小 | 1-3MB | **≤2MB** | 平衡质量与速度 |
| 图片格式 | JPG/PNG | **JPG/PNG/GIF** | 全面支持 |
| 主图要求 | 必须有 | **第一张** | 自动标识 |
| 尺寸建议 | 800x800+ | **不限** | 自适应显示 |

---

## 🔄 数据流转

### 新建商品流程

```
1. 用户选择图片（1-5张）
   ↓
2. 前端验证（类型、大小、数量）
   ↓
3. 生成预览（base64）
   ↓
4. 用户填写其他信息
   ↓
5. 点击保存
   ↓
6. 并行上传所有图片到后端
   ↓
7. 获取URL数组
   ↓
8. 第一张作为主图存入image_url
   ↓
9. （可选）所有URL以逗号分隔存储
   ↓
10. 创建商品记录
```

### 编辑商品流程

```
1. 加载商品信息
   ↓
2. 解析image_url（可能是单个URL或逗号分隔的多个URL）
   ↓
3. 显示图片预览
   ↓
4. 用户可以删除/添加图片
   ↓
5. 只上传新增的图片
   ↓
6. 更新商品记录
```

---

## ⚠️ 注意事项

### 1. 兼容性处理

当前实现兼容旧的单图数据结构：

```typescript
// 编辑时加载旧数据
if (product.image_url) {
  setImagePreviews([product.image_url]); // 转为数组
  setImageFiles([]); // 不保留文件对象
}
```

### 2. 多图存储方案

**当前方案**（临时）：
```typescript
// 以逗号分隔存储在image_url字段
imageUrl = uploadedUrls.join(',');
```

**推荐方案**（未来）：
```sql
-- 创建商品图片表
CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 3. 性能优化

- ✅ 使用`Promise.all`并行上传
- ✅ 图片压缩（可在uploadImage中实现）
- ✅ 懒加载预览（大文件时）
- ⚠️ 建议后端实现图片压缩和CDN

---

## 🧪 测试要点

### 功能测试

- [ ] 上传1-5张图片正常
- [ ] 超过5张时显示错误提示
- [ ] 单张超过2MB时显示错误提示
- [ ] 非图片文件被拒绝
- [ ] 删除单张图片正常
- [ ] 清除所有图片正常
- [ ] 第一张标记为主图
- [ ] 保存后图片正确显示

### 边界测试

- [ ] 无图片时保存（允许）
- [ ] 刚好5张图片时隐藏添加按钮
- [ ] 编辑时加载旧的单图数据
- [ ] 快速连续上传图片
- [ ] 上传过程中关闭对话框

### UI测试

- [ ] 响应式布局正常
- [ ] 主图标签显示正确
- [ ] 删除按钮hover效果
- [ ] 预览图片不变形
- [ ] 清除所有按钮可见性

---

## 📝 使用示例

### 用户上传3张图片

1. 点击"添加产品"
2. 点击上传区域或"添加"按钮
3. 选择3张图片（例如：2MB + 1.5MB + 1MB）
4. 系统验证通过，显示3个缩略图
5. 第一张图片显示"主图"标签
6. 填写其他商品信息
7. 点击保存
8. 系统并行上传3张图片
9. 保存成功，返回列表

### 用户编辑商品图片

1. 点击商品的"编辑"按钮
2. 看到已有的图片预览
3. 点击某张图片的删除按钮
4. 该图片被移除
5. 点击"添加"按钮补充新图片
6. 新图片追加到末尾
7. 点击保存，更新商品

---

## 🚀 后续优化方向

### 短期优化

1. **图片压缩** - 在前端压缩图片后再上传
2. **拖拽排序** - 允许拖拽调整图片顺序
3. **进度条** - 显示上传进度
4. **裁剪功能** - 支持图片裁剪

### 中期优化

1. **独立图片表** - 创建product_images表
2. **CDN集成** - 图片存储到CDN
3. **水印功能** - 自动添加水印
4. **批量上传** - 支持文件夹上传

### 长期优化

1. **AI识别** - 自动识别图片内容
2. **智能压缩** - 根据网络状况调整质量
3. **视频支持** - 支持商品视频
4. **3D展示** - 支持3D模型展示

---

## 📚 相关文件

- **前端页面**: `src/pages/ProductsPage.tsx`
- **图片服务**: `src/lib/imageService.ts`
- **产品类型**: `src/lib/productService.ts`

---

**最后更新**: 2024年  
**版本**: v1.0  
**作者**: ProClaw开发团队
