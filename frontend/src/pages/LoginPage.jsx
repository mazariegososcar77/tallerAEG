import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ImageCarousel from '../components/auth/ImageCarousel.jsx';
import LoginForm from '../components/auth/LoginForm.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Spinner size={32} className="text-orange-500" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex h-screen">
      {/* Carrusel (oculto en pantallas pequenas) */}
      <div className="hidden lg:block lg:w-1/2">
        <ImageCarousel />
      </div>

      {/* Formulario */}
      <div className="flex w-full items-center justify-center bg-white p-6 lg:w-1/2">
        <LoginForm />
      </div>
    </div>
  );
}
