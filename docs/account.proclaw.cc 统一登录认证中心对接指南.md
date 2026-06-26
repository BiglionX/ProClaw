# account.proclaw.cc 统一登录认证中心对接指南

## 一、认证中心基本信息

| 配置项 | 值 |
|--------|-----|
| **Issuer** | `https://account.proclaw.cc` |
| **Discovery 端点** | `https://account.proclaw.cc/.well-known/openid-configuration` |
| **JWKS 端点** | `https://account.proclaw.cc/.well-known/jwks.json` |
| **Authorize 端点** | `https://account.proclaw.cc/oauth/authorize` |
| **Token 端点** | `https://account.proclaw.cc/oauth/token` |
| **UserInfo 端点** | `https://account.proclaw.cc/oauth/userinfo` |
| **Logout 端点** | `https://account.proclaw.cc/oauth/logout` |

---

## 二、对接流程

### 步骤 1：注册客户端

联系 ProClaw 团队注册你的应用，提供以下信息：

| 参数 | 说明 | 示例 |
|------|------|------|
| `client_id` | 应用唯一标识 | `your-app-name` |
| `redirect_uris` | 授权回调地址（数组） | `["https://your-app.com/oauth/callback"]` |
| `allowed_scopes` | 允许请求的权限范围 | `["openid", "profile", "email"]` |
| `allowed_grant_types` | 支持的授权类型 | `["authorization_code", "refresh_token"]` |

注册成功后，你将获得：
- `client_id`：客户端标识（公开）
- `token_endpoint_auth_method`：`none`（PKCE 公开客户端）或 `client_secret_post`（机密客户端）

---

### 步骤 2：实现 OIDC 授权码流程

#### 2.1 构造授权请求

将用户重定向到 Authorize 端点：

```
GET https://account.proclaw.cc/oauth/authorize?
    response_type=code&
    client_id={your_client_id}&
    redirect_uri={your_redirect_uri}&
    scope=openid%20profile%20email&
    state={random_state}&
    code_challenge={pkce_challenge}&
    code_challenge_method=S256&
    nonce={random_nonce}
```

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `response_type` | ✅ | 固定值 `code` |
| `client_id` | ✅ | 注册时获得的客户端标识 |
| `redirect_uri` | ✅ | 注册时填写的回调地址（必须完全匹配） |
| `scope` | ✅ | 至少包含 `openid`，可选 `profile`、`email` |
| `state` | ✅ | 随机字符串，用于防 CSRF，回调时需验证 |
| `code_challenge` | ✅ | PKCE 挑战码（见下方说明） |
| `code_challenge_method` | ✅ | 推荐 `S256`，也支持 `plain` |
| `nonce` | 推荐 | 随机字符串，用于防重放，id_token 中会返回 |

#### 2.2 实现 PKCE（必须）

```javascript
// 生成 code_verifier（43-128 字符的随机字符串）
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array); // 43 字符
}

// 生成 code_challenge（S256 方法）
function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

// Base64URL 编码（无填充）
function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

#### 2.3 处理授权回调

用户完成登录后，认证中心重定向到你的 `redirect_uri`：

```
GET https://your-app.com/oauth/callback?
    code={authorization_code}&
    state={original_state}
```

**验证步骤：**
1. 检查 `state` 是否与请求时一致（防 CSRF）
2. 使用 `code` 换取 token

---

### 步骤 3：换取 Token

```http
POST https://account.proclaw.cc/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={authorization_code}&
redirect_uri={your_redirect_uri}&
client_id={your_client_id}&
code_verifier={pkce_verifier}
```

**响应示例：**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refresh_token": "abc123def456...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}
```

**Token 说明：**

| Token | 用途 | 有效期 |
|-------|------|--------|
| `access_token` | 调用 UserInfo 端点获取用户信息 | 1 小时 |
| `id_token` | JWT 格式，包含用户身份信息，客户端可直接解析验证 | 1 小时 |
| `refresh_token` | 刷新 access_token，每次使用后自动轮换 | 30 天 |

---

### 步骤 4：验证 id_token

id_token 是 RS256 签名的 JWT，需验证以下字段：

```javascript
// 使用 JWKS 公钥验证
const jwksUrl = 'https://account.proclaw.cc/.well-known/jwks.json';
const { payload } = await jwtVerify(idToken, jwksPublicKey, {
  issuer: 'https://account.proclaw.cc',
  audience: your_client_id,
});

// 验证 payload 中的字段
assert(payload.iss === 'https://account.proclaw.cc');
assert(payload.aud === your_client_id);
assert(payload.exp > Date.now() / 1000);
assert(payload.nonce === original_nonce); // 如果请求时传了 nonce
```

**id_token claims：**

| Claim | 说明 |
|-------|------|
| `iss` | Issuer：`https://account.proclaw.cc` |
| `sub` | 用户唯一标识（user.id） |
| `aud` | Audience：你的 client_id |
| `exp` | 过期时间（Unix timestamp） |
| `iat` | 签发时间 |
| `auth_time` | 用户认证时间 |
| `nonce` | 请求时传入的 nonce（防重放） |
| `email` | 用户邮箱（scope 包含 email 时） |
| `name` | 用户名称（scope 包含 profile 时） |
| `is_admin` | 是否为管理员（布尔值） |

---

### 步骤 5：获取用户信息（可选）

如果需要更完整的用户信息，可调用 UserInfo 端点：

```http
GET https://account.proclaw.cc/oauth/userinfo
Authorization: Bearer {access_token}
```

**响应示例：**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "张三",
  "picture": "https://avatar.url",
  "is_admin": false
}
```

---

### 步骤 6：刷新 Token（可选）

```http
POST https://account.proclaw.cc/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token={refresh_token}&
client_id={your_client_id}
```

**注意：** 刷新成功后，旧的 `refresh_token` 自动失效，需保存新返回的 `refresh_token`。

---

### 步骤 7：登出（可选）

```http
POST https://account.proclaw.cc/oauth/logout
Content-Type: application/x-www-form-urlencoded

refresh_token={refresh_token}
```

---

## 三、SSO 单点登录特性

如果你的应用部署在 `*.proclaw.cc` 子域名下，可享受 **跨子域 SSO**：

- 用户在 `account.proclaw.cc` 登录后，会设置 `pc_session` cookie（Domain: `.proclaw.cc`）
- 当用户访问你的应用发起授权请求时，认证中心检测到有效 session，直接签发 code，无需再次登录
- 用户体验：**一次登录，全平台通行**

---

## 四、安全注意事项

1. **必须实现 PKCE**：认证中心强制要求 `code_challenge`，否则拒绝授权
2. **验证 state**：回调时必须校验 `state` 参数，防止 CSRF 攻击
3. **验证 id_token**：使用 JWKS 公钥验证签名，检查 `iss`、`aud`、`exp`
4. **安全存储 refresh_token**：建议存储在服务端，关联用户 session
5. **HTTPS 必须**：生产环境 `redirect_uri` 必须使用 HTTPS

---

## 五、示例代码（JavaScript/TypeScript）

```typescript
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

const CLIENT_ID = 'your-app-name';
const REDIRECT_URI = 'https://your-app.com/oauth/callback';
const ISSUER = 'https://account.proclaw.cc';

// 1. 发起授权请求
async function startAuth() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  // 存储 verifier、state、nonce 用于回调验证
  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('auth_state', state);
  sessionStorage.setItem('auth_nonce', nonce);

  const authUrl = `${ISSUER}/oauth/authorize?` +
    `response_type=code&` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=openid%20profile%20email&` +
    `state=${state}&` +
    `code_challenge=${challenge}&` +
    `code_challenge_method=S256&` +
    `nonce=${nonce}`;

  window.location.href = authUrl;
}

// 2. 处理回调
async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  // 验证 state
  const savedState = sessionStorage.getItem('auth_state');
  if (state !== savedState) throw new Error('Invalid state');

  // 换取 token
  const verifier = sessionStorage.getItem('pkce_verifier');
  const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  const tokens = await tokenRes.json();
  // 验证 id_token、存储 tokens、建立本地 session...
  return tokens;
}
```

---

## 六、测试验证

对接完成后，可通过以下方式验证：

```bash
# 1. 获取 Discovery 文档
curl https://account.proclaw.cc/.well-known/openid-configuration

# 2. 获取 JWKS 公钥
curl https://account.proclaw.cc/.well-known/jwks.json

# 3. 检查 id_token 签名（使用 jwt.io 或本地工具）
```

---

## 七、联系方式

如有对接问题，请联系 ProClaw 团队：
- **技术支持邮箱**：tech@proclaw.cc
- **客户端注册申请**：提交申请时请提供应用名称、回调地址、所需权限范围

---

以上是完整的对接指南，其他项目组按此文档即可无缝对接 `account.proclaw.cc` 统一认证中心。