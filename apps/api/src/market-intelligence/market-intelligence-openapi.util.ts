/** OpenAPI 3.0 document for CRENIT Data Intelligence B2B API. */
export function buildOpenApiDocument(serverUrl = 'http://localhost:3001') {
  const envelopeProps = {
    transaction_count: { type: 'integer' },
    sample_count: { type: 'integer', deprecated: true },
    confidence_level: { type: 'string', enum: ['insufficient', 'low', 'moderate', 'high'] },
    licensing_notice: { type: 'string' },
    commercially_licensable: { type: 'boolean' },
    data_source: { type: 'string', enum: ['market_data_records', 'market_data_snapshots', 'mixed'] },
    minimum_sample_not_met: { type: 'boolean' },
    required_minimum_sample: { type: 'integer' },
  };

  return {
    openapi: '3.0.3',
    info: {
      title: 'CRENIT Data Intelligence API',
      version: '1.0.0',
      description:
        'Licensed verified rental market data from CRENIT platform payments. See docs/B2B_INTEGRATOR_GUIDE.md.',
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        CrenitApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CRENIT-Key',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { nullable: true },
          },
        },
        ComplianceEnvelope: { type: 'object', properties: envelopeProps },
        SuburbDetail: {
          allOf: [
            { $ref: '#/components/schemas/ComplianceEnvelope' },
            {
              type: 'object',
              properties: {
                suburb: { type: 'string' },
                price_range: {
                  type: 'object',
                  properties: { min: { type: 'number' }, max: { type: 'number' }, median: { type: 'number' } },
                },
                rent_distribution: { type: 'array', items: { type: 'object' } },
                on_time_trend: { type: 'array', items: { type: 'object' } },
              },
            },
          ],
        },
      },
    },
    security: [{ CrenitApiKey: [] }],
    paths: {
      '/api/v1/catalog': {
        get: {
          summary: 'API catalog',
          tags: ['Meta'],
          responses: { '200': { description: 'Route and compliance metadata' } },
        },
      },
      '/api/v1/openapi.json': {
        get: { summary: 'This OpenAPI document', tags: ['Meta'], security: [{ CrenitApiKey: [] }] },
      },
      '/api/v1/suburb/{name}': {
        get: {
          summary: 'Suburb rental intelligence',
          tags: ['Rental'],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Suburb detail with compliance envelope' },
            '404': { description: 'Suburb not found' },
          },
        },
      },
      '/api/v1/suburb/{name}/trends': {
        get: {
          summary: 'Suburb on-time payment trend',
          tags: ['Rental'],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Monthly on-time rates' } },
        },
      },
      '/api/v1/suburb/{name}/sale-comps': {
        get: {
          summary: 'Sale comps pilot (partner data)',
          tags: ['Sale comps (pilot)'],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Pilot sale statistics' } },
        },
      },
      '/api/v1/sale-comps/ingest': {
        post: {
          summary: 'Ingest sale comps (partner pilot, max 100 records)',
          tags: ['Sale comps (pilot)'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['records'],
                  properties: {
                    records: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['suburb', 'sale_price', 'transfer_date'],
                        properties: {
                          suburb: { type: 'string' },
                          city: { type: 'string' },
                          sale_price: { type: 'number' },
                          transfer_date: { type: 'string', format: 'date' },
                          source_type: {
                            type: 'string',
                            enum: ['deeds', 'valuer', 'mls', 'bank_collateral', 'pilot_manual'],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Insert count' } },
        },
      },
      '/api/v1/city-overview': {
        get: { summary: 'City-wide suburb rankings', tags: ['Rental'], responses: { '200': { description: 'OK' } } },
      },
      '/api/v1/lender-risk/{suburb}': {
        get: {
          summary: 'Lender risk pack',
          tags: ['Rental'],
          parameters: [{ name: 'suburb', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Underwriting pack or sample stub' } },
        },
      },
      '/api/v1/reports': {
        get: { summary: 'Licensed report catalog', tags: ['Reports'], responses: { '200': { description: 'OK' } } },
      },
      '/api/v1/reports/{reportType}/preview': {
        get: {
          summary: 'Report JSON preview',
          tags: ['Reports'],
          parameters: [
            { name: 'reportType', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'suburb', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Preview payload' }, '400': { description: 'Insufficient sample' } },
        },
      },
      '/api/v1/reports/{reportType}/pdf': {
        get: {
          summary: 'Licensed report PDF',
          tags: ['Reports'],
          parameters: [
            { name: 'reportType', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'suburb', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'application/pdf' },
            '400': { description: 'Insufficient sample' },
          },
        },
      },
      '/api/v1/webhooks': {
        get: { summary: 'List webhook subscriptions', tags: ['Webhooks'] },
        post: {
          summary: 'Register webhook',
          tags: ['Webhooks'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
