import { buildOpenApiDocument } from './market-intelligence-openapi.util';

type PostmanRequest = {
  name: string;
  request: {
    method: string;
    header: { key: string; value: string }[];
    body?: { mode: string; raw: string };
    url: { raw: string; host: string[]; path: string[]; query?: { key: string; value: string }[] };
  };
};

export function buildPostmanCollection(options: {
  serverUrl?: string;
  apiKeyVariable?: string;
}) {
  const serverUrl = (options.serverUrl ?? 'http://localhost:3001').replace(/\/$/, '');
  const apiKey = options.apiKeyVariable ?? '{{crenit_api_key}}';
  const host = serverUrl.replace(/^https?:\/\//, '').split('/');
  const baseHost = host[0];
  const isHttps = serverUrl.startsWith('https');

  const authHeader = { key: 'X-CRENIT-Key', value: apiKey };
  const mk = (name: string, method: string, pathParts: string[], query?: Record<string, string>): PostmanRequest => ({
    name,
    request: {
      method,
      header: [authHeader, { key: 'Accept', value: 'application/json' }],
      url: {
        raw:
          serverUrl +
          '/' +
          pathParts.join('/') +
          (query ? '?' + Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''),
        host: [baseHost],
        path: pathParts,
        ...(query
          ? { query: Object.entries(query).map(([key, value]) => ({ key, value })) }
          : {}),
      },
    },
  });

  const items: PostmanRequest[] = [
    mk('Catalog', 'GET', ['api', 'v1', 'catalog']),
    mk('OpenAPI spec', 'GET', ['api', 'v1', 'openapi.json']),
    mk('Suburb detail', 'GET', ['api', 'v1', 'suburb', '{{suburb}}']),
    mk('Suburb trends', 'GET', ['api', 'v1', 'suburb', '{{suburb}}', 'trends']),
    mk('Sale comps pilot', 'GET', ['api', 'v1', 'suburb', '{{suburb}}', 'sale-comps']),
    mk('City overview', 'GET', ['api', 'v1', 'city-overview']),
    mk('Lender risk', 'GET', ['api', 'v1', 'lender-risk', '{{suburb}}']),
    mk('Report catalog', 'GET', ['api', 'v1', 'reports']),
    mk('Report preview', 'GET', ['api', 'v1', 'reports', 'suburb_report', 'preview'], { suburb: '{{suburb}}' }),
    {
      name: 'Report PDF',
      request: {
        method: 'GET',
        header: [authHeader, { key: 'Accept', value: 'application/pdf' }],
        url: {
          raw: `${serverUrl}/api/v1/reports/suburb_report/pdf?suburb={{suburb}}`,
          host: [baseHost],
          path: ['api', 'v1', 'reports', 'suburb_report', 'pdf'],
          query: [{ key: 'suburb', value: '{{suburb}}' }],
        },
      },
    },
    mk('List webhooks', 'GET', ['api', 'v1', 'webhooks']),
    {
      name: 'Register webhook',
      request: {
        method: 'POST',
        header: [authHeader, { key: 'Content-Type', value: 'application/json' }],
        body: {
          mode: 'raw',
          raw: JSON.stringify({ url: 'https://example.com/crenit-webhook', events: ['suburb.licensable'] }, null, 2),
        },
        url: { raw: `${serverUrl}/api/v1/webhooks`, host: [baseHost], path: ['api', 'v1', 'webhooks'] },
      },
    },
  ];

  return {
    info: {
      name: 'CRENIT Data Intelligence API',
      description: `Generated from OpenAPI ${buildOpenApiDocument(serverUrl).info.version}. Set variables crenit_api_key and suburb.`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'base_url', value: serverUrl },
      { key: 'crenit_api_key', value: '' },
      { key: 'suburb', value: 'Klein Windhoek' },
    ],
    item: items,
    protocolProfileBehavior: {},
  };
}
