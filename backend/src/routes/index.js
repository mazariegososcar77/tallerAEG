// Este archivo es el "indice" de todas las direcciones web (rutas) del sistema: junta cada grupo de
// rutas (usuarios, clientes, articulos, ordenes, cotizaciones, facturas, etc.) bajo su propio prefijo
// (por ejemplo, todo lo de clientes queda bajo /api/clients).
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import roleRoutes from './roleRoutes.js';
import permissionRoutes from './permissionRoutes.js';
import warehouseRoutes from './warehouseRoutes.js';
import articleTypeRoutes from './articleTypeRoutes.js';
import articleRoutes from './articleRoutes.js';
import clientTypeRoutes from './clientTypeRoutes.js';
import loyaltyTierRoutes from './loyaltyTierRoutes.js';
import clientRoutes from './clientRoutes.js';
import workOrderRoutes from './workOrderRoutes.js';
import machineRoutes from './machineRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import quoteRoutes from './quoteRoutes.js';
import partCategoryRoutes from './partCategoryRoutes.js';
import workReportRoutes from './workReportRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import subcontractorRoutes from './subcontractorRoutes.js';
import serviceOrderRoutes from './serviceOrderRoutes.js';
import publicRoutes from './publicRoutes.js';

const router = Router();

// Chequeo simple para saber si el servidor esta vivo (no requiere iniciar sesion).
router.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Iniciar/cerrar sesion y ver el usuario conectado.
router.use('/auth', authRoutes);
// Administrar usuarios del sistema.
router.use('/users', userRoutes);
// Administrar roles (perfiles de permisos).
router.use('/roles', roleRoutes);
// Ver el catalogo de permisos disponibles.
router.use('/permissions', permissionRoutes);
// Administrar bodegas del inventario.
router.use('/warehouses', warehouseRoutes);
// Administrar tipos de articulo del inventario.
router.use('/article-types', articleTypeRoutes);
// Administrar articulos del inventario.
router.use('/articles', articleRoutes);
// Administrar tipos de cliente.
router.use('/client-types', clientTypeRoutes);
// Administrar niveles de fidelizacion de clientes.
router.use('/loyalty-tiers', loyaltyTierRoutes);
// Administrar clientes.
router.use('/clients', clientRoutes);
// Administrar ordenes de trabajo.
router.use('/work-orders', workOrderRoutes);
// Administrar maquinas de los clientes.
router.use('/machines', machineRoutes);
// Administrar el calendario de mantenimientos.
router.use('/maintenance', maintenanceRoutes);
// Administrar cotizaciones.
router.use('/quotes', quoteRoutes);
// Administrar categorias de pieza (catalogo usado en cotizaciones).
router.use('/part-categories', partCategoryRoutes);
// Administrar reportes de trabajo (fotos y notas de una orden).
router.use('/work-reports', workReportRoutes);
// Administrar facturas.
router.use('/invoices', invoiceRoutes);
// Administrar subcontratistas (terceros externos a los que se les manda trabajo afuera).
router.use('/subcontractors', subcontractorRoutes);
// Administrar ordenes de servicio (trabajos subcontratados fuera del taller).
router.use('/service-orders', serviceOrderRoutes);
// Rutas PUBLICAS (sin sesion) -- hoy solo el enlace de firma remota del cliente.
router.use('/public', publicRoutes);

export default router;
