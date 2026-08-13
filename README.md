# 归期本（Qizhangben）

一款基于微信小程序的**订阅管理与到期提醒**工具。记录会员/订阅服务的价格、周期与到期日，支持多币种折算、支出分析与到期推送提醒。

## 功能特性

- **微信登录**：`wx.login` 静默登录 + 头像昵称表单完善资料（两段式，资料缺失自动回补）
- **订阅管理**：增删改查、分类/周期筛选、搜索排序、多选批量删除、到期自动续算（过期自动滚动到下一周期）
- **热门订阅预设库**：内置 30+ 常见订阅一键添加，支持搜索
- **批量导入**：支持直接粘贴「导出数据」生成的 CSV（含表头）或从聊天文件导入，解析预览、重名自动跳过后批量创建
- **到期提醒**：微信订阅消息推送（一次性授权，可配置提前 N 天提醒）
- **订阅健康分**：按过期/自动续费占比/重复分类等评分，给出省钱建议
- **汇率折算**：接入实时汇率（open.er-api.com），支持 USD/EUR 等多币种统一按 CNY 汇总
- **支出分析**：总支出/月均/年度、本周支出、近 6 月趋势、分类与周期分布、高消费排行、下月扣款预测
- **年度账单报告**：全年支出分布、月度柱状图、TOP 订阅，支持一键分享
- **数据导出**：服务器生成 CSV 文件 → 小程序下载（Android 直接保存 / iOS 打开另存），带鉴权与越权防护，30 分钟有效
- **反馈闭环**：提交反馈 → 后台处理 → 回复与未读标记
- **轻量埋点**：启动/登录/订阅增删/反馈/导出等关键行为静默上报
- **隐私合规**：内置用户协议与隐私政策页面
- **深色模式**：跟随系统外观自动切换
- **本地缓存**：订阅列表与汇率本地缓存，弱网/离线可用

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | uni-app（Vue 3 + Pinia，兼容 Vue 2） |
| 后端 | Koa2 + MySQL + JWT + Socket.IO + 腾讯云 COS |
| 管理端 | Vue 3 + Vite + Element Plus（`levi-blog-admin`） |
| 部署 | 微信小程序（MP-WEIXIN） |

## 目录结构

```
SubEase/
├── api/subease/            # 接口封装（auth / subscription / notify / rates / feedback）
├── components/subease/     # 页面组件（Tab 栏、表单、弹层等）
├── pages/
│   ├── index/index.vue     # 主页面（首页/订阅/分析/我的 四 Tab）
│   └── legal/              # 用户协议、隐私政策
├── stores/subease/         # Pinia 状态（auth 登录态）
├── utils/subease/
│   ├── config.js           # API 地址、订阅消息模板 ID
│   ├── request.js          # 请求封装（超时、401 自动刷新 token）
│   ├── helpers.js          # 金额折算 / 统计 / 分析 / 到期滚动计算
│   ├── cache.js            # 订阅列表与汇率本地缓存
│   ├── constants.js        # 分类 / 货币等全局常量
│   ├── track.js            # 埋点上报
│   └── legal-content.js    # 协议文案
├── App.vue                 # 应用入口（启动静默登录）
├── main.js                 # 入口（Vue2/Vue3 条件编译）
├── manifest.json           # uni-app 应用配置
└── pages.json              # 页面路由与导航栏配置
```

## 快速开始

### 1. 运行后端

归期本依赖 [levi-blog-service](../../levi-blog-service)（多项目共用后端服务）。

```bash
cd levi-blog-service
npm install
# 在 .env 中配置数据库、JWT 与微信凭据（见下方"后端环境变量"）
npm start        # 或 node app.js（默认 3000 端口）
```

### 2. 运行小程序

1. 使用 **HBuilderX** 打开本目录（`uni-app/SubEase`）
2. 菜单 `运行 → 运行到小程序模拟器 → 微信开发者工具`
3. 首次需在微信公众平台配置：
   - 小程序 AppID 与 `secret`（配置在 `levi-blog-service/.env`）
   - 订阅消息模板（类目"记账"，模板 ID 见 `utils/subease/config.js`）
   - request / uploadFile / downloadFile 合法域名（线上 `https://api.leviqin.top`）

> 开发者工具中默认请求本地 `http://127.0.0.1:3000/api`；真机与线上请求 `https://api.leviqin.top/api`。如需切换，可在小程序内修改 `utils/subease/config.js` 或存储键 `subease-api-base-url`。

### 3. 运行管理端

```bash
cd levi-blog-admin
npm install
npm run dev
```

## 后端环境变量（levi-blog-service/.env）

| 变量 | 说明 |
|------|------|
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 连接 |
| `JWT_SECRET` | 管理端/博客 JWT 签名密钥 |
| `SUBEASE_ACCESS_SECRET` / `SUBEASE_REFRESH_SECRET` | 小程序 access/refresh token 密钥 |
| `SUBEASE_WX_APPID` / `SUBEASE_WX_SECRET` | 微信小程序凭据 |
| `SUBEASE_SUBSCRIBE_TEMPLATE_ID` | 订阅消息模板 ID（到期提醒） |
| `SUBEASE_WEEKLY_TEMPLATE_ID` | 每周支出回顾推送模板 ID（需申请"周报/服务提醒"类模板，与前端 `WEEKLY_REVIEW_TEMPLATE_ID` 填同一个 ID） |
| `COS_*` | 腾讯云 COS 凭据（头像上传） |

> 所有密钥仅从环境变量读取，严禁硬编码；生产环境请重新生成并妥善保管。

## 埋点事件

`app_launch` / `login_success` / `subscribe_add` / `subscribe_delete` / `subscribe_batch_delete` / `subscribe_batch_import` / `feedback_submit` / `export_data` / `reminder_optin`，由 `utils/subease/track.js` 静默上报至 `/subease/auth/track`。

## 每周支出回顾推送

前端授权入口（「我的 → 开启每周支出回顾推送」）+ 后端定时任务（`core/scheduler.js` 每周一 09:00）均已实现，启用只需两步：

1. 在微信公众平台申请"周报/服务提醒"类订阅消息模板（字段：thing1 概况 / amount2 金额 / time3 统计周期）
2. 将模板 ID 同时填入：
   - 后端 `levi-blog-service/.env` → `SUBEASE_WEEKLY_TEMPLATE_ID`
   - 前端 `utils/subease/config.js` → `WEEKLY_REVIEW_TEMPLATE_ID`

推送逻辑：上周一至周日 `next_date` 落在区间内的订阅按用户聚合（汇率折算 CNY），对已授权且有余量的用户推送；`subease_weekly_logs` 表按 (user_id, week_start) 唯一键防重复；`weekly_subscribe_remain` 记录剩余可推送次数（与到期提醒额度独立）。

## License

[MIT](./LICENSE)
