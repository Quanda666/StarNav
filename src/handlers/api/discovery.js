export function getPublicApiDiscovery(origin = '') {
  const baseUrl = origin || '';
  const endpoints = [
    {
      method: 'GET',
      path: '/api/sites',
      summary: '公开书签列表',
      auth: 'none',
      permission: '按当前 cookie 权限过滤 private/admin_only/unlisted；未解锁访客只返回公开可列出书签',
      query: {
        page: '页码，默认 1',
        pageSize: '每页数量，默认 10',
        catalog: '分类名称',
        tag: '标签名称',
        keyword: '普通关键词',
        sort: '排序模式，例如 hot/recent',
        health: '健康筛选：bad/ok/unknown',
      },
    },
    {
      method: 'POST',
      path: '/api/sites',
      summary: '第三方创建书签',
      auth: 'bearer',
      permission: '需要后台 cookie 或 Bearer Token write/admin scope；适合浏览器插件和脚本写入',
      body: {
        name: '书签名称，必填',
        url: '书签 URL，必填',
        desc: '描述，可选',
        catelog: '分类，可选',
        tags: '标签，可选，逗号或空格分隔',
        visibility: '可见性，可选：public/private/unlisted/admin_only',
      },
    },
    {
      method: 'GET',
      path: '/api/categories',
      summary: '平铺分类列表',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'GET',
      path: '/api/categories/tree',
      summary: '树形分类列表',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'GET',
      path: '/api/tags',
      summary: '标签列表及使用次数',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'GET',
      path: '/api/search',
      summary: '全站公开搜索',
      auth: 'none',
      permission: '按当前 cookie 权限过滤 private/admin_only/unlisted；未解锁访客只搜索公开可列出书签',
      query: {
        q: '搜索词，支持 tag: / cat: / category: / url: / is: 语法',
        keyword: 'q 的兼容别名',
        limit: '返回数量，默认 50',
      },
    },
    {
      method: 'GET',
      path: '/api/settings/public',
      summary: '站点公开设置',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'POST',
      path: '/api/ai/chat',
      summary: 'AI 书签助理',
      auth: 'none',
      permission: '按当前 cookie 权限过滤 private/admin_only/unlisted；未解锁访客只检索公开可列出书签',
      body: {
        message: '用户问题，必填',
        previousSites: '上一轮命中书签 ID 数组，可选；后端会重新读取并校验权限',
      },
    },
    {
      method: 'GET',
      path: '/api/favicon',
      summary: '获取指定 URL 的 favicon',
      auth: 'none',
      permission: '公开可读',
      query: {
        url: '目标网站 URL，必填',
      },
    },
    {
      method: 'GET',
      path: '/api/site/preview',
      summary: '抓取网站标题、描述、favicon，并检测重复',
      auth: 'conditional',
      permission: '管理员可用；未登录访客仅在开启公开提交时可用',
      query: {
        url: '目标网站 URL，必填',
      },
    },
    {
      method: 'POST',
      path: '/api/config/submit',
      aliases: ['/api/submissions'],
      summary: '访客提交新书签',
      auth: 'none',
      permission: '仅在开启公开提交时可用',
    },
    {
      method: 'POST',
      path: '/api/submit/suggest-category',
      summary: '为访客提交推荐分类',
      auth: 'conditional',
      permission: '管理员可用；未登录访客仅在开启公开提交时可用',
    },
    {
      method: 'POST',
      path: '/api/submit/suggest-tags',
      summary: '为访客提交推荐标签',
      auth: 'conditional',
      permission: '管理员可用；未登录访客仅在开启公开提交时可用',
    },
  ];

  return {
    code: 200,
    name: 'StarNav Public API',
    version: '1.0.0',
    baseUrl,
    description: '公开 API 默认无需 Token；第三方写入可使用 Bearer Token；敏感管理操作仍使用后台 cookie 鉴权。',
    endpoints,
    openapi: `${baseUrl}/api/openapi.json`,
  };
}

export function getPublicOpenApiDocument(origin = '') {
  const discovery = getPublicApiDiscovery(origin);
  const paths = {};
  for (const endpoint of discovery.endpoints) {
    const pathItem = paths[endpoint.path] || {};
    pathItem[endpoint.method.toLowerCase()] = {
      summary: endpoint.summary,
      description: endpoint.permission,
      security: endpoint.auth === 'none' ? [] : endpoint.auth === 'bearer' ? [{ bearerAuth: [] }] : [{ cookieAuth: [] }],
      parameters: Object.entries(endpoint.query || {}).map(([name, description]) => ({
        name,
        in: 'query',
        required: /必填/.test(description),
        schema: { type: 'string' },
        description,
      })),
      requestBody: endpoint.body ? {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: Object.fromEntries(Object.entries(endpoint.body).map(([name, description]) => [name, { type: 'string', description }])),
            },
          },
        },
      } : undefined,
      responses: {
        200: { description: 'OK' },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    };
    paths[endpoint.path] = pathItem;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: discovery.name,
      version: discovery.version,
      description: discovery.description,
    },
    servers: [{ url: origin || '/' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'admin_session',
          description: '后台管理操作使用现有 cookie 鉴权；公开 API 不需要鉴权。',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'StarNav API Token',
          description: '第三方写入接口可使用 Authorization: Bearer <token>。',
        },
      },
    },
    paths,
  };
}