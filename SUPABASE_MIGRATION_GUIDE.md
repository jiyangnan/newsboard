# Supabase迁移指南

## 📋 迁移步骤

### 1. 创建Supabase项目
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取项目URL和anon key

### 2. 配置数据库
1. 在Supabase Dashboard中打开SQL编辑器
2. 运行 `supabase_schema.sql` 中的所有SQL命令
3. 这将创建所有必要的表和索引

### 3. 配置环境变量
1. 复制 `.env.example` 为 `.env`
2. 填入你的Supabase项目信息：
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SECRET_KEY=your-secret-key
   ```

### 4. 安装依赖
```bash
pip install -r requirements.txt
```

### 5. 运行应用
```bash
python app_supabase.py
```

## 🔧 技术变更

### 主要变化
- **数据库**: SQLite → Supabase (PostgreSQL)
- **ORM**: SQLAlchemy → Supabase Client
- **认证**: Flask会话 → Supabase Auth (可选)
- **部署**: 本地 → 云端

### 表结构映射
| SQLite表 | Supabase表 | 说明 |
|---------|-----------|------|
| User | users | 用户表 |
| RSSItem | rss_items | RSS文章表 |
| Comment | comments | 评论表 |
| ArticleView | article_views | 浏览记录表 |
| SiteStats | site_stats | 网站统计表 |

## 🚀 部署选项

### 1. 本地开发
```bash
python app_supabase.py
```

### 2. 云端部署
- **Vercel**: 支持Python Flask
- **Railway**: 一键部署
- **Heroku**: 传统选择
- **Supabase Edge Functions**: 无服务器部署

## 🔒 安全特性

### 已启用
- 行级安全策略(RLS)
- 数据验证
- SQL注入防护
- 密码哈希

### 需要配置
- Supabase Auth (可选)
- API密钥管理
- 环境变量保护

## 📊 性能优化

### 索引
- 文章发布时间索引
- 用户查询索引
- 评论关联索引

### 缓存
- 浏览器缓存
- CDN支持
- 数据库查询优化

## 🎯 下一步

1. **启用Supabase Auth**: 替换当前会话认证
2. **添加实时功能**: 使用Supabase Realtime
3. **文件存储**: 使用Supabase Storage存储图片
4. **边缘函数**: 使用Supabase Edge Functions处理RSS抓取

## 📞 支持

如需帮助，请查看：
- [Supabase文档](https://supabase.com/docs)
- [项目Issues](https://github.com/your-repo/issues)