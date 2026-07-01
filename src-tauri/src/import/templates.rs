//! ProClaw 批量导入中心 - 模板生成器（v1.2 P1）
//!
//! 启动时把 6 套 CSV 模板写到 APPDATA/proclaw/desktop/import_templates/，用户从导入中心下载。
//! 模板即「样例数据 + 全部字段列」，用户填好后上传即可。

use std::fs;
use std::path::{Path, PathBuf};

/// 把所有模板写入目录；幂等：目录不存在则创建，存在则跳过
pub fn ensure_templates(base_dir: &Path) -> Result<(), String> {
    if !base_dir.exists() {
        fs::create_dir_all(base_dir).map_err(|e| format!("创建模板目录失败: {}", e))?;
    }

    for (filename, content) in template_files() {
        let path = base_dir.join(filename);
        if !path.exists() {
            fs::write(&path, content).map_err(|e| format!("写入 {} 失败: {}", filename, e))?;
        }
    }
    Ok(())
}

/// 全部模板文件名与内容（启动时拷贝）
fn template_files() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            "products_template.csv",
            PRODUCTS_TEMPLATE,
        ),
        (
            "inventory_template.csv",
            INVENTORY_TEMPLATE,
        ),
        (
            "purchases_template.csv",
            PURCHASES_TEMPLATE,
        ),
        (
            "sales_template.csv",
            SALES_TEMPLATE,
        ),
        (
            "suppliers_template.csv",
            SUPPLIERS_TEMPLATE,
        ),
        (
            "customers_template.csv",
            CUSTOMERS_TEMPLATE,
        ),
    ]
}

/// 返回所有模板的元数据（前端导入中心模板列表用）
pub fn list_templates(base_dir: &Path) -> Vec<TemplateInfo> {
    let infos = vec![
        ("products_template.csv",  "商品库模板",     "导入商品库（每个 SKU 一行）"),
        ("inventory_template.csv", "库存交易模板",   "导入库存入库/出库/调整交易记录"),
        ("purchases_template.csv", "采购订单模板",   "导入采购订单（一个 po_number 多行：每个 SKU 一行）"),
        ("sales_template.csv",     "销售订单模板",   "导入销售订单（一个 so_number 多行：每个 SKU 一行）"),
        ("suppliers_template.csv", "供应商模板",     "导入供应商主数据"),
        ("customers_template.csv", "客户模板",       "导入客户主数据"),
    ];

    infos
        .into_iter()
        .map(|(filename, display_name, description)| TemplateInfo {
            filename: filename.to_string(),
            display_name: display_name.to_string(),
            description: description.to_string(),
            path: base_dir.join(filename).to_string_lossy().to_string(),
            size_bytes: base_dir.join(filename).metadata().map(|m| m.len() as i64).unwrap_or(0),
        })
        .collect()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TemplateInfo {
    pub filename: String,
    pub display_name: String,
    pub description: String,
    pub path: String,
    pub size_bytes: i64,
}

// ============================================
// 6 套 CSV 模板内容
// ============================================

const PRODUCTS_TEMPLATE: &str = "\
sku,name,category,brand,unit,cost_price,sell_price,current_stock,min_stock,max_stock,barcode,description
SKU-001,iPhone 15 电池,iPhone 15 系列,Apple,块,80.00,199.00,50,5,200,6931234560001,原装电池 一年保修
SKU-002,iPhone 14 电池,iPhone 14 系列,Apple,块,75.00,179.00,45,5,200,6931234560002,大容量
SKU-003,通用手机壳,通用配件,Others,个,5.00,29.00,500,50,5000,6931234560003,硅胶材质
";

const INVENTORY_TEMPLATE: &str = "\
sku,transaction_type,quantity,transaction_date,reference_no,reason,notes
SKU-001,inbound,20,2026-07-01,PO-2026-001,采购入库,
SKU-001,outbound,3,2026-07-02,SO-2026-001,销售出库,微信收款
SKU-002,adjustment,1,2026-07-03,,盘盈调整,
提示：transaction_type 可填 inbound / outbound / adjustment / transfer（也支持中文：入库/出库/调整/调拨）
";

const PURCHASES_TEMPLATE: &str = "\
po_number,supplier,order_date,sku,quantity,unit_price,expected_delivery_date,status,notes
PO-2026-001,深圳电池供应商,2026-07-01,SKU-001,50,75.00,2026-07-08,confirmed,已签合同
PO-2026-001,深圳电池供应商,2026-07-01,SKU-002,30,65.00,2026-07-08,confirmed,
PO-2026-002,广州配件批发,2026-07-05,SKU-003,500,4.50,2026-07-12,draft,
提示：同一采购单号多行时，自动汇总为一个采购订单
";

const SALES_TEMPLATE: &str = "\
so_number,customer,order_date,sku,quantity,unit_price,status,notes
SO-2026-001,手机维修店 A,2026-07-01,SKU-001,2,199.00,delivered,微信收款
SO-2026-001,手机维修店 A,2026-07-01,SKU-003,1,29.00,delivered,
SO-2026-002,个人客户李先生,2026-07-02,SKU-002,1,179.00,confirmed,货到付款
提示：同一销售单号多行时，自动汇总为一个销售订单
";

const SUPPLIERS_TEMPLATE: &str = "\
name,code,contact_person,phone,email,address,tax_number
深圳电池供应商,SUP-001,张三,13800138000,supplier@example.com,深圳市南山区,
广州配件批发,SUP-002,李四,13900139000,wholesale@example.com,广州市天河区,
上海品牌代理,SUP-003,王五,13700137000,agent@example.com,上海市浦东新区,913100005987654321
";

const CUSTOMERS_TEMPLATE: &str = "\
name,code,contact_person,phone,email,address,customer_type
手机维修店 A,CUS-001,赵六,13600136000,store-a@example.com,北京市朝阳区,company
个人客户李先生,CUS-002,李先生,13500135000,,深圳市福田区,individual
手机维修店 B,CUS-003,钱七,13400134000,store-b@example.com,杭州市西湖区,company
";

/// 用于 Tauri 命令层：拼接默认模板目录
pub fn default_templates_dir() -> PathBuf {
    // directories::ProjectDirs::from 返回 Option，环试若干个 qualifier/org/app 三元组合
    let base_path: PathBuf = directories::ProjectDirs::from("cc", "proclaw", "proclaw-desktop")
        .or_else(|| directories::ProjectDirs::from("cc", "proclaw", "ProClaw"))
        .or_else(|| directories::ProjectDirs::from("cc", "proclaw", "desktop"))
        .or_else(|| directories::ProjectDirs::from("com", "proclaw", "desktop"))
        .map(|p| p.data_dir().to_path_buf())
        .unwrap_or_else(|| std::env::temp_dir().join("proclaw-desktop").join("data"));
    base_path.join("import_templates")
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_templates_dir_default_not_empty() {
        // 不调用 ensure（不写盘），仅校验返回路径
        let dir = default_templates_dir();
        assert!(dir.to_string_lossy().contains("import_templates"));
    }

    #[test]
    fn test_templates_have_required_headers() {
        // 商品库模板必须有 sku,name
        assert!(PRODUCTS_TEMPLATE.lines().nth(1).unwrap().contains("sku"));
        assert!(PRODUCTS_TEMPLATE.lines().nth(1).unwrap().contains("name"));

        // 库存必须 sku,transaction_type,quantity
        let hdr = INVENTORY_TEMPLATE.lines().next().unwrap();
        assert!(hdr.contains("sku"));
        assert!(hdr.contains("transaction_type"));
        assert!(hdr.contains("quantity"));

        // 采购必须 po_number,supplier,sku
        assert!(PURCHASES_TEMPLATE.lines().next().unwrap().contains("po_number"));
        assert!(PURCHASES_TEMPLATE.lines().next().unwrap().contains("supplier"));
    }

    #[test]
    fn test_list_templates_returns_six() {
        // 不实际读盘，校验 list_templates 返回 6 个
        let tmp = std::env::temp_dir().join("proclaw-templates-test");
        let _ = std::fs::create_dir_all(&tmp);
        // 文件不存在时 size 为 0，依然应该返回 6 个
        let list = list_templates(&tmp);
        assert_eq!(list.len(), 6);
        assert!(list.iter().any(|t| t.filename == "products_template.csv"));
    }
}
