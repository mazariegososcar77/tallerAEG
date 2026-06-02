/** Configuracion de la aplicacion Express: middleware global, rutas, Swagger y errores. */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { UPLOADS_DIR } from './middleware/upload.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan('dev'));

  // Documentacion interactiva
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Imagenes subidas (servidas bajo /api para que el proxy de Vite las cubra en dev)
  app.use('/api/uploads', express.static(UPLOADS_DIR));

  // API
  app.use('/api', apiRoutes);

  // 404 + manejador de errores (siempre al final)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
