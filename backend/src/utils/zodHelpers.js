// Ayudas compartidas para los esquemas de validacion (zod) de las rutas.
import { z } from 'zod';

/**
 * Casilla "activo": acepta true/false y tambien 1/0.
 *
 * MySQL devuelve las columnas TINYINT(1) como 1/0 (no true/false), y los formularios de edicion
 * reenvian tal cual el valor con el que cargaron el registro. Con `z.boolean()` a secas, guardar
 * cualquier registro sin tocar la casilla daba "Datos invalidos" (le pasaba a clientes, bodegas,
 * tipos, usuarios, roles... -- editar un articulo fue el primero en notarse).
 */
export const booleanFlag = z.preprocess((v) => (v === 1 || v === 0 ? Boolean(v) : v), z.boolean());
