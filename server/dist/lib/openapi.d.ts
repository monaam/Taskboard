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
export declare const buildOpenApiDocument: (baseUrl: string) => {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    security: {
        bearerAuth: never[];
    }[];
    tags: {
        name: string;
        description: string;
    }[];
    paths: {
        '/api/health': {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
        };
        '/api/docs': {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
        };
        '/api/auth/register': {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    400: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/auth/login': {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    401: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/auth/me': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    401: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists': {
            get: {
                tags: string[];
                summary: string;
                description: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
        };
        '/api/checklists/{id}': {
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
            delete: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    204: {
                        description: string;
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/{id}/items': {
            post: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    400: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/{checklistId}/items/{itemId}': {
            patch: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    400: {
                        $ref: string;
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
            delete: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    204: {
                        description: string;
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/{id}/reorder': {
            post: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/move-item': {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/reorder-checklists': {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
        };
        '/api/checklists/positions': {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
        };
        '/api/checklists/{id}/select-all': {
            post: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/{id}/deselect-all': {
            post: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/checklists/{id}/completed': {
            delete: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/textnotes': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                };
            };
        };
        '/api/textnotes/{id}': {
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
            delete: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    204: {
                        description: string;
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/tokens': {
            get: {
                tags: string[];
                summary: string;
                description: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    403: {
                        $ref: string;
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                description: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: object;
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: object;
                            };
                        };
                    };
                    400: {
                        $ref: string;
                    };
                    403: {
                        $ref: string;
                    };
                };
            };
        };
        '/api/tokens/{id}': {
            delete: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    204: {
                        description: string;
                    };
                    403: {
                        $ref: string;
                    };
                    404: {
                        $ref: string;
                    };
                };
            };
        };
    };
    components: {
        securitySchemes: {
            bearerAuth: {
                type: string;
                scheme: string;
                description: string;
            };
        };
        schemas: {
            ItemStatus: {
                type: string;
                enum: string[];
            };
            Impact: {
                type: string;
                enum: string[];
                nullable: boolean;
            };
            Effort: {
                type: string;
                enum: string[];
                nullable: boolean;
            };
            CalendarDate: {
                type: string;
                nullable: boolean;
                pattern: string;
                example: string;
                description: string;
            };
            ChecklistColor: {
                type: string;
                enum: string[];
            };
            Success: {
                type: string;
                properties: {
                    success: {
                        type: string;
                    };
                };
            };
            ErrorResponse: {
                description: string;
                content: {
                    'application/json': {
                        schema: {
                            type: string;
                            properties: {
                                error: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
            };
            User: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    username: {
                        type: string;
                    };
                };
            };
            Credentials: {
                type: string;
                required: string[];
                properties: {
                    username: {
                        type: string;
                    };
                    password: {
                        type: string;
                        minLength: number;
                    };
                };
            };
            AuthResult: {
                type: string;
                properties: {
                    token: {
                        type: string;
                        description: string;
                    };
                    user: {
                        $ref: string;
                    };
                };
            };
            ChecklistItem: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    text: {
                        type: string;
                    };
                    status: {
                        $ref: string;
                    };
                    scheduledFor: {
                        $ref: string;
                    };
                    dueDate: {
                        $ref: string;
                    };
                    impact: {
                        $ref: string;
                    };
                    effort: {
                        $ref: string;
                    };
                    notes: {
                        type: string;
                        nullable: boolean;
                    };
                    order: {
                        type: string;
                    };
                    checklistId: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            Checklist: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    title: {
                        type: string;
                    };
                    x: {
                        type: string;
                    };
                    y: {
                        type: string;
                    };
                    color: {
                        $ref: string;
                    };
                    order: {
                        type: string;
                    };
                    items: {
                        type: string;
                        items: {
                            $ref: string;
                        };
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            TextNote: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    text: {
                        type: string;
                    };
                    x: {
                        type: string;
                    };
                    y: {
                        type: string;
                    };
                    fontSize: {
                        type: string;
                    };
                    color: {
                        $ref: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ApiToken: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    prefix: {
                        type: string;
                        description: string;
                    };
                    scope: {
                        type: string;
                        enum: string[];
                    };
                    expiresAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    lastUsedAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                        description: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ApiTokenCreated: {
                allOf: ({
                    $ref: string;
                } | {
                    type: string;
                    properties: {
                        token: {
                            type: string;
                            description: string;
                        };
                    };
                })[];
            };
        };
    };
};
//# sourceMappingURL=openapi.d.ts.map