// Este archivo recibe las peticiones web relacionadas a USUARIOS del sistema (las personas
// que pueden entrar a trabajar aquí): verlos, crearlos, editarlos, borrarlos.
import * as userService from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Usuarios, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await userService.list());
});

// Trae los datos de un usuario en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await userService.getById(req.params.id));
});

// Cuando el usuario crea un usuario nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res.status(201).json(user);
});

// Cuando el usuario edita un usuario existente y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  res.json(user);
});

// Cuando el usuario borra un usuario, esto lo elimina (no permite que alguien se borre a sí mismo).
export const remove = asyncHandler(async (req, res) => {
  await userService.remove(req.params.id, req.user.id);
  res.status(204).end();
});
