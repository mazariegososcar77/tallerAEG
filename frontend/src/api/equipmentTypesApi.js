// Este archivo maneja el catalogo de "tipos de equipo" (con categoria): las casillas "Tipo de
// equipo" de las Ordenes de Trabajo y de Servicio, configurables en Configuracion.
import { client } from './client.js';

// Funciones basicas para listar, crear, editar y eliminar tipos de equipo.
export const equipmentTypesApi = {
  list: () => client.get('/equipment-types').then((r) => r.data),
  create: (payload) => client.post('/equipment-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/equipment-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/equipment-types/${id}`).then((r) => r.data),
};
