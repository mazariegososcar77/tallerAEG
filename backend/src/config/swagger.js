/** Configuracion de OpenAPI/Swagger generada a partir de los comentarios JSDoc de las rutas. */
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sistema Taller AEG',
      version: '1.0.0',
      description: 'Modulo 1: autenticacion, usuarios, roles y permisos (RBAC).',
    },
    servers: [{ url: '/api', description: 'Base de la API' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Permission: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            code: { type: 'string', example: 'users.create' },
            description: { type: 'string' },
            module: { type: 'string', example: 'Usuarios' },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'Administrador' },
            description: { type: 'string' },
            is_active: { type: 'boolean' },
            permissions: { type: 'array', items: { type: 'integer' }, example: [1, 2, 6] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        RoleCreate: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Supervisor' },
            description: { type: 'string' },
            permissions: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
          },
        },
        RoleUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role_id: { type: 'integer' },
            role_name: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: {
              type: 'object',
              properties: { id: { type: 'integer' }, name: { type: 'string' } },
            },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        UserCreate: {
          type: 'object',
          required: ['name', 'email', 'password', 'role_id'],
          properties: {
            name: { type: 'string', example: 'Juan Perez' },
            email: { type: 'string', format: 'email', example: 'juan@talleraeg.com' },
            password: { type: 'string', minLength: 6, example: 'secreto123' },
            role_id: { type: 'integer', example: 2 },
            is_active: { type: 'boolean', example: true },
          },
        },
        UserUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role_id: { type: 'integer' },
            is_active: { type: 'boolean' },
          },
        },
        Warehouse: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'Bodega Central' },
            description: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        ArticleType: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'Maquina' },
            description: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        Article: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            code: { type: 'string', example: 'MAQ-001' },
            name: { type: 'string' },
            type_id: { type: 'integer' },
            type_name: { type: 'string' },
            warehouse_id: { type: 'integer' },
            warehouse_name: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string', example: 'unidad' },
            price: { type: 'number' },
            brand: { type: 'string' },
            model: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            image_url: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);
