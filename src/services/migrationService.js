// 模块级缓存：在单个 Worker isolate 生命周期内只运行一次迁移。
// 注意：此缓存与第一次调用时传入的 env 绑定，适用于单一 D1 绑定的场景。
let migrationPromise = null;

export async function ensureSchema(env) {
  if (!migrationPromise) {
    migrationPromise = runMigration(env).catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }
  return migrationPromise;
}

async function runMigration(env) {
  console.log('[migration] ensuring all tables and indexes');

  await env.NAV_DB.batch([
    // 主表：sites
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        logo TEXT,
        desc TEXT,
        catelog TEXT NOT NULL,
        category_id INTEGER,
        visibility TEXT NOT NULL DEFAULT 'public',
        sort_order INTEGER NOT NULL DEFAULT 9999,
        hits INTEGER DEFAULT 0,
        last_visit_time TIMESTAMP,
        last_checked_at TIMESTAMP,
        last_status_code INTEGER,
        last_error TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // 主表：pending_sites
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS pending_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        logo TEXT,
        desc TEXT,
        catelog TEXT NOT NULL,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // 主表：settings
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // 主表：categories
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        parent_id INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 9999,
        icon TEXT,
        color TEXT,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `),
    // 兼容旧版：category_orders（仅用于迁移，新代码不再写入）
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS category_orders (
        catelog TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL DEFAULT 9999
      )
    `),
    // 兼容旧版：category_metadata（仅用于迁移，新代码不再写入）
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS category_metadata (
        catelog TEXT PRIMARY KEY,
        icon TEXT,
        description TEXT
      )
    `),
    // 搜索关键词聚合统计表
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS search_terms (
        keyword TEXT PRIMARY KEY,
        total_searches INTEGER NOT NULL DEFAULT 0,
        total_results INTEGER NOT NULL DEFAULT 0,
        last_result_count INTEGER NOT NULL DEFAULT 0,
        zero_result_count INTEGER NOT NULL DEFAULT 0,
        first_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // 标签表
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_tags (
        site_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY(site_id, tag_id),
        FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `),
    // 索引
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_catelog ON sites(catelog)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_sort ON sites(catelog, sort_order, create_time)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_site_tags_tag ON site_tags(tag_id, site_id)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_search_terms_total ON search_terms(total_searches DESC, last_searched_at DESC)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_search_terms_zero ON search_terms(zero_result_count DESC, last_searched_at DESC)'),
    // 操作日志表
    env.NAV_DB.prepare(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        target TEXT,
        target_id TEXT,
        summary TEXT,
        detail TEXT,
        ip TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_operation_logs_create_time ON operation_logs(create_time DESC, id DESC)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action, create_time DESC)'),
  ]);

  await ensureColumn(env, 'sites', 'category_id', 'INTEGER');
  await ensureColumn(env, 'sites', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
  await ensureColumn(env, 'sites', 'hits', 'INTEGER DEFAULT 0');
  await ensureColumn(env, 'sites', 'last_visit_time', 'TIMESTAMP');
  await ensureColumn(env, 'sites', 'last_checked_at', 'TIMESTAMP');
  await ensureColumn(env, 'sites', 'last_status_code', 'INTEGER');
  await ensureColumn(env, 'sites', 'last_error', 'TEXT');
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category_id)').run();
  await ensureColumn(env, 'pending_sites', 'tags', 'TEXT');
  await ensureColumn(env, 'pending_sites', 'reason', 'TEXT');
  await ensureColumn(env, 'pending_sites', 'status', "TEXT NOT NULL DEFAULT 'pending'");
  await ensureColumn(env, 'pending_sites', 'reject_reason', 'TEXT');
  await ensureColumn(env, 'pending_sites', 'reviewed_at', 'TIMESTAMP');
  await env.NAV_DB.prepare("UPDATE pending_sites SET status = 'pending' WHERE status IS NULL OR TRIM(status) = ''").run();
  await ensureColumn(env, 'categories', 'icon', 'TEXT');
  await ensureColumn(env, 'categories', 'color', 'TEXT');
  await ensureColumn(env, 'categories', 'description', 'TEXT');
  await env.NAV_DB.prepare('UPDATE sites SET hits = 0 WHERE hits IS NULL').run();
  await env.NAV_DB.prepare("UPDATE sites SET visibility = 'public' WHERE visibility IS NULL OR TRIM(visibility) = ''").run();
  await env.NAV_DB.prepare("UPDATE sites SET visibility = 'private' WHERE catelog = '私人书签' AND visibility = 'public'").run();

  console.log('[migration] sync legacy catelog to categories');

  await env.NAV_DB.prepare(`
    INSERT OR IGNORE INTO categories (name, sort_order, icon, color, description)
    SELECT
      s.catelog AS name,
      COALESCE(co.sort_order, MIN(s.sort_order), 9999) AS sort_order,
      cm.icon,
      NULL AS color,
      cm.description
    FROM sites s
    LEFT JOIN category_orders co ON co.catelog = s.catelog
    LEFT JOIN category_metadata cm ON cm.catelog = s.catelog
    WHERE s.catelog IS NOT NULL AND TRIM(s.catelog) <> ''
    GROUP BY s.catelog
  `).run();

  await env.NAV_DB.prepare(`
    UPDATE categories
    SET sort_order = COALESCE(
      (SELECT sort_order FROM category_orders WHERE category_orders.catelog = categories.name),
      sort_order
    )
  `).run();

  await env.NAV_DB.prepare(`
    UPDATE sites
    SET category_id = (
      SELECT id FROM categories WHERE categories.name = sites.catelog
    )
    WHERE category_id IS NULL
      AND catelog IS NOT NULL
      AND TRIM(catelog) <> ''
      AND EXISTS (SELECT 1 FROM categories WHERE categories.name = sites.catelog)
  `).run();

  console.log('[migration] completed');
}

async function ensureColumn(env, tableName, columnName, definition) {
  const { results } = await env.NAV_DB.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = (results || []).some((column) => column.name === columnName);
  if (exists) return;

  console.log(`[migration] adding missing column ${tableName}.${columnName}`);
  await env.NAV_DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
}