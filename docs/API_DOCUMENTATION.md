# ProClaw v4.0 API 接口文档

本文档描述了 ProClaw 系统的 HTTP API 接口规范。

## 目录

1. [概述](#概述)
2. [认证](#认证)
3. [设备配对](#设备配对)
4. [产品管理](#产品管理)
5. [客户管理](#客户管理)
6. [供应商管理](#供应商管理)
7. [销售订单](#销售订单)
8. [采购订单](#采购订单)
9. [库存管理](#库存管理)
10. [财务管理](#财务管理)
11. [AI 订单识别](#ai-订单识别)
12. [文件管理](#文件管理)
13. [设备管理](#设备管理)
14. [WebSocket 聊天](#websocket-聊天)
15. [错误处理](#错误处理)

---

## 概述

### 基础信息

- **基础 URL**: `http://localhost:8888/api`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 版本信息

- **当前版本**: v4.0.0
- **协议**: HTTP/1.1, WebSocket
- **请求方法**: GET, POST, PUT, DELETE

---

## 认证

### 获取 Token

设备配对后获取 access_token 和 refresh_token。

**端点**: `POST /api/auth/pair`

**请求体**:
```json
{
  "pairing_code": "123456",
  "device_name": "我的iPhone",
  "device_type": "mobile"
}
```

**响应**:
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 刷新 Token

**端点**: `POST /api/auth/token`

**请求体**:
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

**响应**: 同获取 Token

### 使用 Token

在请求头中添加:
```
Authorization: Bearer <access_token>
```

---

## 设备配对

### 生成配对码

**端点**: `POST /api/devices/pairing-code`

**请求体**:
```json
{
  "device_name": "老板的手机",
  "device_type": "mobile"
}
```

**响应**:
```json
{
  "pairing_code": "123456",
  "qr_content": "proclaw://pair?host=192.168.1.100&port=8888&code=123456",
  "expires_at": "2024-01-01T12:05:00Z",
  "local_ips": ["192.168.1.100"],
  "port": 8888
}
```

### 设备配对

**端点**: `POST /api/auth/pair`

**请求体**: 见[认证](#认证) 部分。

### 获取设备列表

**端点**: `GET /api/devices`

**响应**:
```json
{
  "devices": [
    {
      "id": "device_1",
      "user_id": "user_1",
      "device_name": "我的iPhone",
      "device_type": "mobile",
      "last_active_at": "2024-01-01T12:00:00Z",
      "is_revoked": false,
      "created_at": "2024-01-01T11:00:00Z"
    }
  ]
}
```

### 踢除设备

**端点**: `POST /api/devices/:id/revoke`

**响应**:
```json
{
  "message": "Device revoked successfully"
}
```

---

## 产品管理

### 获取产品列表

**端点**: `GET /api/products`

**参数**:
- `search` (可选): 搜索关键词（名称或 SKU）
- `category` (可选): 分类 ID
- `limit` (可选): 每页数量，默认 50
- `offset` (可选): 偏移量，默认 0

**响应**:
```json
[
  {
    "id": "product_1",
    "sku": "SKU001",
    "name": "红富士苹果",
    "description": "新鲜红富士苹果",
    "price": 5.5,
    "stock_quantity": 100,
    "category": "水果",
    "image_url": "http://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 获取单个产品

**端点**: `GET /api/products/:id`

**响应**: 单个产品对象

### 创建产品

**端点**: `POST /api/products`

**请求体**:
```json
{
  "sku": "SKU001",
  "name": "红富士苹果",
  "description": "新鲜红富士苹果",
  "price": 5.5,
  "cost_price": 4.0,
  "category": "水果",
  "initial_stock": 100
}
```

**响应**: 创建的产品对象

### 更新产品

**端点**: `PUT /api/products/:id`

**请求体**: 同创建产品（可部分更新）

**响应**: 更新后的产品对象

### 删除产品

**端点**: `DELETE /api/products/:id`

**响应**:
```json
{
  "message": "Product deleted successfully"
}
```

---

## 客户管理

### 获取客户列表

**端点**: `GET /api/customers`

**响应**:
```json
[
  {
    "id": "customer_1",
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "address": "北京市朝阳区",
    "customer_type": "retail",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 创建客户

**端点**: `POST /api/customers`

**请求体**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "address": "北京市朝阳区",
  "customer_type": "retail"
}
```

---

## 供应商管理

### 获取供应商列表

**端点**: `GET /api/suppliers`

### 创建供应商

**端点**: `POST /api/suppliers`

**请求体**:
```json
{
  "name": "北京水果批发",
  "contact_person": "李经理",
  "phone": "13900139000",
  "email": "libing@shuiguo.com",
  "address": "北京市丰台区"
}
```

---

## 销售订单

### 获取销售订单列表

**端点**: `GET /api/sales_orders`

**响应**:
```json
[
  {
    "id": "so_1",
    "so_no": "SO1704067200",
    "customer_id": "customer_1",
    "order_date": "2024-01-01",
    "total_amount": 72.5,
    "status": "confirmed",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

### 创建销售订单

**端点**: `POST /api/sales_orders`

**请求体**:
```json
{
  "customer_id": "customer_1",
  "order_date": "2024-01-01",
  "items": [
    {
      "product_id": "product_1",
      "quantity": 10,
      "unit_price": 5.5
    }
  ]
}
```

### 提交销售订单

**端点**: `POST /api/sales_orders/:id/submit`

**响应**:
```json
{
  "message": "Order submitted successfully",
  "so_no": "SO1704067200"
}
```

---

## 采购订单

### 创建采购订单

**端点**: `POST /api/purchase_orders`

**请求体**:
```json
{
  "supplier_id": "supplier_1",
  "order_date": "2024-01-01",
  "expected_delivery_date": "2024-01-05",
  "items": [
    {
      "product_id": "product_1",
      "quantity": 100,
      "unit_price": 4.0
    }
  ]
}
```

### 确认收货

**端点**: `POST /api/purchase_orders/:id/receive`

**响应**:
```json
{
  "message": "Purchase order received successfully"
}
```

---

## 库存管理

### 获取库存列表

**端点**: `GET /api/inventory`

### 获取库存交易记录

**端点**: `GET /api/inventory/transactions`

### 创建库存交易

**端点**: `POST /api/inventory/transactions`

**请求体**:
```json
{
  "product_id": "product_1",
  "transaction_type": "inbound",
  "quantity": 50,
  "reference_no": "PO20240101001",
  "reason": "采购入库",
  "notes": "第一批进货"
}
```

**交易类型**:
- `inbound`: 入库
- `outbound`: 出库
- `adjustment`: 调整
- `transfer`: 转移

---

## 财务管理

### 获取损益报表

**端点**: `GET /api/finance/profit-loss`

**参数**:
- `start_date` (可选): 开始日期 (YYYY-MM-DD)
- `end_date` (可选): 结束日期 (YYYY-MM-DD)

**响应**:
```json
{
  "total_revenue": 10000.0,
  "total_expense": 7500.0,
  "net_profit": 2500.0,
  "details": [
    {
      "account_name": "销售收入",
      "amount": 10000.0,
      "percentage": 100.0
    }
  ]
}
```

### 获取现金流量表

**端点**: `GET /api/finance/cash-flow`

### 获取财务汇总

**端点**: `GET /api/finance/summary`

**响应**:
```json
{
  "total_assets": 50000.0,
  "total_liabilities": 20000.0,
  "total_equity": 30000.0,
  "cash_balance": 15000.0
}
```

---

## AI 订单识别

### 识别订单图片

**端点**: `POST /api/ai/recognize_order`

**请求体**:
```json
{
  "image_base64": "/9j/4AAQSkZJRgABAQAAAQ...",
  "image_type": "jpg"
}
```

**响应**:
```json
{
  "draft_id": "draft_1",
  "items": [
    {
      "product_name": "苹果",
      "quantity": 10.0,
      "unit_price": 5.0,
      "total_price": 50.0,
      "confidence": 0.92
    }
  ],
  "total_amount": 67.5,
  "confidence": 0.88,
  "message": "识别成功"
}
```

### 校验订单明细

**端点**: `POST /api/ai/validate_order_items`

**请求体**:
```json
{
  "items": [
    {
      "product_name": "苹果",
      "quantity": 10.0,
      "unit_price": 5.0,
      "total_price": 50.0
    }
  ],
  "customer_id": "customer_1"
}
```

**响应**:
```json
{
  "is_valid": false,
  "warnings": [
    {
      "item_index": 0,
      "warning_type": "stock_insufficient",
      "message": "库存不足，当前库存: 5",
      "suggestion": "建议可售数量: 5"
    }
  ],
  "suggestions": []
}
```

### 保存订单草稿

**端点**: `POST /api/sales_orders/draft`

**请求体**:
```json
{
  "customer_id": "customer_1",
  "items": [
    {
      "product_name": "苹果",
      "quantity": 10,
      "unit_price": 5.5,
      "total_price": 55.0
    }
  ],
  "original_image_url": "http://...",
  "ai_raw_response": "{...}"
}
```

### 获取订单草稿

**端点**: `GET /api/sales_orders/draft/:id`

### 提交订单草稿

**端点**: `POST /api/sales_orders/draft/:id/submit`

---

## 文件管理

### 上传文件

**端点**: `POST /api/files/upload`

**请求体**: `multipart/form-data`
- `file`: 文件二进制数据
- `file_type`: 文件类型（可选）

**响应**:
```json
{
  "file_id": "file_1",
  "file_name": "image.jpg",
  "file_size": 102400,
  "mime_type": "image/jpeg",
  "url": "http://localhost:8888/api/files/download/file_1",
  "thumbnail_url": "http://localhost:8888/api/files/thumb/file_1"
}
```

### 下载文件

**端点**: `GET /api/files/download/:id`

**响应**: 文件二进制流

### 获取文件缩略图

**端点**: `GET /api/files/thumb/:id`

**响应**: 图片二进制流

---

## 设备管理

### 获取设备列表

**端点**: `GET /api/devices`

（已在[设备配对](#设备配对) 部分描述）

### 踢除设备

**端点**: `POST /api/devices/:id/revoke`

（已在[设备配对](#设备配对) 部分描述）

---

## WebSocket 聊天

### 连接端点

**URL**: `ws://localhost:8888/ws/chat?token=<access_token>`

### 消息格式

#### 客户端发送消息

```json
{
  "type": "text",
  "receiver_id": "user_2",
  "content": "你好，我想咨询一下价格",
  "message_type": "text"
}
```

#### 服务端发送消息

```json
{
  "id": 1,
  "sender_id": "user_1",
  "receiver_id": "user_2",
  "content": "你好，苹果的价格是 5.5 元/斤",
  "message_type": "text",
  "is_read": false,
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### 消息类型

- `text`: 文本消息
- `image`: 图片消息
- `file`: 文件消息
- `order_card`: 订单卡片

#### 订单卡片消息

```json
{
  "type": "order_card",
  "receiver_id": "user_2",
  "content": JSON.stringify({
    "order_id": "so_1",
    "order_no": "SO1704067200",
    "total_amount": 72.5,
    "status": "confirmed"
  }),
  "message_type": "order_card"
}
```

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "error": "错误描述信息"
}
```

### 常见错误

1. **401 Unauthorized**: Token 无效或过期，请刷新 Token
2. **403 Forbidden**: 无权限访问该资源
3. **404 Not Found**: 资源不存在
4. **500 Internal Server Error**: 服务器内部错误，请联系管理员

---

## 附录

### 数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| String | 字符串 | `"苹果"` |
| Number | 数字 | `5.5` |
| Integer | 整数 | `10` |
| Boolean | 布尔值 | `true`, `false` |
| Array | 数组 | `[1, 2, 3]` |
| Object | 对象 | `{"key": "value"}` |
| DateTime | 日期时间 | `"2024-01-01T12:00:00Z"` |

### 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | Integer | 50 | 每页数量 |
| offset | Integer | 0 | 偏移量 |

### 注意事项

1. 所有时间戳使用 ISO 8601 格式
2. 金额使用浮点数，单位：元
3. 数量使用整数
4. 图片上传大小限制：10MB
5. Token 有效期：1 小时
6. 配对码有效期：5 分钟

---

**文档版本**: v4.0.0  
**最后更新**: 2024 年 1 月  
**维护者**: ProClaw 开发团队
