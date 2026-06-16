//! 类型定义单元测试
//! 验证序列化/反序列化正确性

#[cfg(test)]
mod tests {
    use crate::types::*;

    #[test]
    fn test_product_serialization() {
        let product = Product {
            id: "prod1".to_string(),
            sku: "SKU001".to_string(),
            name: "测试产品".to_string(),
            description: Some("描述".to_string()),
            category_id: Some("cat1".to_string()),
            brand_id: Some("brand1".to_string()),
            unit: "个".to_string(),
            cost_price: 100.0,
            sell_price: 150.0,
            min_stock: 10,
            max_stock: 9999,
            current_stock: 50,
            image_url: Some("https://example.com/img.png".to_string()),
            barcode: None,
            is_active: true,
            metadata: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_status: "synced".to_string(),
            last_synced_at: None,
            images: vec![],
        };

        let json = serde_json::to_string(&product).unwrap();
        let deserialized: Product = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, "prod1");
        assert_eq!(deserialized.name, "测试产品");
        assert_eq!(deserialized.cost_price, 100.0);
        assert!(deserialized.is_active);
    }

    #[test]
    fn test_sku_serialization() {
        let sku = ProductSKU {
            id: "sku1".to_string(),
            spu_id: "spu1".to_string(),
            sku_code: "SKU-RED-L".to_string(),
            specifications: r#"{"color":"红色","size":"L"}"#.to_string(),
            spec_text: Some("红色 / L".to_string()),
            cost_price: 80.0,
            sell_price: 120.0,
            current_stock: 30,
            min_stock: 5,
            max_stock: 100,
            barcode: Some("6901234567890".to_string()),
            weight: Some(0.5),
            volume: Some(0.01),
            is_default: true,
            sort_order: 0,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&sku).unwrap();
        let deserialized: ProductSKU = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.sku_code, "SKU-RED-L");
        assert_eq!(deserialized.cost_price, 80.0);
        assert_eq!(deserialized.current_stock, 30);
        assert!(deserialized.is_default);
    }

    #[test]
    fn test_spu_serialization() {
        let spu = ProductSPU {
            id: "spu1".to_string(),
            spu_code: "SPU-20240101-0001".to_string(),
            name: "测试SPU产品".to_string(),
            description: Some("SPU描述".to_string()),
            category_id: Some("cat1".to_string()),
            brand_id: Some("brand1".to_string()),
            unit: "件".to_string(),
            is_on_sale: true,
            status: "active".to_string(),
            metadata: None,
            skus: vec![],
            images: vec![],
            sku_count: 0,
            total_stock: 0,
            min_price: 0.0,
            max_price: 0.0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&spu).unwrap();
        let deserialized: ProductSPU = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.name, "测试SPU产品");
        assert!(deserialized.is_on_sale);
    }

    #[test]
    fn test_inventory_transaction_serialization() {
        let tx = InventoryTransaction {
            id: "tx1".to_string(),
            product_id: "prod1".to_string(),
            transaction_type: "inbound".to_string(),
            quantity: 100,
            reference_no: Some("PO-001".to_string()),
            reason: Some("采购入库".to_string()),
            performed_by: Some("user1".to_string()),
            notes: Some("测试入库".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            sync_status: "synced".to_string(),
        };

        let json = serde_json::to_string(&tx).unwrap();
        let deserialized: InventoryTransaction = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.quantity, 100);
        assert_eq!(deserialized.transaction_type, "inbound");
    }

    #[test]
    fn test_database_stats_serialization() {
        let stats = DatabaseStats {
            products: 100,
            categories: 10,
            transactions: 500,
            pending_sync: 5,
        };

        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("100"));
        assert!(json.contains("5"));
    }

    #[test]
    fn test_migration_result_serialization() {
        let result = MigrationResult {
            migrated_products: 50,
            created_spus: 50,
            created_skus: 100,
            migrated_images: 30,
            duration_ms: 1500,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("50"));
        assert!(json.contains("1500"));
    }

    #[test]
    fn test_create_team_payload() {
        let payload = CreateTeamPayload {
            name: "销售分析团队".to_string(),
            description: Some("分析销售数据".to_string()),
            category: Some("sales".to_string()),
            tags: vec!["ai".to_string(), "analytics".to_string()],
            members: vec![],
            workflow: None,
            triggers: None,
        };

        let json = serde_json::to_string(&payload).unwrap();
        let deserialized: CreateTeamPayload = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.name, "销售分析团队");
        assert_eq!(deserialized.tags.len(), 2);
    }
}
