# AI 应用上线体检报告

## 项目：示例电商 MVP

**检查日期**：2026-07-19
**技术栈**：Next.js 14 / Supabase / Stripe / Vercel
**生成工具**：Lovable + Claude Code
**检查范围**：代码仓库 + 测试环境
**报告版本**：1.0

---

## 上线结论

### 🔴 不建议上线

该项目存在 **4 个严重风险、3 个高风险、5 个中风险、2 个低风险**。在修复全部严重和高风险问题前，不建议正式上线收款。

核心问题：
1. Stripe Secret Key 暴露在前端代码中
2. Supabase RLS 未启用，用户数据对所有人可读
3. Stripe Webhook 未验证签名，可被伪造支付成功
4. 管理员 API 无权限校验

---

## 风险概览

| 严重程度 | 数量 | 状态 |
|---------|------|------|
| 🔴 严重 | 4 | 需立即修复 |
| 🟠 高 | 3 | 上线前必须修复 |
| 🟡 中 | 5 | 建议修复 |
| 🟢 低 | 2 | 可后续处理 |
| **合计** | **14** | |

---

## 严重风险（4 个）

### S-01: Stripe Secret Key 暴露在前端

**严重程度**：🔴 严重
**位置**：`src/lib/stripe.ts` 第 12 行
**类型**：敏感信息暴露

**问题描述**

```javascript
// src/lib/stripe.ts
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                          NEXT_PUBLIC_ 前缀 = 会暴露到浏览器
```

`NEXT_PUBLIC_` 前缀的环境变量会被打包到前端代码中，任何人打开浏览器开发者工具即可看到你的 Stripe Secret Key。

**影响**

攻击者获取 Secret Key 后可以：
- 发起任意退款
- 创建/取消订阅
- 读取所有交易记录
- 创建新的支付链接

**验证方式**

在浏览器中打开应用 → F12 → Sources → 搜索 `sk_live_` 或 `sk_test_` → 确认密钥可见。

**修复**

```javascript
// 修复前
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

// 修复后：移除 NEXT_PUBLIC_ 前缀，仅在后端使用
// .env.local
STRIPE_SECRET_KEY=sk_live_xxx

// src/lib/stripe.ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// 此文件只能在 server component / API route 中使用
```

同时：立即在 Stripe Dashboard 轮换（roll）该密钥，因为旧密钥已经可能泄露。

---

### S-02: Supabase RLS 未启用，用户数据完全可读

**严重程度**：🔴 严重
**位置**：Supabase Dashboard → Authentication → Policies
**类型**：数据库越权访问

**问题描述**

`users`、`orders`、`subscriptions` 表的 Row Level Security (RLS) 处于关闭状态。任何持有 `anon key`（前端代码中可见）的人都可以读取所有用户的：

- 邮箱
- 手机号
- 订单金额
- 订阅状态
- 收货地址

**验证方式**

在浏览器 Console 中执行：

```javascript
const { data } = await supabase.from('users').select('*');
console.log(data); // 返回所有用户数据
```

**修复**

1. 在 Supabase Dashboard 中为所有表启用 RLS
2. 添加策略：

```sql
-- users 表：用户只能读自己的数据
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- orders 表：用户只能读自己的订单
CREATE POLICY "Users can read own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- admin 相关表：仅 admin 角色可访问
CREATE POLICY "Admin only access"
ON admin_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### S-03: Stripe Webhook 未验证签名，可伪造支付

**严重程度**：🔴 严重
**位置**：`src/app/api/webhooks/stripe/route.ts`
**类型**：支付伪造

**问题描述**

```typescript
// 当前代码
export async function POST(request: Request) {
  const event = await request.json();
  // ❌ 没有验证 Stripe 签名

  if (event.type === 'checkout.session.completed') {
    await updateUserSubscription(event.data.object.client_reference_id);
  }
  return Response.json({ received: true });
}
```

任何人可以直接 POST 请求到 `/api/webhooks/stripe`，伪造一个 `checkout.session.completed` 事件，免费获得付费功能。

**验证方式**

```bash
curl -X POST https://your-app.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"client_reference_id":"user_123"}}}'
```

如果返回 `{ "received": true }` 且订阅状态被修改，说明 Webhook 未验证签名。

**修复**

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')!;
  const body = await request.text();

  let event: Stripe.Event;
  try {
    // ✅ 验证签名
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json(
      { error: `Webhook signature verification failed` },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await updateUserSubscription(session.client_reference_id!);
  }
  return Response.json({ received: true });
}
```

---

### S-04: 管理员 API 无权限校验

**严重程度**：🔴 严重
**位置**：`src/app/api/admin/*/route.ts`（多个路由）
**类型**：越权访问

**问题描述**

所有 `/api/admin/*` 路由仅通过前端 UI 隐藏来"保护"，后端没有任何权限检查：

```typescript
// src/app/api/admin/users/route.ts
export async function GET() {
  // ❌ 没有检查当前用户是否为 admin
  const { data } = await supabase.from('users').select('*');
  return Response.json(data);
}
```

任何用户只要知道 URL（或用 dirsearch 扫描）就能访问所有管理功能。

**修复**

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // ✅ 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ✅ 检查 admin 角色
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data } = await supabase.from('users').select('*');
  return Response.json(data);
}
```

---

## 高风险（3 个）

### H-01: 文件上传无类型和大小限制

**位置**：`src/app/api/upload/route.ts`
**问题**：用户可上传任意类型文件（包括 .exe、.php），无大小限制，文件名使用用户输入未过滤。
**影响**：可上传恶意文件、耗尽存储空间、路径遍历攻击。
**修复**：限制允许的 MIME 类型、设置最大文件大小、使用随机生成的文件名。

### H-02: 密码重置流程可被滥用

**位置**：`src/app/api/reset-password/route.ts`
**问题**：重置链接使用可预测的 token（时间戳 + 用户 ID 的 MD5），无频率限制。
**影响**：攻击者可构造有效的重置链接接管任意账号。
**修复**：使用 crypto.randomUUID() 生成 token，设置过期时间，添加频率限制。

### H-03: 用户可修改自己的订阅状态

**位置**：`src/components/Settings.tsx`
**问题**：订阅状态存储在客户端 state 中，通过 API 直接更新 `users` 表的 `subscription_status` 字段，且 RLS 策略允许用户更新自己的所有字段。
**影响**：用户可直接将 `subscription_status` 改为 `active` 绕过支付。
**修复**：订阅状态只能通过 Webhook 更新，用户不可直接修改 `subscription_status` 字段（RLS 排除该字段）。

---

## 中风险（5 个）

| 编号 | 问题 | 位置 | 建议 |
|------|------|------|------|
| M-01 | 无 API 速率限制 | 全局 | 添加 Upstash Ratelimit，每 IP 每分钟 60 次 |
| M-02 | Source Map 暴露 | next.config.js | 设置 `productionBrowserSourceMaps: false` |
| M-03 | 错误信息泄露堆栈 | API 路由 | 生产环境返回通用错误信息，日志中记录详情 |
| M-04 | 无数据库备份策略 | Supabase | 启用 Supabase 自动备份 + Point-in-Time Recovery |
| M-05 | 依赖包有过期版本 | package.json | `npm audit` 发现 3 个高危依赖，建议升级 |

---

## 低风险（2 个）

| 编号 | 问题 | 建议 |
|------|------|------|
| L-01 | 缺少安全响应头 | 在 `next.config.js` 中添加 CSP、X-Frame-Options 等 |
| L-02 | console.log 残留 | 移除生产代码中的调试日志 |

---

## 修复优先级

```
立即修复（上线前必须）：
  S-01 → 轮换 Stripe 密钥 + 移除 NEXT_PUBLIC_ 前缀
  S-02 → 启用 Supabase RLS + 添加策略
  S-03 → 验证 Stripe Webhook 签名
  S-04 → 管理员 API 添加权限校验

上线前建议修复：
  H-01 → 文件上传限制
  H-02 → 密码重置 token 安全
  H-03 → 订阅状态不可客户端修改

上线后逐步处理：
  M-01 ~ M-05
  L-01 ~ L-02
```

---

## 修复后验证

*（此部分在修复完成后填写）*

| 编号 | 修复状态 | 验证方式 | 验证结果 |
|------|---------|---------|---------|
| S-01 | [ ] 已修复 | 浏览器 Sources 搜索 `sk_` | — |
| S-02 | [ ] 已修复 | Console 查询 `users` 表 | — |
| S-03 | [ ] 已修复 | curl 伪造 Webhook | — |
| S-04 | [ ] 已修复 | 普通用户访问 admin API | — |

---

## 附录：检查清单

- [x] API Key / Stripe 密钥暴露检查
- [x] Supabase/Firebase RLS 配置检查
- [x] 登录/注册/重置密码检查
- [x] 管理员接口权限检查
- [x] Stripe Webhook 签名验证检查
- [x] 用户可修改价格/套餐检查
- [x] 文件上传安全检查
- [x] 用户数据暴露检查
- [x] 第三方依赖漏洞检查
- [x] 限流/日志/备份检查
- [x] .env / source map / 调试接口暴露检查

---

> 本报告仅涵盖检查时点的代码状态。检查完成后新引入的代码或配置变更不在本报告范围内。
>
> 本报告中的漏洞细节未经客户书面授权不得公开。