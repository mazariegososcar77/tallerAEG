// ============================================================================
// PANTALLA: Inicio de Sesión (Login)
// Es la primera pantalla que ve cualquier persona al entrar al sistema, antes
// de identificarse. Del lado izquierdo se muestra un carrusel de imágenes de
// marca (se oculta en pantallas pequeñas) y del lado derecho el formulario
// para escribir el correo y la contraseña. Si la persona ya inició sesión, la
// pantalla la manda directo al Panel Principal en vez de mostrar el formulario.
// ============================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ImageCarousel from '../components/auth/ImageCarousel.jsx';
import LoginForm from '../components/auth/LoginForm.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export default function LoginPage() {
  const { user, loading } = useAuth();

  // Mientras se revisa si ya hay una sesión guardada, se muestra un
  // indicador de "cargando" en vez del formulario.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Spinner size={32} className="text-orange-500" />
      </div>
    );
  }

  // Si ya hay un usuario con sesión iniciada, no tiene sentido ver el
  // login otra vez: se le redirige a "/", que decide a donde mandarlo segun
  // sus permisos (ver routes/HomeRedirect.jsx) — no siempre es el Dashboard,
  // por ejemplo el rol Subcontrato aterriza directo en Orden de Servicio.
  if (user) return <Navigate to="/" replace />;

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
