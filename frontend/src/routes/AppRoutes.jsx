import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
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

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Inventario */}
        <Route
          path="inventario"
          element={
            <ProtectedRoute permission="articles.view">
              <ArticlesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventario/nuevo"
          element={
            <ProtectedRoute permission="articles.create">
              <ArticleFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventario/:id/editar"
          element={
            <ProtectedRoute permission="articles.update">
              <ArticleFormPage />
            </ProtectedRoute>
          }
        />

        {/* Clientes */}
        <Route
          path="clientes"
          element={
            <ProtectedRoute permission="clients.view">
              <ClientsPage />
            </ProtectedRoute>
          }
        />

        {/* Configuracion */}
        <Route
          path="configuracion/tipos-cliente"
          element={
            <ProtectedRoute permission="client-types.view">
              <ClientTypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion/fidelizacion"
          element={
            <ProtectedRoute permission="loyalty.view">
              <LoyaltyTiersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion/tipos"
          element={
            <ProtectedRoute permission="article-types.view">
              <ArticleTypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion/bodegas"
          element={
            <ProtectedRoute permission="warehouses.view">
              <WarehousesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute permission="users.view">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute permission="roles.view">
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="permisos"
          element={
            <ProtectedRoute permission="permissions.view">
              <PermissionsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
