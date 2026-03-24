# 待会·就办 - 部署指南

## 项目结构

```
daihui-project/
├── index.html          # 前端页面（已打包的React应用）
├── js/
│   └── api.js         # API服务（需要添加到index.html）
├── api/               # 后端API服务
│   ├── server.js      # 主服务器文件
│   ├── package.json   # 依赖配置
│   ├── vercel.json    # Vercel部署配置
│   ├── .env.example   # 环境变量示例
│   ├── models/        # 数据模型
│   │   ├── User.js
│   │   └── Todo.js
│   └── routes/        # API路由
│       ├── auth.js
│       ├── todos.js
│       └── sms.js
├── robots.txt
├── sitemap.xml
└── favicon.ico
```

## 部署步骤

### 第一步：部署后端API（Vercel）

1. **准备MongoDB数据库**
   - 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - 创建免费集群
   - 获取连接字符串

2. **部署到Vercel**
   ```bash
   cd api
   npm install -g vercel
   vercel login
   vercel
   ```

3. **配置环境变量**
   在Vercel Dashboard中设置以下环境变量：
   - `MONGODB_URI`: MongoDB连接字符串
   - `JWT_SECRET`: 随机生成的密钥（用于JWT签名）
   - `NODE_ENV`: production

4. **（可选）配置阿里云短信**
   - `ALIYUN_ACCESS_KEY_ID`
   - `ALIYUN_ACCESS_KEY_SECRET`
   - `SMS_SIGN_NAME`
   - `SMS_TEMPLATE_CODE`

### 第二步：更新前端API地址

1. 修改 `js/api.js` 中的 `API_BASE_URL`：
   ```javascript
   const API_BASE_URL = 'https://your-backend-url.vercel.app/api';
   ```

2. 在 `index.html` 中引入API文件：
   ```html
   <script src="js/api.js"></script>
   ```

### 第三步：部署前端到GitHub Pages

1. 将所有文件推送到GitHub仓库
2. 在仓库Settings > Pages中启用GitHub Pages
3. 选择main分支作为源

## 功能说明

### 已实现功能

1. **用户认证**
   - 手机号+验证码登录
   - JWT Token认证
   - 用户信息存储

2. **待办事项管理**
   - 创建、读取、更新、删除待办
   - 优先级设置（高/中/低）
   - 状态管理（待办/进行中/已完成）
   - 标签功能
   - 截止日期

3. **数据统计**
   - 总任务数
   - 已完成数
   - 待处理数
   - 高优先级任务数
   - 完成率统计

4. **短信验证码**
   - 支持阿里云短信服务
   - 开发模式下控制台输出验证码
   - 5分钟有效期

## API接口文档

### 认证接口

#### 发送验证码
```
POST /api/sms/send-code
Body: { "phone": "13800138000" }
```

#### 登录
```
POST /api/auth/login
Body: { "phone": "13800138000", "code": "123456" }
Response: { "token": "...", "user": {...} }
```

#### 验证Token
```
GET /api/auth/verify
Headers: Authorization: Bearer <token>
```

### 待办事项接口

#### 获取所有待办
```
GET /api/todos?status=todo&priority=high&search=关键词
Headers: Authorization: Bearer <token>
```

#### 创建待办
```
POST /api/todos
Headers: Authorization: Bearer <token>
Body: {
  "title": "任务标题",
  "description": "任务描述",
  "priority": "high",
  "dueDate": "2026-03-30",
  "tags": ["工作", "紧急"]
}
```

#### 更新待办
```
PUT /api/todos/:id
Headers: Authorization: Bearer <token>
Body: { ... }
```

#### 删除待办
```
DELETE /api/todos/:id
Headers: Authorization: Bearer <token>
```

#### 获取统计
```
GET /api/todos/stats/summary
Headers: Authorization: Bearer <token>
```

## 注意事项

1. **开发模式**
   - 未配置阿里云短信时，验证码会打印在服务器控制台
   - 响应中会包含验证码（仅开发环境）

2. **生产环境**
   - 务必配置阿里云短信服务
   - 使用强密钥作为JWT_SECRET
   - 启用MongoDB访问白名单

3. **免费额度**
   - Vercel: 每月100GB带宽
   - MongoDB Atlas: 512MB存储
   - 阿里云短信: 新用户有免费额度

## 下一步优化

1. 添加Redis缓存验证码
2. 实现WebSocket实时同步
3. 添加任务提醒功能
4. 实现团队协作功能
5. 添加数据导出功能
