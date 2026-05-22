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
    // 主表：spaces
    env.NAV_DB.prepare(`
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
      )
    `),
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
        space_id INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 9999,
        icon TEXT,
        color TEXT,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
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
    // 仅创建不依赖旧表新增字段的索引；依赖新增字段的索引需在 ensureColumn 之后创建。
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

  await ensureColumn(env, 'spaces', 'name', 'TEXT');
  await ensureColumn(env, 'spaces', 'slug', 'TEXT');
  await ensureColumn(env, 'spaces', 'icon', 'TEXT');
  await ensureColumn(env, 'spaces', 'color', 'TEXT');
  await ensureColumn(env, 'spaces', 'description', 'TEXT');
  await ensureColumn(env, 'spaces', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
  await ensureColumn(env, 'spaces', 'sort_order', 'INTEGER NOT NULL DEFAULT 9999');
  await ensureColumn(env, 'spaces', 'create_time', 'TIMESTAMP');
  await ensureColumn(env, 'spaces', 'update_time', 'TIMESTAMP');
  await env.NAV_DB.prepare("UPDATE spaces SET visibility = 'public' WHERE visibility IS NULL OR TRIM(visibility) = ''").run();
  await env.NAV_DB.prepare("UPDATE spaces SET slug = 'default' WHERE (slug IS NULL OR TRIM(slug) = '') AND (name = '默认空间' OR name = 'Default' OR id = 1)").run();
  await env.NAV_DB.prepare("UPDATE spaces SET name = '默认空间' WHERE name IS NULL OR TRIM(name) = ''").run();

  await ensureColumn(env, 'sites', 'category_id', 'INTEGER');
  await ensureColumn(env, 'sites', 'space_id', 'INTEGER');
  await ensureColumn(env, 'sites', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
  await ensureColumn(env, 'sites', 'sort_order', 'INTEGER NOT NULL DEFAULT 9999');
  await ensureColumn(env, 'sites', 'hits', 'INTEGER DEFAULT 0');
  await ensureColumn(env, 'sites', 'last_visit_time', 'TIMESTAMP');
  await ensureColumn(env, 'sites', 'last_checked_at', 'TIMESTAMP');
  await ensureColumn(env, 'sites', 'last_status_code', 'INTEGER');
  await ensureColumn(env, 'sites', 'last_error', 'TEXT');
  await ensureColumn(env, 'sites', 'create_time', 'TIMESTAMP');
  await ensureColumn(env, 'sites', 'update_time', 'TIMESTAMP');
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_catelog ON sites(catelog)').run();
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_sort ON sites(catelog, sort_order, create_time)').run();
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category_id)').run();
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_space ON sites(space_id)').run();
  await ensureColumn(env, 'pending_sites', 'tags', 'TEXT');
  await ensureColumn(env, 'pending_sites', 'reason', 'TEXT');
  await ensureColumn(env, 'pending_sites', 'status', "TEXT NOT NULL DEFAULT 'pending'");
  await ensureColumn(env, 'pending_sites', 'reject_reason', 'TEXT');
  await ensureColumn(env, 'pending_sites', 'reviewed_at', 'TIMESTAMP');
  await env.NAV_DB.prepare("UPDATE pending_sites SET status = 'pending' WHERE status IS NULL OR TRIM(status) = ''").run();
  await ensureColumn(env, 'categories', 'parent_id', 'INTEGER');
  await ensureColumn(env, 'categories', 'space_id', 'INTEGER');
  await ensureColumn(env, 'categories', 'sort_order', 'INTEGER NOT NULL DEFAULT 9999');
  await ensureColumn(env, 'categories', 'icon', 'TEXT');
  await ensureColumn(env, 'categories', 'color', 'TEXT');
  await ensureColumn(env, 'categories', 'description', 'TEXT');
  await ensureColumn(env, 'categories', 'create_time', 'TIMESTAMP');
  await ensureColumn(env, 'categories', 'update_time', 'TIMESTAMP');
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)').run();
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_space ON categories(space_id)').run();
  await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)').run();
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

  try {
    console.log('[migration] ensuring default space exists');
    let defaultSpace = await env.NAV_DB.prepare("SELECT id FROM spaces WHERE slug = 'default'").first();
    if (!defaultSpace) {
      const reusableSpace = await env.NAV_DB.prepare('SELECT id FROM spaces WHERE slug IS NULL OR TRIM(slug) = ? OR name = ? ORDER BY id ASC LIMIT 1').bind('', '默认空间').first();
      if (reusableSpace?.id) {
        console.log('[migration] repairing existing space as default space');
        await env.NAV_DB.prepare(`
          UPDATE spaces
          SET name = '默认空间',
              slug = 'default',
              description = COALESCE(description, '系统自动创建的默认导航空间'),
              visibility = COALESCE(NULLIF(TRIM(visibility), ''), 'public'),
              sort_order = 1,
              update_time = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(reusableSpace.id).run();
      } else {
        console.log('[migration] creating default space');
        await env.NAV_DB.prepare(`
          INSERT INTO spaces (name, slug, description, visibility, sort_order)
          VALUES ('默认空间', 'default', '系统自动创建的默认导航空间', 'public', 1)
        `).run();
      }
      defaultSpace = await env.NAV_DB.prepare("SELECT id FROM spaces WHERE slug = 'default'").first();
    }
    if (defaultSpace && defaultSpace.id) {
      console.log(`[migration] default space ready (ID: ${defaultSpace.id})`);
    }
  } catch (error) {
    console.warn(`[migration] default space skipped: ${error?.message || error}`);
  }

  console.log('[migration] completed');
}

async function ensureColumn(env, tableName, columnName, definition) {
  const { results } = await env.NAV_DB.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = (results || []).some((column) => column.name === columnName);
  if (exists) return;

  console.log(`[migration] adding missing column ${tableName}.${columnName}`);
  await env.NAV_DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
}