# ProClaw v0.1.0 Beta 1 - 发布说明

**发布日期**: 2026年4月15日  
**版本**: v0.1.0-beta.1  
**类型**: Beta测试版  

---

## 🎉 重要更新

本次发布是ProClaw桌面应用的第一个Beta版本，包含大量新功能和优化！

### ✨ 核心新功能

#### 1. 全系统自动编码功能

为所有核心业务模块添加了智能自动编码，大幅提升数据录入效率：

- **商品SKU自动编码**: `SKU-YYYYMMDD-XXXX` (如: SKU-20260415-A3F7)
- **供应商自动编码**: `SUP-YYYYMMDD-XXXX` (如: SUP-20260415-B8K2)
- **客户自动编码**: `CUS-YYYYMMDD-XXXX` (如: CUS-20260415-M9X1)
- **采购订单自动编号**: `PO-YYYYMMDD-XXXX` (如: PO-20260415-X7Y3)
- **销售订单自动编号**: `SO-YYYYMMDD-XXXX` (如: SO-20260415-K2M8)

**特性**:
- ✅ 新建时自动生成唯一编码
- ✅ 支持手动修改和自定义
- ✅ "重新生成"按钮获取新编码
- ✅ 前端生成 + 后端验证双重保障

#### 2. 商品库双模式架构

支持两种商品管理模式，满足不同用户需求：

- **简单商品库模式** (默认)
  - 适合小商家、农场、作坊
  - 单表结构，简单易用
  - 快速上手，无需学习成本

- **电商商品库模式** (SPU-SKU)
  - 适合电商、零售企业
  - SPU-SKU多规格管理
  - 完整的电商标准功能

**特性**:
- ✅ 一键升级到电商模式
- ✅ 数据自动迁移（Product → SPU + SKU）
- ✅ 支持降级回简单模式
- ✅ 向导式升级流程

#### 3. Rust后端模块化重构

将单体commands.rs拆分为多个模块，提升代码可维护性：

- `product_commands.rs` - 商品管理命令
- `purchase_commands.rs` - 采购管理命令
- `sales_commands.rs` - 销售管理命令
- `inventory_commands.rs` - 库存管理命令
- `finance_commands.rs` - 财务管理命令
- `common_commands.rs` - 通用命令
- `types.rs` - 类型定义

**优势**:
- ✅ 代码结构清晰
- ✅ 易于维护和扩展
- ✅ 降低耦合度
- ✅ 便于团队协作

---

## 🔧 功能改进

### AI智能体增强

- ✨ AI Chat窗口支持拖拽移动
- ✨ 支持最大化/最小化
- ✨ 记住窗口位置和大小
- ✨ 智能检测Supabase连接状态
- ✨ 引导用户配置API密钥

### 商品管理优化

- ✨ 支持多图上传和管理
- ✨ 商品图片预览和删除
- ✨ 自动编号生成功能
- ✨ 改进的搜索和过滤

### 仪表板改进

- ✨ 适配SPU-SKU架构
- ✨ 实时数据展示
- ✨ 性能优化
- ✨ 修复空白页面问题

### 用户体验优化

- ✨ 设置页面去除冗余标题
- ✨ 统一黑白灰UI风格
- ✨ 改进的响应式布局
- ✨ 更清晰的错误提示

---

## 🐛 Bug修复

- 🐛 修复登录路由跳转问题
- 🐛 修复RLS递归错误
- 🐛 修复SPU-SKU重构导致的页面空白
- 🐛 修复数据库迁移脚本幂等性问题
- 🐛 修复PostgreSQL触发器创建错误
- 🐛 修复TypeScript类型错误
- 🐛 修复构建配置问题

---

## 📚 新增文档

### 功能文档

- `AUTO_SKU_GENERATION_FEATURE.md` - 商品SKU自动编码详解
- `SUPPLIER_CUSTOMER_AUTO_CODE_FEATURE.md` - 供应商和客户自动编码
- `PURCHASE_SALES_ORDER_AUTO_CODE_FEATURE.md` - 订单自动编号
- `MULTI_IMAGE_UPLOAD_FEATURE.md` - 多图上传功能说明

### 技术文档

- `docs/AUTO_GENERATE_CODE_IMPLEMENTATION.md` - 自动编码实现细节
- `docs/RUST_BACKEND_SPU_SKU_GUIDE.md` - Rust后端SPU-SKU指南
- `docs/COMMAND_PARSER_SPU_SKU_FIX.md` - 命令解析器修复
- `docs/DOMAIN_CHANGE_TO_PROCLAW_CC.md` - 域名变更说明

### 测试文档

- `DUAL_MODE_TEST_GUIDE.md` - 双模式测试指南
- `DUAL_MODE_E2E_TEST_REPORT.md` - E2E测试报告
- `docs/DASHBOARD_TESTING_GUIDE.md` - 仪表板测试指南

---

## 🗄️ 数据库变更

### 新增表

- `product_spus` - SPU主表
- `product_skus` - SKU子表
- `product_images` - 商品图片表
- `product_attributes` - 商品属性表

### 新增索引

- 商品编码唯一索引
- SPU/SKU关联索引
- 供应商/客户编码索引
- 订单号唯一索引

### 迁移脚本

- `database/spu_sku_schema.sql` - PostgreSQL Schema
- `database/spu_sku_schema_sqlite.sql` - SQLite Schema
- `database/migrate_to_ecommerce.sql` - 升级迁移脚本

---

## 🧪 测试覆盖

### 单元测试

- ✅ 商品服务测试 (productService.test.ts)
- ✅ 库存服务测试 (inventoryService.test.ts)
- ✅ 销售服务测试 (salesService.test.ts)
- ✅ 命令解析器测试 (commandParser.test.ts)
- ✅ 仪表板组件测试 (dashboard.test.tsx)

### E2E测试

- ✅ 双模式商品库测试 (dual-mode-library.spec.ts)
  - 24个测试用例
  - 覆盖升级、降级、边界情况
  - UI/UX体验测试

---

## 📦 安装包信息

**文件名**: `ProClaw_0.1.0_x64_en-US.msi`  
**文件大小**: 5.04 MB  
**支持系统**: Windows 10/11 (x64)  
**安装方式**: MSI安装包  

**安装步骤**:
1. 下载MSI安装包
2. 双击运行安装程序
3. 按照向导完成安装
4. 启动ProClaw Desktop

---

## 🚀 快速开始

### 演示模式（推荐新手）

```bash
# 无需配置，开箱即用
VITE_DEMO_MODE=true
npm run tauri dev
```

### Supabase云端模式（推荐生产）

1. 在 [Supabase](https://supabase.com) 创建项目
2. 获取Project URL和anon key
3. 配置`.env.local`文件
4. 执行数据库迁移脚本
5. 启动应用

详细指南：[NEW_DATABASE_SETUP.md](docs/guides/NEW_DATABASE_SETUP.md)

---

## ⚠️ 已知问题

详见 [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)

### 主要问题

1. **时区问题**: 自动编码使用UTC时间，可能导致日期偏差
   - 影响：低
   - 计划：v0.1.1修复

2. **编码唯一性**: 理论上可能重复（概率<1/160万/天）
   - 影响：极低
   - 计划：v0.2.0添加数据库唯一约束

3. **大包体积**: JS bundle超过2MB
   - 影响：首次加载稍慢
   - 计划：v0.2.0代码分割优化

---

## 🔮 下一步计划

### v0.1.1 (预计2周后)

- [ ] 修复时区问题
- [ ] 添加数据库唯一约束
- [ ] 优化加载性能
- [ ] 完善错误处理

### v0.2.0 (预计1个月后)

- [ ] 代码分割优化
- [ ] 营销网站部署到Vercel
- [ ] 配置域名proclaw.cc
- [ ] 添加更多E2E测试
- [ ] 性能监控和分析

### v1.0.0 (预计3个月后)

- [ ] 稳定版发布
- [ ] 完整文档体系
- [ ] 社区建设
- [ ] 插件市场

---

## 🙏 致谢

感谢所有贡献者和测试用户！

特别感谢：
- Tauri团队 - 优秀的桌面应用框架
- Supabase团队 - 强大的后端即服务平台
- React团队 - 灵活的前端库
- 所有早期测试用户 - 宝贵的反馈和建议

---

## 📞 支持与反馈

### 遇到问题？

1. 查看 [已知问题](docs/KNOWN_ISSUES.md)
2. 搜索 [GitHub Issues](https://github.com/BiglionX/ProClaw/issues)
3. 提交新的Issue

### 提供反馈

- 🐛 Bug报告: [GitHub Issues](https://github.com/BiglionX/ProClaw/issues/new?template=bug_report.md)
- 💡 功能建议: [GitHub Discussions](https://github.com/BiglionX/ProClaw/discussions)
- 📧 邮件联系: support@proclaw.cc

---

## 📄 许可证

本项目采用 **GNU General Public License v3.0** 许可证

详见 [LICENSE](LICENSE) 文件

---

## 🔗 相关链接

- **官方网站**: https://proclaw.cc (即将上线)
- **GitHub仓库**: https://github.com/BiglionX/ProClaw
- **文档中心**: https://github.com/BiglionX/ProClaw/tree/main/docs
- **问题追踪**: https://github.com/BiglionX/ProClaw/issues
- **讨论区**: https://github.com/BiglionX/ProClaw/discussions

---

**祝您使用愉快！** 🦞

*ProClaw开发团队*  
*2026年4月15日*
