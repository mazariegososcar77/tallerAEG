/**
 * En palabras simples: este archivo arma la aplicacion web del backend
 * (el servidor que atiende todas las peticiones del sistema): activa las
 * piezas necesarias (seguridad basica, lectura de datos enviados, registro
 * de actividad, documentacion, las rutas de cada modulo, y el manejo de
 * errores) y las conecta en el orden correcto.
 *
 * Configuracion de la aplicacion Express: middleware global, rutas, Swagger y errores.
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { UPLOADS_DIR } from './middleware/upload.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

// Construye y devuelve la aplicacion Express ya lista, con todas sus
// piezas conectadas: seguridad, lectura del cuerpo de las peticiones,
// registro en consola, documentacion Swagger, las imagenes subidas, todas
// las rutas de la API, y al final el manejo de "ruta no encontrada" y de
// errores.
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
