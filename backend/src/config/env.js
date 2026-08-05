/** Carga y centraliza las variables de entorno. */
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '8h',
  digifact: {
    // 'test' contra el sandbox de Digifact, 'prod' contra el ambiente real.
    environment: process.env.DIGIFACT_ENV || 'test',
    testBaseUrl: process.env.DIGIFACT_TEST_BASE_URL || 'https://testnucgt.digifact.com',
    prodBaseUrl: process.env.DIGIFACT_PROD_BASE_URL || 'https://nucgt.digifact.com/gt.com.apinuc',
    // Credenciales asignadas por Digifact (soporte@digifact.com.gt) para el NIT del taller.
    nit: process.env.DIGIFACT_NIT || '',
    username: process.env.DIGIFACT_USERNAME || '',
    password: process.env.DIGIFACT_PASSWORD || '',
    // Datos fiscales del emisor (Taller AEG) que exige el documento NUC.
    afiliacionIva: process.env.DIGIFACT_AFILIACION_IVA || 'GEN',
    establecimientoCodigo: process.env.DIGIFACT_ESTABLECIMIENTO_CODIGO || '1',
    establecimientoNombre: process.env.DIGIFACT_ESTABLECIMIENTO_NOMBRE || '',
    emisorNombre: process.env.DIGIFACT_EMISOR_NOMBRE || '',
    emisorDireccion: process.env.DIGIFACT_EMISOR_DIRECCION || '',
    emisorMunicipio: process.env.DIGIFACT_EMISOR_MUNICIPIO || '',
    emisorDepartamento: process.env.DIGIFACT_EMISOR_DEPARTAMENTO || '',
    emisorCodigoGeografico: process.env.DIGIFACT_EMISOR_CODIGO_GEOGRAFICO || '',
    emisorEmail: process.env.DIGIFACT_EMISOR_EMAIL || '',
  },
};

if (env.jwtSecret === 'dev-insecure-secret-change-me') {
  console.warn('[env] JWT_SECRET no definido: usando un secreto inseguro de desarrollo.');
}
