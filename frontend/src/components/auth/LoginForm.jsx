import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

// Este es el formulario de inicio de sesion (pantalla de Login): pide correo
// y contrasena, y si son correctos entra al sistema y lleva al Dashboard.
export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); // lo que el usuario escribe en el campo de correo
  const [password, setPassword] = useState(''); // lo que el usuario escribe en el campo de contrasena
  const [loading, setLoading] = useState(false); // true mientras se esta verificando el usuario (muestra el boton "cargando")

  // Se ejecuta cuando el usuario aprieta "Iniciar sesion" (o Enter).
  const handleSubmit = async (e) => {
    e.preventDefault(); // evita que la pagina se recargue, como hacen los formularios normales
    setLoading(true);
    try {
      // Intenta iniciar sesion con el correo y la contrasena escritos.
      const profile = await login(email, password);
      notify.success(`Bienvenido, ${profile.name}`);
      navigate('/dashboard'); // si todo sale bien, entra al panel principal
    } catch (err) {
      // Si el correo/contrasena estan mal, o hay un error, se muestra un aviso.
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src="/logo.png" alt="Taller AEG" className="mb-4 h-20 w-20" />
        <h1 className="text-2xl font-bold text-navy-800">Bienvenido</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Correo electronico"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="usuario@talleraeg.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contrasena"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Iniciar sesion
        </Button>
      </div>
    </form>
  );
}
