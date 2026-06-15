import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profile = await login(email, password);
      notify.success(`Bienvenido, ${profile.name}`);
      navigate('/dashboard');
    } catch (err) {
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
