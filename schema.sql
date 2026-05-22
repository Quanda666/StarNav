-- 空间表（支持多空间/多导航页）
CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  sort_order INTEGER NOT NULL DEFAULT 9999,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 网站配置表
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  desc TEXT,
  catelog TEXT NOT NULL,
  category_id INTEGER,
  space_id INTEGER,
  visibility TEXT NOT NULL DEFAULT 'public',
  sort_order INTEGER NOT NULL DEFAULT 9999,
  hits INTEGER DEFAULT 0,
  last_visit_time TIMESTAMP,
  last_checked_at TIMESTAMP,
  last_status_code INTEGER,
  last_error TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- 待审核网站表（审核中心：支持 pending/approved/rejected 状态）
CREATE TABLE IF NOT EXISTS pending_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  desc TEXT,
  catelog TEXT NOT NULL,
  tags TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_at TIMESTAMP,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分类排序表
CREATE TABLE IF NOT EXISTS category_orders (
  catelog TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 9999
);

-- 分类表（兼容旧 catelog 文本字段，支持父子分类与分类改名）
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  space_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 9999,
  icon TEXT,
  color TEXT,
  description TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_space ON categories(space_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_sites_catelog ON sites(catelog);
CREATE INDEX IF NOT EXISTS idx_sites_space ON sites(space_id);
CREATE INDEX IF NOT EXISTS idx_sites_sort ON sites(catelog, sort_order, create_time);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_tags (
  site_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY(site_id, tag_id),
  FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_site_tags_tag ON site_tags(tag_id, site_id);

-- 分类元数据表（旧版兼容保留）
CREATE TABLE IF NOT EXISTS category_metadata (
  catelog TEXT PRIMARY KEY,
  icon TEXT,
  description TEXT
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 搜索关键词聚合统计表（仅记录关键词和结果数量，不保存用户身份信息）
CREATE TABLE IF NOT EXISTS search_terms (
  keyword TEXT PRIMARY KEY,
  total_searches INTEGER NOT NULL DEFAULT 0,
  total_results INTEGER NOT NULL DEFAULT 0,
  last_result_count INTEGER NOT NULL DEFAULT 0,
  zero_result_count INTEGER NOT NULL DEFAULT 0,
  first_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_terms_total ON search_terms(total_searches DESC, last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_terms_zero ON search_terms(zero_result_count DESC, last_searched_at DESC);

-- 操作日志表（记录管理员关键写操作，用于追踪和审计）
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target TEXT,
  target_id TEXT,
  summary TEXT,
  detail TEXT,
  ip TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_create_time ON operation_logs(create_time DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action, create_time DESC);
