// Mensajes de zod en español. Zod trae los suyos en inglés ("Required", "Invalid email"...): sin
// esto, cualquier campo cuyo esquema no tenga un mensaje propio le mostraba al usuario "Datos
// invalidos" o un texto en inglés. Aqui cada mensaje por defecto sale con el NOMBRE DEL CAMPO
// ("Teléfono: es obligatorio"). Los esquemas que ya traen su propio mensaje lo conservan.
import { z } from 'zod';
import { labelForPath } from '../utils/fieldLabels.js';

const TIPOS = { string: 'texto', number: 'un número', boolean: 'sí o no', array: 'una lista', object: 'un objeto', date: 'una fecha' };

const errorMap = (issue, ctx) => {
  const campo = labelForPath(issue.path);
  const con = (texto) => ({ message: `${campo}: ${texto}` });

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return con('es obligatorio.');
      return con(`tiene un formato incorrecto (se esperaba ${TIPOS[issue.expected] || issue.expected}).`);
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return con(issue.minimum <= 1 ? 'no puede estar vacío.' : `debe tener al menos ${issue.minimum} caracteres.`);
      }
      if (issue.type === 'number') {
        return con(issue.minimum === 0 ? 'no puede ser negativo.' : `debe ser mayor o igual a ${issue.minimum}.`);
      }
      if (issue.type === 'array') return con(`debe tener al menos ${issue.minimum} elemento(s).`);
      return con('es demasiado pequeño.');
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return con(`admite como máximo ${issue.maximum} caracteres.`);
      if (issue.type === 'number') return con(`no puede ser mayor a ${issue.maximum}.`);
      if (issue.type === 'array') return con(`admite como máximo ${issue.maximum} elemento(s).`);
      return con('es demasiado grande.');
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return con('no es un correo electrónico válido (ejemplo: nombre@empresa.com).');
      if (issue.validation === 'url') return con('no es una dirección web válida.');
      if (issue.validation === 'regex') return con('tiene un formato inválido.');
      return con('tiene un formato inválido.');
    case z.ZodIssueCode.invalid_enum_value:
      return con('tiene un valor que no está permitido.');
    case z.ZodIssueCode.invalid_union:
      return con('no es válido.');
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(errorMap);
