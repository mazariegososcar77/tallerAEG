/**
 * En palabras simples: este archivo junta en un solo lugar la
 * configuracion secreta/ajustable del servidor (por ejemplo en que puerto
 * arranca, o la clave usada para generar el "carnet digital" de sesion),
 * que normalmente se define en un archivo .env y no se sube al repositorio.
 *
 * Carga y centraliza las variables de entorno.
 */
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
    // Credenciales de acceso (login/Username y query TAXID) asignadas por Digifact
    // (soporte@digifact.com.gt). En ambiente de pruebas puede ser un NIT distinto al
    // NIT fiscal real del emisor (ver emisorNit) -- Digifact asigna un NIT propio de
    // sandbox para el login de las cuentas de prueba.
    nit: process.env.DIGIFACT_NIT || '',
    username: process.env.DIGIFACT_USERNAME || '',
    password: process.env.DIGIFACT_PASSWORD || '',
    // Datos fiscales del emisor (Taller AEG) que exige el documento NUC.
    // emisorNit: NIT real que debe aparecer en el documento (Seller.TaxID) -- no
    // necesariamente el mismo que `nit` (ese es para autenticarse/consultar).
    emisorNit: process.env.DIGIFACT_EMISOR_NIT || '',
    afiliacionIva: process.env.DIGIFACT_AFILIACION_IVA || 'GEN',
    // Frase/Escenario: los confirma Digifact por NIT (soporte@digifact.com.gt), no son
    // universales -- para el NIT de pruebas 5888492 confirmaron Frase 1 / Escenario 2.
    frase: process.env.DIGIFACT_FRASE || '1',
    escenario: process.env.DIGIFACT_ESCENARIO || '2',
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
