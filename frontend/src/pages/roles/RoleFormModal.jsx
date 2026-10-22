// PANTALLA: Ventana emergente para crear o editar un Rol. Un rol es un "paquete
// de permisos" (por ejemplo "Técnico" o "Administrador") que luego se le asigna
// a los usuarios. Aquí se le pone nombre y descripción al rol, y se marcan los
// permisos que va a tener, en dos modos (botones arriba de la lista):
//
//   - Modo simple (por defecto): una casilla por PANTALLA real (ver roleScreens.js),
//     con el paquete de permisos "normal" de esa pantalla (ver/crear/editar/eliminar).
//     Pensado para armar un rol sin tener que conocer los ~78 permisos granulares uno
//     por uno -- justo lo que se complicaba al mostrar el sistema en una presentación.
//   - Modo avanzado: la vista granular de siempre, agrupada por la columna "module" de
//     la base, con casillas individuales y "seleccionar todos" por módulo. Es la única
//     forma de tocar los permisos sensibles/reservados a Administrador (certificar o
//     anular una factura, reabrir un reporte finalizado, reiniciar una cotización,
//     borrar un documento adjunto) -- el Modo simple nunca los incluye en sus paquetes.
import { useState, useEffect, useMemo } from 'react';
import { rolesApi } from '../../api/rolesApi.js';
import { notify } from '../../lib/toast.js';
import { SCREEN_GROUPS, fitsSimpleMode } from '../../lib/roleScreens.js';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Button from '../../components/ui/Button.jsx';

/** Modal de creacion/edicion de rol, incluyendo asignacion de permisos. */
export default function RoleFormModal({ open, onClose, onSaved, role, permissions }) {
  const isEdit = Boolean(role);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState('simple'); // 'simple' | 'advanced'
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Agrupa el catalogo de permisos por modulo (Modo avanzado).
  const groups = useMemo(() => {
    const map = {};
    for (const p of permissions) {
      (map[p.module] ||= []).push(p);
    }
    return map;
  }, [permissions]);

  // code -> id del catalogo de permisos (lo que llega del backend), para poder armar los
  // paquetes de roleScreens.js (definidos por "code", mas legible y estable) en ids reales.
  const idByCode = useMemo(() => Object.fromEntries(permissions.map((p) => [p.code, p.id])), [permissions]);
  const codeById = useMemo(() => Object.fromEntries(permissions.map((p) => [p.id, p.code])), [permissions]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(role?.name || '');
    setDescription(role?.description || '');
    const current = new Set(role?.permissions || []);
    setSelected(current);
    // Si el rol ya tiene algo que el Modo simple no sabe representar (un permiso sensible, o
    // solo una parte del paquete de una pantalla), se abre en Modo avanzado para no esconderlo
    // ni arriesgar que un clic en Modo simple lo borre sin querer. Un rol nuevo arranca en Simple.
    setMode(isEdit && !fitsSimpleMode(current, codeById) ? 'advanced' : 'simple');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role]);

  // Marca o desmarca TODOS los permisos de una pantalla de un solo clic (Modo simple).
  const toggleScreen = (codes) => {
    const ids = codes.map((c) => idByCode[c]).filter((id) => id != null);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  // Marca o desmarca un permiso individual.
  const togglePermission = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Marca o desmarca TODOS los permisos de un modulo de un solo clic
  // (si ya estaban todos marcados, los desmarca; si no, los marca todos).
  const toggleModule = (modulePerms) => {
    const ids = modulePerms.map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  // Guarda el rol: si ya existia, actualiza su nombre/descripcion y reemplaza
  // su lista de permisos; si es nuevo, lo crea ya con los permisos elegidos.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const permissionIds = [...selected];

    try {
      if (isEdit) {
        await rolesApi.update(role.id, { name, description });
        await rolesApi.setPermissions(role.id, permissionIds);
        notify.success('Rol actualizado');
      } else {
        await rolesApi.create({ name, description, permissions: permissionIds });
        notify.success('Rol creado');
      }
      onSaved();
    } catch (err) {
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={isEdit ? 'Editar rol' : 'Nuevo rol'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <Input
          label="Descripcion"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-navy-800">Permisos</p>
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('simple')}
                className={'px-3 py-1 ' + (mode === 'simple' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
              >
                Modo simple
              </button>
              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={'px-3 py-1 ' + (mode === 'advanced' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
              >
                Modo avanzado
              </button>
            </div>
          </div>

          {mode === 'simple' ? (
            <p className="mb-2 text-xs text-slate-500">
              Una casilla por pantalla, con su paquete normal de permisos. Para certificar/anular facturas,
              reabrir un reporte finalizado o reiniciar una cotización a Borrador, usa el Modo avanzado.
            </p>
          ) : (
            <p className="mb-2 text-xs text-slate-500">Permisos individuales, agrupados por módulo.</p>
          )}

          {mode === 'simple' ? (
            <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {SCREEN_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600">{group.label}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.screens.map((screen) => {
                      const ids = screen.codes.map((c) => idByCode[c]).filter((id) => id != null);
                      const checked = ids.length > 0 && ids.every((id) => selected.has(id));
                      return (
                        <div key={screen.key}>
                          <Checkbox label={screen.label} checked={checked} onChange={() => toggleScreen(screen.codes)} />
                          {screen.description && <p className="ml-7 mt-0.5 text-xs text-slate-400">{screen.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {Object.entries(groups).map(([module, perms]) => {
              const allSelected = perms.every((p) => selected.has(p.id));
              return (
                <div key={module}>
                  <button
                    type="button"
                    onClick={() => toggleModule(perms)}
                    className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600 hover:underline"
                  >
                    {module} {allSelected ? '(quitar todos)' : '(seleccionar todos)'}
                  </button>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {perms.map((p) => (
                      <Checkbox
                        key={p.id}
                        label={p.description}
                        checked={selected.has(p.id)}
                        onChange={() => togglePermission(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
