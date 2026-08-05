import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Minimal OpenAPI 3.1 spec for the public v1 API. */
export async function GET() {
  return NextResponse.json({
    openapi: '3.1.0',
    info: {
      title: 'SR Digital Public API',
      version: '1.0.0',
      description: 'Public REST API for third-party integrations with SR Digital laboratories.'
    },
    servers: [{ url: '/api/v1' }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'sk_live_...'
        }
      }
    },
    paths: {
      '/cases': {
        get: {
          summary: 'List cases',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { name: 'status', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rate limited' }
          }
        }
      },
      '/cases/{id}': {
        get: {
          summary: 'Get case by id',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '404': { description: 'Not found' }
          }
        }
      }
    }
  });
}
