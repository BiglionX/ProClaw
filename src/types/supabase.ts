// Supabase 数据库类型定义
// 基于 schema.sql 自动生成

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // 用户表
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
        };
      };

      // 产品分类
      product_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 品牌
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          logo_url: string | null;
          website_url: string | null;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          slug?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 产品
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          category_id: string | null;
          brand_id: string | null;
          unit: string;
          cost_price: number;
          sell_price: number;
          min_stock: number;
          max_stock: number;
          current_stock: number;
          image_url: string | null;
          barcode: string | null;
          is_active: boolean;
          metadata: string | null;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          sku: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          brand_id?: string | null;
          unit?: string;
          cost_price?: number;
          sell_price?: number;
          min_stock?: number;
          max_stock?: number;
          current_stock?: number;
          image_url?: string | null;
          barcode?: string | null;
          is_active?: boolean;
          metadata?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          brand_id?: string | null;
          unit?: string;
          cost_price?: number;
          sell_price?: number;
          min_stock?: number;
          max_stock?: number;
          current_stock?: number;
          image_url?: string | null;
          barcode?: string | null;
          is_active?: boolean;
          metadata?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 库存交易
      inventory_transactions: {
        Row: {
          id: string;
          product_id: string;
          transaction_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
          quantity: number;
          reference_no: string | null;
          reason: string | null;
          performed_by: string | null;
          notes: string | null;
          created_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
        };
        Insert: {
          id: string;
          product_id: string;
          transaction_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
          quantity: number;
          reference_no?: string | null;
          reason?: string | null;
          performed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          transaction_type?: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
          quantity?: number;
          reference_no?: string | null;
          reason?: string | null;
          performed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
        };
      };

      // 供应商
      suppliers: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          website: string | null;
          payment_terms: string | null;
          tax_number: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          code?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          payment_terms?: string | null;
          tax_number?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          payment_terms?: string | null;
          tax_number?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 采购订单
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          supplier_id: string;
          order_date: string;
          expected_delivery_date: string | null;
          status: 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
          total_amount: number;
          paid_amount: number;
          payment_status: 'unpaid' | 'partial' | 'paid';
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          po_number: string;
          supplier_id: string;
          order_date: string;
          expected_delivery_date?: string | null;
          status?: 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
          total_amount?: number;
          paid_amount?: number;
          payment_status?: 'unpaid' | 'partial' | 'paid';
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          po_number?: string;
          supplier_id?: string;
          order_date?: string;
          expected_delivery_date?: string | null;
          status?: 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
          total_amount?: number;
          paid_amount?: number;
          payment_status?: 'unpaid' | 'partial' | 'paid';
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 采购订单明细
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          received_quantity: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          purchase_order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          received_quantity?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          purchase_order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          received_quantity?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // 客户
      customers: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          website: string | null;
          customer_type: 'individual' | 'company';
          tax_number: string | null;
          credit_limit: number;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          code?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          customer_type?: 'individual' | 'company';
          tax_number?: string | null;
          credit_limit?: number;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          customer_type?: 'individual' | 'company';
          tax_number?: string | null;
          credit_limit?: number;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 销售订单
      sales_orders: {
        Row: {
          id: string;
          so_number: string;
          customer_id: string;
          order_date: string;
          expected_delivery_date: string | null;
          status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
          total_amount: number;
          paid_amount: number;
          payment_status: 'unpaid' | 'partial' | 'paid';
          shipping_address: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          so_number: string;
          customer_id: string;
          order_date: string;
          expected_delivery_date?: string | null;
          status?:
            | 'draft'
            | 'confirmed'
            | 'shipped'
            | 'delivered'
            | 'cancelled';
          total_amount?: number;
          paid_amount?: number;
          payment_status?: 'unpaid' | 'partial' | 'paid';
          shipping_address?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          so_number?: string;
          customer_id?: string;
          order_date?: string;
          expected_delivery_date?: string | null;
          status?:
            | 'draft'
            | 'confirmed'
            | 'shipped'
            | 'delivered'
            | 'cancelled';
          total_amount?: number;
          paid_amount?: number;
          payment_status?: 'unpaid' | 'partial' | 'paid';
          shipping_address?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };

      // 销售订单明细
      sales_order_items: {
        Row: {
          id: string;
          sales_order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          shipped_quantity: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          sales_order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          shipped_quantity?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sales_order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          shipped_quantity?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // 会计科目
      accounts: {
        Row: {
          id: string;
          code: string;
          name: string;
          type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
          parent_id: string | null;
          balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          code: string;
          name: string;
          type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
          parent_id?: string | null;
          balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
          parent_id?: string | null;
          balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // 财务交易
      financial_transactions: {
        Row: {
          id: string;
          transaction_date: string;
          description: string;
          transaction_type: 'income' | 'expense' | 'transfer';
          amount: number;
          account_id: string;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          sync_status: 'pending' | 'synced' | 'conflict';
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          transaction_date: string;
          description: string;
          transaction_type: 'income' | 'expense' | 'transfer';
          amount: number;
          account_id: string;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          transaction_date?: string;
          description?: string;
          transaction_type?: 'income' | 'expense' | 'transfer';
          amount?: number;
          account_id?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_status?: 'pending' | 'synced' | 'conflict';
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
