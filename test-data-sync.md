# 数据同步问题测试指南

## 问题描述
更新账户后跳转到列表页，有时（约1/3概率）显示的还是旧数据。

## 问题原因
**竞态条件（Race Condition）**：
- 更新操作和页面跳转几乎同时发生
- SWR 缓存的 `dedupingInterval: 5000` 导致5秒内不会重新请求
- 如果跳转时数据库还未完成更新，会缓存旧数据

## 实施的修复方案

### 1. 强制数据刷新
在列表页检测到成功消息时，立即调用 `mutate()` 强制刷新数据。

### 2. 时间戳参数
跳转URL添加时间戳参数 `?t=${timestamp}`，确保每次都是新的请求。

### 3. 代码修改位置
- `/app/admin/claude-accounts/page.tsx`: 添加 `mutate()` 调用
- `/app/admin/claude-accounts/[id]/edit/page.tsx`: 添加时间戳参数
- `/app/admin/claude-accounts/new/page.tsx`: 添加时间戳参数

## 测试步骤

### 准备工作
1. 启动开发服务器：`npm run dev`
2. 登录管理后台
3. 进入 Claude Accounts 页面

### 测试场景

#### 场景 1: 编辑账户名称
1. 点击任意账户的 Edit 按钮
2. 修改 Account Name
3. 点击 Update Account
4. **验证**：跳转后立即显示新的账户名称

#### 场景 2: 修改使用限制
1. 编辑账户
2. 修改 Usage Limit 数值
3. 点击 Update Account
4. **验证**：列表页显示更新后的数值

#### 场景 3: 连续多次更新
1. 快速连续更新同一账户3-5次
2. 每次修改不同的字段
3. **验证**：每次都显示最新数据

#### 场景 4: 创建新账户
1. 点击 Add New Account
2. 填写表单并提交
3. **验证**：列表页立即显示新账户

### 验证要点
- ✅ 成功消息显示正确
- ✅ 数据立即更新（无延迟）
- ✅ URL参数自动清理
- ✅ 无闪烁或加载延迟

## 调试方法

### 浏览器控制台
```javascript
// 查看网络请求
// Network 标签页应该显示：
// 1. PUT/POST 请求到 API
// 2. 跳转后立即有 GET 请求获取列表

// 控制台日志
// 应该看到：
// "✅ Account updated successfully"
// "🔄 Sending PUT request..."
```

### 检查 SWR 缓存
```javascript
// 在控制台运行
window.__SWR_DEVTOOLS_USE__ = true
```

## 预期结果
- **修复前**：约1/3概率显示旧数据
- **修复后**：100%显示最新数据

## 备选方案（如仍有问题）

### 方案 B: 延迟跳转
```javascript
// 等待100ms确保数据库更新完成
setTimeout(() => {
  router.push(`/admin/claude-accounts?success=...`)
}, 100)
```

### 方案 C: 乐观更新
使用 SWR 的乐观更新功能，立即在UI显示新数据。

### 方案 D: 禁用缓存
临时将 `dedupingInterval` 设为 0 或更小的值。