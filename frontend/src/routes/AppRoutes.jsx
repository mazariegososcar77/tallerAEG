/**
 * Este archivo es el "mapa" de toda la aplicacion: define que direccion (url)
 * muestra que pantalla. Por ejemplo, "/clientes" muestra la pantalla de
 * clientes. Cada pantalla esta envuelta en un <ProtectedRoute>, que es el
 * "guardia" que exige tener sesion iniciada (y a veces un permiso especifico)
 * antes de dejar entrar — ver routes/ProtectedRoute.jsx.
 */
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import HomeRedirect from './HomeRedirect.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import UsersPage from '../pages/users/UsersPage.jsx';
import RolesPage from '../pages/roles/RolesPage.jsx';
import PermissionsPage from '../pages/permissions/PermissionsPage.jsx';
import ArticlesPage from '../pages/inventory/ArticlesPage.jsx';
import ArticleFormPage from '../pages/inventory/ArticleFormPage.jsx';
import ArticleTypesPage from '../pages/config/ArticleTypesPage.jsx';
import WarehousesPage from '../pages/config/WarehousesPage.jsx';
import ClientTypesPage from '../pages/config/ClientTypesPage.jsx';
import LoyaltyTiersPage from '../pages/config/LoyaltyTiersPage.jsx';
import ClientsPage from '../pages/clients/ClientsPage.jsx';
import ClientHistoryPage from '../pages/clients/ClientHistoryPage.jsx';
import WorkOrdersPage from '../pages/workOrders/WorkOrdersPage.jsx';
import MachinesPage from '../pages/machines/MachinesPage.jsx';
import MaintenancePage from '../pages/maintenance/MaintenancePage.jsx';
import WorkOrderFormPage from '../pages/workOrders/WorkOrderFormPage.jsx';
import QuotesPage from '../pages/quotes/QuotesPage.jsx';
import QuoteFormPage from '../pages/quotes/QuoteFormPage.jsx';
import GeneralSettingsPage from '../pages/config/GeneralSettingsPage.jsx';
import SystemParamsPage from '../pages/config/SystemParamsPage.jsx';
import CatalogsPage from '../pages/config/CatalogsPage.jsx';
import WorkReportsPage from '../pages/workReports/WorkReportsPage.jsx';
import WorkReportFormPage from '../pages/workReports/WorkReportFormPage.jsx';
import InvoicesPage from '../pages/billing/InvoicesPage.jsx';
import PartCategoriesPage from '../pages/config/PartCategoriesPage.jsx';
import ComingSoonPage from '../pages/config/ComingSoonPage.jsx';
import ServiceOrdersPage from '../pages/serviceOrders/ServiceOrdersPage.jsx';
import ServiceOrderFormPage from '../pages/serviceOrders/ServiceOrderFormPage.jsx';
import PublicSignaturePage from '../pages/public/PublicSignaturePage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Enlace publico de firma remota (sin sesion) -- ver PublicSignaturePage.jsx */}
      <Route path="/firmar/:token" element={<PublicSignaturePage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />

        {/* --- Pantalla principal --- */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* --- Rutas de Inventario (articulos del taller) --- */}
        <Route path="inventario" element={<ProtectedRoute permission="articles.view"><ArticlesPage /></ProtectedRoute>} />
        <Route path="inventario/nuevo" element={<ProtectedRoute permission="articles.create"><ArticleFormPage /></ProtectedRoute>} />
        <Route path="inventario/:id/editar" element={<ProtectedRoute permission="articles.update"><ArticleFormPage /></ProtectedRoute>} />

        {/* --- Rutas de Clientes --- */}
        <Route path="clientes" element={<ProtectedRoute permission="clients.view"><ClientsPage /></ProtectedRoute>} />
        <Route path="clientes/:id/historial" element={<ProtectedRoute permission="clients.view"><ClientHistoryPage /></ProtectedRoute>} />

        {/* --- Rutas de Ordenes de Trabajo (flujo Pre: cotizacion antes de la orden, sin cambios) --- */}
        <Route path="ordenes" element={<ProtectedRoute permission="dashboard.view"><WorkOrdersPage /></ProtectedRoute>} />
        <Route path="ordenes/nueva" element={<ProtectedRoute permission="dashboard.view"><WorkOrderFormPage /></ProtectedRoute>} />
        <Route path="ordenes/:id/editar" element={<ProtectedRoute permission="dashboard.view"><WorkOrderFormPage /></ProtectedRoute>} />

        {/* --- Rutas de Cotizaciones --- */}
        <Route path="cotizaciones" element={<ProtectedRoute permission="dashboard.view"><QuotesPage /></ProtectedRoute>} />
        <Route path="cotizaciones/nueva" element={<ProtectedRoute permission="dashboard.view"><QuoteFormPage /></ProtectedRoute>} />
        <Route path="cotizaciones/:id/editar" element={<ProtectedRoute permission="dashboard.view"><QuoteFormPage /></ProtectedRoute>} />

        {/* --- Rutas de Reportes de Trabajo (fotos de cada reparacion) --- */}
        <Route path="reportes" element={<ProtectedRoute permission="work-reports.view"><WorkReportsPage /></ProtectedRoute>} />
        <Route path="reportes/:id/editar" element={<ProtectedRoute permission="work-reports.view"><WorkReportFormPage /></ProtectedRoute>} />

        {/* --- Rutas de Facturacion --- */}
        <Route path="facturacion" element={<ProtectedRoute permission="billing.view"><InvoicesPage /></ProtectedRoute>} />

        {/* --- Rutas del flujo Post (equipo se desarma sin cotizacion previa) ---
             Reusan las mismas pantallas de Ordenes de Trabajo con flowType="post":
             lista y formulario filtran/guardan por flujo, y el formulario muestra
             los 3 campos de precio (torno/repuestos/mano de obra) que Pre no tiene.
             Cotizaciones/Reportes/Facturacion de Post quedan "Proximamente": la
             secuencia invertida (reporte antes que cotizacion) es una fase futura. --- */}
        <Route path="post/ordenes" element={<ProtectedRoute permission="dashboard.view"><WorkOrdersPage flowType="post" /></ProtectedRoute>} />
        <Route path="post/ordenes/nueva" element={<ProtectedRoute permission="dashboard.view"><WorkOrderFormPage flowType="post" /></ProtectedRoute>} />
        <Route path="post/ordenes/:id/editar" element={<ProtectedRoute permission="dashboard.view"><WorkOrderFormPage flowType="post" /></ProtectedRoute>} />
        <Route path="post/cotizaciones" element={<ProtectedRoute permission="dashboard.view"><ComingSoonPage title="Cotizaciones (Flujo Post)" description="La cotizacion posterior al reporte de desarme esta en construccion." /></ProtectedRoute>} />
        <Route path="post/reportes" element={<ProtectedRoute permission="work-reports.view"><ComingSoonPage title="Reportes de Trabajo (Flujo Post)" description="Esta seccion esta en construccion. Por ahora, usa el icono de camara desde Ordenes de Trabajo (Post)." /></ProtectedRoute>} />
        <Route path="post/facturacion" element={<ProtectedRoute permission="billing.view"><ComingSoonPage title="Facturación (Flujo Post)" description="La facturacion del flujo Post, generada despues de cotizar, esta en construccion." /></ProtectedRoute>} />

        {/* --- Rutas de Ordenes de Servicio (subcontratos externos, ej. torneado) ---
             Permisos granulares propios desde el inicio (service-orders.*) -- a
             diferencia de Ordenes de Trabajo, esto es justo lo que permite que el
             rol "Subcontrato" vea SOLO esto (y Reportes de Trabajo), nada mas. --- */}
        <Route path="ordenes-servicio" element={<ProtectedRoute permission="service-orders.view"><ServiceOrdersPage /></ProtectedRoute>} />
        <Route path="ordenes-servicio/nueva" element={<ProtectedRoute permission="service-orders.create"><ServiceOrderFormPage /></ProtectedRoute>} />
        <Route path="ordenes-servicio/:id/editar" element={<ProtectedRoute permission="service-orders.update"><ServiceOrderFormPage /></ProtectedRoute>} />

        {/* --- Rutas de Maquinas y Mantenimiento --- */}
        <Route path="maquinas" element={<ProtectedRoute permission="dashboard.view"><MachinesPage /></ProtectedRoute>} />
        <Route path="mantenimientos" element={<ProtectedRoute permission="dashboard.view"><MaintenancePage /></ProtectedRoute>} />

        {/* --- Rutas de Configuracion (catalogos y ajustes del sistema) --- */}
        <Route path="configuracion/tipos-cliente" element={<ProtectedRoute permission="client-types.view"><ClientTypesPage /></ProtectedRoute>} />
        <Route path="configuracion/fidelizacion" element={<ProtectedRoute permission="loyalty.view"><LoyaltyTiersPage /></ProtectedRoute>} />
        <Route path="configuracion/tipos" element={<ProtectedRoute permission="article-types.view"><ArticleTypesPage /></ProtectedRoute>} />
        <Route path="configuracion/bodegas" element={<ProtectedRoute permission="warehouses.view"><WarehousesPage /></ProtectedRoute>} />
        <Route path="configuracion/categorias-pieza" element={<ProtectedRoute permission="part-categories.view"><PartCategoriesPage /></ProtectedRoute>} />
        {/* Las siguientes tres son pantallas "Proximamente" (aun sin funcionalidad real) */}
        <Route path="configuracion/general" element={<ProtectedRoute permission="dashboard.view"><GeneralSettingsPage /></ProtectedRoute>} />
        <Route path="configuracion/parametros" element={<ProtectedRoute permission="dashboard.view"><SystemParamsPage /></ProtectedRoute>} />
        <Route path="configuracion/catalogos" element={<ProtectedRoute permission="dashboard.view"><CatalogsPage /></ProtectedRoute>} />

        {/* --- Rutas de Administracion (usuarios, roles y permisos) --- */}
        <Route path="usuarios" element={<ProtectedRoute permission="users.view"><UsersPage /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute permission="roles.view"><RolesPage /></ProtectedRoute>} />
        <Route path="permisos" element={<ProtectedRoute permission="permissions.view"><PermissionsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
