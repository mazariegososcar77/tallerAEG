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
  const res = await fetch(`${baseUrl()}/api/login/get_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: `GT.${nit12(env.digifact.nit)}.${env.digifact.username}`,
      Password: env.digifact.password,
    }),
  });
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

  const doFetch = async (token) => fetch(url, {
    method,
    headers: {
      Authorization: token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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

export const _internal = { isConfigured, nit12 };
