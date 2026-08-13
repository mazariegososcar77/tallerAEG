// Este archivo maneja el MOVIMIENTO DE EXISTENCIAS del inventario: cada vez que sale
// material de bodega (porque se uso en un trabajo) o entra (por un ajuste, una
// devolucion o una compra), pasa por aqui.
//
// REGLA DE ORO: este es el UNICO modulo autorizado a modificar articles.quantity.
// Nadie mas debe hacer un "UPDATE articles SET quantity". El saldo de un articulo
// siempre es consecuencia de un movimiento registrado en el kardex (stock_movements),
// nunca un numero que alguien escribio encima. Asi, para cualquier existencia siempre
// se puede responder "¿por que hay 7 y no 10?" leyendo su historial.
import pool, { withTransaction } from '../lib/db.js';
import * as stockMovementRepository from '../repositories/stockMovementRepository.js';
import * as articleRepository from '../repositories/articleRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Las cantidades y costos se guardan con 2 decimales (DECIMAL(12,2)). Se redondea en
// cada paso porque la aritmetica con decimales en JavaScript arrastra errores minimos
// (0.1 + 0.2 da 0.30000000000000004) que, acumulados movimiento tras movimiento,
// terminarian descuadrando el saldo contra el kardex.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Diferencias mas chicas que medio centavo se consideran cero: evita generar
// movimientos de 0.00 por ruido de redondeo.
const EPSILON = 0.005;

/**
 * Corre `fn` dentro de una transaccion. Si el llamador ya venia dentro de una
 * (nos paso su `conn`), se reutiliza esa en vez de abrir otra -- importante porque
 * finalizar un reporte descuenta material Y cambia el estado del reporte: si el
 * descuento fallara, tambien tiene que deshacerse el cambio de estado.
 */
function run(conn, fn) {
  return conn ? fn(conn) : withTransaction(fn);
}

/**
 * Aplica UN movimiento de existencias: escribe la linea en el kardex y deja el saldo
 * del articulo al dia, las dos cosas juntas y dentro de la misma transaccion.
 *
 * Antes de calcular nada bloquea la fila del articulo (lockById -> FOR UPDATE) para
 * que dos operaciones simultaneas sobre el mismo articulo se pongan en fila en vez de
 * pisarse el saldo (ver el comentario de lockById en articleRepository).
 */
async function applyMovement(conn, {
  articleId, type, quantity, unitCost = null,
  referenceType, referenceId = null, userId = null, notes = null,
}) {
  const qty = round2(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, 'La cantidad de un movimiento de inventario debe ser mayor a cero');
  }

  const article = await articleRepository.lockById(articleId, conn);
  if (!article) throw new ApiError(404, `El articulo ${articleId} no existe`);

  const balanceBefore = round2(article.quantity);
  const balanceAfter = round2(type === 'salida' ? balanceBefore - qty : balanceBefore + qty);

  // Si no viene un costo explicito, se usa el costo de compra del articulo. Puede
  // estar en NULL (todavia no se ha capturado): en ese caso queda 0.00, que es un
  // "costo desconocido" honesto -- no se rellena con el precio de venta.
  const cost = round2(unitCost ?? article.cost ?? 0);

  const movement = await stockMovementRepository.create({
    article_id: articleId,
    type,
    quantity: qty,
    unit_cost: cost,
    balance_after: balanceAfter,
    reference_type: referenceType,
    reference_id: referenceId,
    user_id: userId,
    notes,
  }, conn);

  await articleRepository.setQuantity(articleId, balanceAfter, conn);

  return {
    movement,
    article,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    // El saldo negativo NO bloquea la operacion (el material ya salio fisicamente de
    // bodega; bloquear aqui castigaria al tecnico por un descuadre administrativo y,
    // en el caso de un reporte, ademas frenaria la factura). Se reporta como aviso:
    // un negativo es justamente la senal de que falta registrar una compra.
    warning: balanceAfter < 0
      ? `"${article.name}" queda en ${balanceAfter} ${article.unit}. Falta registrar una entrada de este articulo.`
      : null,
  };
}

/**
 * Deja el consumo de material de una referencia (normalmente un reporte de trabajo)
 * EXACTAMENTE igual a `items`, generando solo la diferencia contra lo que ya se
 * habia movido antes por esa misma referencia.
 *
 * Es reconciliacion, no "descontar": compara lo que deberia estar consumido contra lo
 * que el kardex dice que ya se consumio, y emite unicamente el delta. Un solo
 * mecanismo cubre los cuatro casos:
 *   - Finalizar un reporte: no hay nada movido, se emiten las salidas.
 *   - Volver a finalizarlo (reintento, doble clic): el neto ya coincide, no emite nada.
 *     La idempotencia sale de la comparacion misma, no de un "if (ya lo hice)".
 *   - Reabrir o cancelar: se pasa items vacio, emite las entradas que devuelven todo.
 *   - Editar un reporte ya finalizado: emite solo la diferencia (agrego 2 -> salida de 2).
 *
 * Devuelve los movimientos generados y los avisos de saldo negativo.
 */
export async function syncConsumption({
  referenceType = 'work_report', referenceId, items = [], userId = null, conn = null,
}) {
  if (!referenceId) throw new ApiError(400, 'Falta la referencia del consumo de inventario');

  // Lo que DEBERIA estar consumido, segun las lineas de material del reporte.
  const desired = new Map();
  for (const item of items) {
    const articleId = Number(item.article_id);
    const qty = round2(item.quantity);
    if (!articleId || !Number.isFinite(qty) || qty <= 0) continue;
    const prev = desired.get(articleId);
    // Sumar en vez de pisar: por si llegan dos lineas del mismo articulo.
    desired.set(articleId, {
      quantity: round2((prev?.quantity || 0) + qty),
      unit_cost: item.unit_cost ?? prev?.unit_cost ?? null,
    });
  }

  return run(conn, async (tx) => {
    // Lo que YA esta consumido segun el kardex.
    const current = await stockMovementRepository.getNetByReference(referenceType, referenceId, tx);

    // Con que costo salio cada articulo, para devolverlo al mismo valor si toca reponerlo.
    // Solo hace falta si esta referencia ya movio algo (en un consumo nuevo no hay nada
    // que devolver, asi que se ahorra la consulta).
    const outCosts = current.size > 0
      ? await stockMovementRepository.getLastOutCostByReference(referenceType, referenceId, tx)
      : new Map();

    // Se recorren los articulos SIEMPRE en el mismo orden (id ascendente). Si dos
    // reportes que comparten articulos se finalizan a la vez y cada uno los bloqueara
    // en orden distinto, podrian quedarse esperandose mutuamente (deadlock); con un
    // orden unico eso no puede pasar.
    const articleIds = [...new Set([...desired.keys(), ...current.keys()])].sort((a, b) => a - b);

    const movements = [];
    const warnings = [];
    for (const articleId of articleIds) {
      const target = desired.get(articleId)?.quantity || 0;
      const already = current.get(articleId) || 0;
      const delta = round2(target - already);
      if (Math.abs(delta) < EPSILON) continue;

      const result = await applyMovement(tx, {
        articleId,
        type: delta > 0 ? 'salida' : 'entrada',
        quantity: Math.abs(delta),
        // Una devolucion se valua con el costo de la salida que revierte; una salida nueva,
        // con el costo congelado en la linea del reporte. Si no hay ninguno de los dos,
        // applyMovement cae al costo de compra vigente del articulo.
        unitCost: desired.get(articleId)?.unit_cost ?? outCosts.get(articleId) ?? null,
        referenceType,
        referenceId,
        userId,
        notes: delta > 0 ? 'Material usado en el trabajo' : 'Devolucion de material a bodega',
      });
      movements.push(result.movement);
      if (result.warning) warnings.push(result.warning);
    }
    return { movements, warnings };
  });
}

/**
 * Registra un ajuste manual de existencias (conteo fisico, merma, correccion). Es la
 * via valida para cambiar un saldo "a mano": en vez de sobrescribir quantity, deja un
 * movimiento que explica el cambio. Exige un motivo por la misma razon.
 */
export async function adjust({ articleId, type, quantity, reason, userId = null, conn = null }) {
  if (!['entrada', 'salida'].includes(type)) {
    throw new ApiError(400, 'El tipo de ajuste debe ser "entrada" o "salida"');
  }
  if (!reason?.trim()) {
    throw new ApiError(400, 'Un ajuste de inventario necesita un motivo');
  }
  return run(conn, async (tx) => {
    const result = await applyMovement(tx, {
      articleId, type, quantity,
      referenceType: 'ajuste',
      userId,
      notes: reason.trim(),
    });
    return { movement: result.movement, warnings: result.warning ? [result.warning] : [] };
  });
}

/**
 * Registra el saldo de apertura de un articulo: la existencia con la que nace en el
 * sistema, sin una compra ni un trabajo detras que la explique.
 *
 * Es la contraparte en runtime de lo que hace 035_stock_movements_seed.sql con los
 * articulos que ya existian cuando se activo el kardex, y usa el mismo
 * reference_type ('saldo_inicial'). Va aparte de adjust() en vez de reusarlo porque un
 * ajuste es una correccion de un saldo que ya existia -- por eso exige un motivo -- y una
 * apertura no corrige nada: es el punto de partida. Mezclarlos dejaria las aperturas
 * contadas como ajustes y ensuciaria cualquier lectura del kardex que separe una cosa de
 * la otra.
 *
 * Normalmente se llama con la conexion de una transaccion, para que el articulo y su
 * saldo inicial nazcan juntos o no nazca ninguno.
 */
export async function openingBalance({ articleId, quantity, unitCost = null, userId = null, conn = null }) {
  return run(conn, async (tx) => {
    const result = await applyMovement(tx, {
      articleId,
      type: 'entrada',
      quantity,
      unitCost,
      referenceType: 'saldo_inicial',
      userId,
      notes: 'Existencia inicial al dar de alta el articulo',
    });
    return { movement: result.movement, warnings: result.warning ? [result.warning] : [] };
  });
}

/**
 * Calcula que se descontaria si se sincronizara este consumo, SIN escribir nada.
 * Lo usa la pantalla de reportes para mostrar, antes de finalizar, el detalle de
 * "esto es lo que va a salir de bodega" y advertir si algo va a quedar en negativo.
 */
export async function previewConsumption({ referenceType = 'work_report', referenceId, items = [] }) {
  const current = await stockMovementRepository.getNetByReference(referenceType, referenceId);
  const lines = [];
  for (const item of items) {
    const articleId = Number(item.article_id);
    if (!articleId) continue;
    const article = await articleRepository.findById(articleId);
    if (!article) continue;
    const delta = round2(round2(item.quantity) - (current.get(articleId) || 0));
    if (Math.abs(delta) < EPSILON) continue;
    const balanceBefore = round2(article.quantity);
    const balanceAfter = round2(delta > 0 ? balanceBefore - delta : balanceBefore + Math.abs(delta));
    lines.push({
      article_id: articleId,
      article_code: article.code,
      article_name: article.name,
      unit: article.unit,
      type: delta > 0 ? 'salida' : 'entrada',
      quantity: Math.abs(delta),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      goes_negative: balanceAfter < 0,
    });
  }
  return lines;
}

// Devuelve el kardex (historial de movimientos), opcionalmente de un solo articulo.
export async function listMovements({ articleId = null, limit = 200 } = {}) {
  return stockMovementRepository.getAll({ articleId, limit });
}
