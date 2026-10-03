/**
 * The OpenAPI document served at GET /api/docs.
 *
 * Kept as a module rather than a YAML file on disk so it ships inside
 * server/dist with everything else -- the deploy copies only the compiled
 * output, and a stray file read would resolve against whatever the working
 * directory happens to be under supervisor.
 *
 * Hand-maintained, so it can drift. There is a test that walks the Express
 * router and fails if a route exists with no entry here.
 */

const ITEM_STATUS = ['todo', 'in_progress', 'done'];
const IMPACT = ['low', 'medium', 'high'];
const EFFORT = ['quick', 'moderate', 'heavy'];

const bearer = [{ bearerAuth: [] }];

const ok = (schema: object, description = 'Success') => ({
  description,
  content: { 'application/json': { schema } },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/**
 * Error responses live under components.responses, not components.schemas. An
 * object with `description` and `content` is a Response, and referencing one
 * from a schemas path makes the document fail a strict OpenAPI 3.0 parse --
 * which is exactly what an agent generating a client would use.
 */
const errRef = (name: string) => ({ $ref: `#/components/responses/${name}` });
const arrayOf = (name: string) => ({ type: 'array', items: ref(name) });

const jsonBody = (schema: object, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ref('ErrorBody') } },
});

const pathId = (name = 'id', description = 'Resource id') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

const document = (baseUrl: string) => ({
  openapi: '3.0.3',
  info: {
    title: 'Taskboard API',
    version: '1.0.0',
    description: [
      'Checklists, items and notes for one user account.',
      '',
      '## Authentication',
      '',
      'Send a personal access token as a bearer token:',
      '',
      '```',
      'Authorization: Bearer tbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      '```',
      '',
      'Create one in the app under your username -> Settings -> API tokens. The',
      'token is shown once, at creation, and cannot be retrieved afterwards.',
      '',
      '### Scopes',
      '',
      '- `read` tokens may only make GET requests. Anything else returns 403.',
      '- `write` tokens may do everything the web app can.',
      '',
      'Tokens cannot manage tokens: `/api/tokens` requires signing in to the app,',
      'so a leaked token cannot mint a replacement for itself.',
      '',
      '### Vocabularies',
      '',
      `- item status: ${ITEM_STATUS.map((s) => `\`${s}\``).join(', ')}`,
      `- impact: ${IMPACT.map((s) => `\`${s}\``).join(', ')} (or null)`,
      `- effort: ${EFFORT.map((s) => `\`${s}\``).join(', ')} (or null)`,
      '- dates (`scheduledFor`, `dueDate`): `YYYY-MM-DD` strings, or null. Never',
      '  a timestamp -- they are calendar days, with no timezone.',
    ].join('\n'),
  },
  servers: [{ url: baseUrl, description: 'This server' }],
  security: bearer,
  tags: [
    { name: 'Checklists', description: 'Lists and the items in them' },
    { name: 'Items', description: 'Tasks inside a checklist' },
    { name: 'Notes', description: 'Free-floating text notes on the board' },
    { name: 'Tokens', description: 'API tokens. Session login only, not token-accessible' },
    { name: 'Auth', description: 'Sign in and identify yourself' },
    { name: 'Meta', description: 'Health and this document' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Meta'],
        summary: 'Liveness, and seconds since the process started',
        security: [],
        responses: {
          200: ok({
            type: 'object',
            properties: { status: { type: 'string' }, uptime: { type: 'integer' } },
          }),
        },
      },
    },
    '/api/docs': {
      get: {
        tags: ['Meta'],
        summary: 'This document',
        security: [],
        responses: { 200: ok({ type: 'object' }, 'An OpenAPI 3.0 document') },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        security: [],
        requestBody: jsonBody(ref('Credentials')),
        responses: { 201: ok(ref('AuthResult')), 400: errRef('BadRequest') },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange a password for a 7-day session token',
        security: [],
        requestBody: jsonBody(ref('Credentials')),
        responses: { 200: ok(ref('AuthResult')), 401: errRef('Unauthorized') },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Who this credential belongs to',
        description:
          'Accepts a session JWT or an API token. The cheapest way for an agent to check that its token works, and authKind tells it which credential the server saw.',
        responses: {
          200: ok({
            type: 'object',
            properties: {
              user: ref('User'),
              authKind: {
                type: 'string',
                enum: ['session', 'token'],
                description: 'How this request authenticated.',
              },
            },
          }),
          401: errRef('Unauthorized'),
        },
      },
    },

    '/api/checklists': {
      get: {
        tags: ['Checklists'],
        summary: 'Every checklist, with its items',
        description: 'Items arrive in board order. This is the one call an agent needs to see everything.',
        responses: { 200: ok(arrayOf('Checklist')) },
      },
      post: {
        tags: ['Checklists'],
        summary: 'Create a checklist',
        requestBody: jsonBody({
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            x: { type: 'number', description: 'Board position. Defaults to 0.' },
            y: { type: 'number' },
            color: ref('ChecklistColor'),
          },
        }),
        responses: { 201: ok(ref('Checklist')) },
      },
    },
    '/api/checklists/{id}': {
      patch: {
        tags: ['Checklists'],
        summary: 'Rename, recolour or move a checklist',
        parameters: [pathId('id', 'Checklist id')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            title: { type: 'string' },
            x: { type: 'number' },
            y: { type: 'number' },
            color: ref('ChecklistColor'),
          },
        }),
        responses: { 200: ok(ref('Checklist')), 404: errRef('NotFound') },
      },
      delete: {
        tags: ['Checklists'],
        summary: 'Delete a checklist and everything in it',
        parameters: [pathId('id', 'Checklist id')],
        responses: { 204: { description: 'Deleted' }, 404: errRef('NotFound') },
      },
    },

    '/api/checklists/{id}/items': {
      post: {
        tags: ['Items'],
        summary: 'Add an item',
        parameters: [pathId('id', 'Checklist id')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            text: { type: 'string' },
            afterItemId: {
              type: 'string',
              description: 'Insert directly below this item instead of at the end.',
            },
            status: ref('ItemStatus'),
            scheduledFor: ref('CalendarDate'),
            dueDate: ref('CalendarDate'),
            impact: ref('Impact'),
            effort: ref('Effort'),
            notes: { type: 'string', nullable: true },
          },
        }),
        responses: { 201: ok(ref('ChecklistItem')), 400: errRef('BadRequest') },
      },
    },
    '/api/checklists/{checklistId}/items/{itemId}': {
      patch: {
        tags: ['Items'],
        summary: 'Update an item',
        description: 'Only the fields you send are changed. Send null to clear a field.',
        parameters: [pathId('checklistId', 'Checklist id'), pathId('itemId', 'Item id')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            text: { type: 'string' },
            status: ref('ItemStatus'),
            scheduledFor: ref('CalendarDate'),
            dueDate: ref('CalendarDate'),
            impact: ref('Impact'),
            effort: ref('Effort'),
            notes: { type: 'string', nullable: true },
          },
        }),
        responses: { 200: ok(ref('ChecklistItem')), 400: errRef('BadRequest'), 404: errRef('NotFound') },
      },
      delete: {
        tags: ['Items'],
        summary: 'Delete an item',
        parameters: [pathId('checklistId', 'Checklist id'), pathId('itemId', 'Item id')],
        responses: { 204: { description: 'Deleted' }, 404: errRef('NotFound') },
      },
    },
    '/api/checklists/{id}/reorder': {
      post: {
        tags: ['Items'],
        summary: 'Reorder items within one checklist',
        parameters: [pathId('id', 'Checklist id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['itemIds'],
          properties: {
            itemIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Every item id, in the order you want them.',
            },
          },
        }),
        responses: { 200: ok(ref('Success')), 404: errRef('NotFound') },
      },
    },
    '/api/checklists/move-item': {
      post: {
        tags: ['Items'],
        summary: 'Move an item to another checklist',
        requestBody: jsonBody({
          type: 'object',
          required: ['sourceChecklistId', 'targetChecklistId', 'itemId'],
          properties: {
            sourceChecklistId: { type: 'string' },
            targetChecklistId: { type: 'string' },
            itemId: { type: 'string' },
            targetIndex: { type: 'integer', description: 'Position in the target. Appends if omitted.' },
          },
        }),
        responses: { 200: ok(ref('Success')), 404: errRef('NotFound') },
      },
    },
    '/api/checklists/reorder-checklists': {
      post: {
        tags: ['Checklists'],
        summary: 'Reorder the checklists themselves',
        requestBody: jsonBody({
          type: 'object',
          required: ['checklistIds'],
          properties: { checklistIds: { type: 'array', items: { type: 'string' } } },
        }),
        responses: { 200: ok(ref('Success')) },
      },
    },
    '/api/checklists/positions': {
      post: {
        tags: ['Checklists'],
        summary: 'Set board positions in bulk',
        requestBody: jsonBody({
          type: 'object',
          required: ['positions'],
          properties: {
            positions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'x', 'y'],
                properties: {
                  id: { type: 'string' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
              },
            },
          },
        }),
        responses: { 200: ok(ref('Success')) },
      },
    },
    '/api/checklists/{id}/select-all': {
      post: {
        tags: ['Items'],
        summary: 'Mark every item in a checklist done',
        description: 'In-progress items included.',
        parameters: [pathId('id', 'Checklist id')],
        responses: { 200: ok(ref('Success')), 404: errRef('NotFound') },
      },
    },
    '/api/checklists/{id}/deselect-all': {
      post: {
        tags: ['Items'],
        summary: 'Reopen every done item',
        description: 'Only items with status done are reset to todo; in-progress items are left alone.',
        parameters: [pathId('id', 'Checklist id')],
        responses: { 200: ok(ref('Success')), 404: errRef('NotFound') },
      },
    },
    '/api/checklists/{id}/completed': {
      delete: {
        tags: ['Items'],
        summary: 'Delete every done item in a checklist',
        description: 'Only status done. In-progress and todo items are never deleted.',
        parameters: [pathId('id', 'Checklist id')],
        responses: { 200: ok(ref('Success')), 404: errRef('NotFound') },
      },
    },

    '/api/textnotes': {
      get: {
        tags: ['Notes'],
        summary: 'Every text note',
        responses: { 200: ok(arrayOf('TextNote')) },
      },
      post: {
        tags: ['Notes'],
        summary: 'Create a text note',
        requestBody: jsonBody({
          type: 'object',
          properties: {
            text: { type: 'string' },
            x: { type: 'number' },
            y: { type: 'number' },
            fontSize: { type: 'number' },
            color: ref('ChecklistColor'),
          },
        }),
        responses: { 201: ok(ref('TextNote')) },
      },
    },
    '/api/textnotes/{id}': {
      patch: {
        tags: ['Notes'],
        summary: 'Update a text note',
        parameters: [pathId('id', 'Note id')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            text: { type: 'string' },
            x: { type: 'number' },
            y: { type: 'number' },
            fontSize: { type: 'number' },
            color: ref('ChecklistColor'),
          },
        }),
        responses: { 200: ok(ref('TextNote')), 404: errRef('NotFound') },
      },
      delete: {
        tags: ['Notes'],
        summary: 'Delete a text note',
        parameters: [pathId('id', 'Note id')],
        responses: { 204: { description: 'Deleted' }, 404: errRef('NotFound') },
      },
    },

    '/api/tokens': {
      get: {
        tags: ['Tokens'],
        summary: 'List your API tokens',
        description: 'Session login only. The token values are not returned -- only their prefixes.',
        responses: { 200: ok(arrayOf('ApiToken')), 403: errRef('Forbidden') },
      },
      post: {
        tags: ['Tokens'],
        summary: 'Create an API token',
        description: 'Session login only. The response is the only time the token value is returned.',
        requestBody: jsonBody({
          type: 'object',
          required: ['name', 'scope'],
          properties: {
            name: { type: 'string', maxLength: 60 },
            scope: { type: 'string', enum: ['read', 'write'] },
            expiresInDays: {
              description: 'Days until expiry. Omit, or send null, for a token that never expires.',
              type: 'integer',
              nullable: true,
              minimum: 1,
              maximum: 3650,
            },
          },
        }),
        responses: {
          201: ok(ref('ApiTokenCreated'), 'Created. Copy the token now.'),
          400: errRef('BadRequest'),
          403: errRef('Forbidden'),
        },
      },
    },
    '/api/tokens/{id}': {
      delete: {
        tags: ['Tokens'],
        summary: 'Revoke an API token',
        description: 'Session login only. Immediate and permanent.',
        parameters: [pathId('id', 'Token id')],
        responses: {
          204: { description: 'Revoked' },
          403: errRef('Forbidden'),
          404: errRef('NotFound'),
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: errorResponse('The request body failed validation.'),
      Unauthorized: errorResponse('Missing, malformed, expired or revoked credential.'),
      Forbidden: errorResponse(
        'Authenticated, but not allowed: a read-only token attempting a write, or any token touching /api/tokens.'
      ),
      NotFound: errorResponse(
        'No such resource for this account. Returned instead of 403 for something owned by someone else, so an id cannot be probed for existence.'
      ),
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'A personal access token (`tbp_...`) or a session JWT from /api/auth/login.',
      },
    },
    schemas: {
      ItemStatus: { type: 'string', enum: ITEM_STATUS },
      Impact: { type: 'string', enum: IMPACT, nullable: true },
      Effort: { type: 'string', enum: EFFORT, nullable: true },
      CalendarDate: {
        type: 'string',
        nullable: true,
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        example: '2026-10-15',
        description: 'A calendar day, with no time and no timezone.',
      },
      ChecklistColor: {
        type: 'string',
        enum: ['default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown', 'gray'],
      },
      Success: { type: 'object', properties: { success: { type: 'boolean' } } },
      ErrorBody: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      User: {
        type: 'object',
        properties: { id: { type: 'string' }, username: { type: 'string' } },
      },
      Credentials: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string', minLength: 6 },
        },
      },
      AuthResult: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'A session JWT, valid 7 days.' },
          user: ref('User'),
        },
      },
      ChecklistItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          status: ref('ItemStatus'),
          scheduledFor: ref('CalendarDate'),
          dueDate: ref('CalendarDate'),
          impact: ref('Impact'),
          effort: ref('Effort'),
          notes: { type: 'string', nullable: true },
          order: { type: 'integer' },
          checklistId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Checklist: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: {
            type: 'string',
            description:
              'The owner. Always the authenticated account — every route is scoped to it — so it is of no use for addressing anything, but the server does return it.',
          },
          title: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          color: ref('ChecklistColor'),
          order: { type: 'integer' },
          items: arrayOf('ChecklistItem'),
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TextNote: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: {
            type: 'string',
            description:
              'The owner. Always the authenticated account — every route is scoped to it — so it is of no use for addressing anything, but the server does return it.',
          },
          text: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          fontSize: { type: 'number' },
          color: ref('ChecklistColor'),
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiToken: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          prefix: { type: 'string', description: 'The first characters of the token, for telling them apart.' },
          scope: { type: 'string', enum: ['read', 'write'] },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          lastUsedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Updated at most once a minute.',
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiTokenCreated: {
        allOf: [
          ref('ApiToken'),
          {
            type: 'object',
            properties: {
              token: {
                type: 'string',
                description: 'The token. Returned only here, and never retrievable again.',
              },
            },
          },
        ],
      },
    },
  },
});

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * `GET /api/checklists/{id}/items` -> `getChecklistsByIdItems`.
 *
 * Derived rather than hand-written so a route added later cannot arrive without
 * one. Code generators turn these into client method names, which is the whole
 * reason an agent-facing document should carry them.
 */
const operationIdFor = (method: string, path: string): string =>
  method +
  path
    .replace(/^\/api\//, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith('{')
        ? 'By' + capitalise(segment.slice(1, -1))
        : capitalise(segment.replace(/-([a-z])/g, (_, c) => c.toUpperCase()))
    )
    .join('');

/**
 * Fills in what every operation needs but nothing should have to repeat: an
 * operationId, and a 401 on anything that takes a credential. Done here rather
 * than at each call site so the two cannot be forgotten one route at a time.
 */
export const buildOpenApiDocument = (baseUrl: string) => {
  const doc = document(baseUrl);

  for (const [path, operations] of Object.entries(doc.paths)) {
    for (const [method, operation] of Object.entries(operations as Record<string, any>)) {
      operation.operationId ??= operationIdFor(method, path);

      // `security: []` marks the handful of endpoints that take no credential.
      const isPublic = Array.isArray(operation.security) && operation.security.length === 0;
      if (!isPublic) {
        operation.responses['401'] ??= { $ref: '#/components/responses/Unauthorized' };
      }
    }
  }

  return doc;
};
