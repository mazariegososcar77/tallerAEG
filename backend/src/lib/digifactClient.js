/**
 * Cliente HTTP para el certificador FEL Digifact (Guatemala).
 * Referencia: https://documentacion.digifact.com/gt/api y el PDF que entrega
 * Digifact junto con las credenciales (Documentacion_Tecnica_API_NUC_Digifact_GT_V2_0_6.pdf).
 * Ante una discrepancia entre ambos, el PDF (especifico de la cuenta) manda.
 *
 * Cubre: obtener token, certificar un DTE (NUC JSON), anular un DTE y
 * consultar su estado. El token se cachea en memoria del proceso (Digifact
 * indica ~360 dias de vigencia) y se renueva ante un 401.
 */
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let cachedToken = null;

// Digifact a veces tarda (o no responde) en el sandbox; sin esto una llamada
// colgada deja al usuario viendo el boton "Certificar" girando para siempre
// (el fetch de Node y el axios del frontend no tienen timeout propio).
const REQUEST_TIMEOUT_MS = 20000;

function isConfigured() {
  return Boolean(env.digifact.nit && env.digifact.username && env.digifact.password);
}

function requireConfigured() {
  if (!isConfigured()) {
    throw new ApiError(503, 'Digifact no esta configurado (faltan DIGIFACT_NIT/USERNAME/PASSWORD en el .env)');
  }
}

function baseUrl() {
  return env.digifact.environment === 'prod' ? env.digifact.prodBaseUrl : env.digifact.testBaseUrl;
}

/** NIT sin guion, relleno a 12 digitos con ceros a la izquierda (formato que exige Digifact). */
function nit12(nit) {
  return String(nit || '').replace(/[^0-9]/g, '').padStart(12, '0');
}

async function fetchToken() {
  requireConfigured();
  let res;
  try {
    res = await fetch(`${baseUrl()}/api/login/get_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Username: `GT.${nit12(env.digifact.nit)}.${env.digifact.username}`,
        Password: env.digifact.password,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new ApiError(504, 'Digifact no respondio a tiempo al autenticar. Intenta de nuevo.');
    throw err;
  }
  // Respuesta real (Documentacion_Tecnica_API_NUC_Digifact_GT_V2_0_6.pdf, pag. 6, sec. 2.1.2):
  // { "Token": "...", "expira_en": "2023-09-29T21:53:52...Z", "otorgado_a": "000044653948" }
  // "Token" va con T mayuscula. expira_en/otorgado_a no se usan hoy; quedan disponibles
  // para, por ejemplo, refrescar el token de forma proactiva antes de que expire.
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.Token) {
    throw new ApiError(502, 'No se pudo autenticar contra Digifact', data);
  }
  cachedToken = data.Token;
  return cachedToken;
}

export async function getToken() {
  return cachedToken || fetchToken();
}

/** Ejecuta una llamada autenticada; reintenta una vez si el token expiro (401). */
async function authedFetch(path, { method = 'GET', query, body } = {}) {
  requireConfigured();
  const url = new URL(`${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }

  const doFetch = async (token) => {
    try {
      return await fetch(url, {
        method,
        headers: {
          Authorization: token,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (err.name === 'TimeoutError') throw new ApiError(504, 'Digifact no respondio a tiempo. Intenta de nuevo.');
      throw err;
    }
  };

  let token = await getToken();
  let res = await doFetch(token);
  if (res.status === 401) {
    token = await fetchToken();
    res = await doFetch(token);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(502, 'Error en la respuesta de Digifact', data);
  }
  return data;
}

/**
 * Certifica un documento NUC (factura) contra Digifact.
 * `nucPayload` debe tener la forma documentada en /gt/nuc/json (Header/Seller/Buyer/Items/Totals).
 */
export async function certifyDte(nucPayload) {
  return authedFetch('/api/v2/transform/nuc_json', {
    method: 'POST',
    query: { TAXID: nit12(env.digifact.nit), FORMAT: 'XML|PDF', USERNAME: env.digifact.username },
    body: nucPayload,
  });
}

/** Anula un DTE ya certificado (por su UUID/authNumber). */
export async function cancelDte({ authNumber, idReceptor, fechaEmisionOriginal, motivo }) {
  return authedFetch('/api/CancelFelGT', {
    method: 'POST',
    body: {
      Taxid: nit12(env.digifact.nit),
      Autorizacion: authNumber,
      IdReceptor: idReceptor || 'CF',
      FechaEmisionDocumentoAnular: fechaEmisionOriginal,
      MotivoAnulacion: motivo,
      Username: env.digifact.username,
    },
  });
}

/** Consulta el estado/datos de un DTE certificado por su UUID. */
export async function getDteInfo(uuid) {
  return authedFetch('/api/Shared', {
    query: {
      COUNTRY: 'GT',
      TAXID: nit12(env.digifact.nit),
      DATA1: 'SHARED_GETDTEINFO',
      DATA2: `AUTHNUMBER|${uuid}`,
      USERNAME: env.digifact.username,
    },
  });
}

/** Ambiente en el que esta corriendo el cliente ('test' = sandbox, 'prod' = real). */
export function environment() {
  return env.digifact.environment === 'prod' ? 'prod' : 'test';
}

/** NIT/CUI sin guiones ni espacios y en mayusculas (el receptor "CF" queda igual). */
export function normalizeTaxId(value) {
  return String(value || '').replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Consulta un NIT en la SAT (via Digifact) y devuelve el nombre registrado, o `null` si no
 * existe. Sirve para avisar ANTES de certificar que el NIT del cliente esta mal escrito.
 */
export async function lookupNit(nit) {
  const clean = normalizeTaxId(nit);
  if (!clean || clean === 'CF') return null;
  const data = await authedFetch('/api/Shared', {
    query: {
      COUNTRY: 'GT',
      TAXID: nit12(env.digifact.nit),
      DATA1: 'SHARED_GETINFONITcom',
      DATA2: `NIT|${clean}`,
      USERNAME: env.digifact.username,
    },
  });
  // La respuesta llega como { NIT, NOMBRE } o envuelta en un arreglo RESPONSE segun la version.
  const row = Array.isArray(data?.RESPONSE) ? data.RESPONSE[0] : data;
  const nombre = row?.NOMBRE || row?.Nombre || null;
  return nombre ? { nit: row.NIT || clean, name: String(nombre).trim() } : null;
}

/** Baja de Digifact los archivos de un DTE ya certificado (para las facturas que no los guardaron). */
export async function getDocument(uuid) {
  return authedFetch('/api/GetDocument', {
    query: { AUTHNUMBER: uuid, TAXID: nit12(env.digifact.nit), FORMAT: 'XML|PDF', USERNAME: env.digifact.username },
  });
}

/**
 * Saca de una respuesta de Digifact los archivos que trae en base64 (`responseData1..3`, con
 * mayusculas distintas segun el endpoint) y los clasifica por su CONTENIDO, no por la posicion:
 * el orden de los campos depende de los formatos pedidos y de la version del API.
 * Devuelve `{ xml: string|null, pdf: Buffer|null }`.
 */
export function extractDocuments(response) {
  const out = { xml: null, pdf: null };
  const rows = Array.isArray(response?.RESPONSE) ? response.RESPONSE : [response];
  for (const row of rows) {
    for (const [key, value] of Object.entries(row || {})) {
      if (!/^responsedata\d$/i.test(key) || typeof value !== 'string' || !value) continue;
      let buf;
      try { buf = Buffer.from(value, 'base64'); } catch { continue; }
      if (buf.slice(0, 4).toString('latin1') === '%PDF') out.pdf = buf;
      else {
        const text = buf.toString('utf8').trimStart();
        if (text.startsWith('<?xml') || /^<[A-Za-z]/.test(text)) {
          if (!/^<!doctype html|^<html/i.test(text)) out.xml = text;
        }
      }
    }
  }
  return out;
}

export const _internal = { isConfigured, nit12 };
