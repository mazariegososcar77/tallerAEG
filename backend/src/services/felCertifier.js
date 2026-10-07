/**
 * Certificador FEL: Digifact (Guatemala).
 *
 * Mientras no haya credenciales de Digifact en el entorno (DIGIFACT_NIT /
 * DIGIFACT_USERNAME / DIGIFACT_PASSWORD en .env), esta funcion se comporta
 * igual que el simulador original: no llama a nadie, no inventa datos,
 * devuelve todo `null`. La factura sigue pudiendo avanzar a "certificada"
 * para uso administrativo del taller (ver invoiceService.certify), pero
 * NO es valida ante la SAT todavia. No se debe "arreglar" esto rellenando
 * datos falsos.
 *
 * En cuanto esas credenciales existan, certifica de verdad contra Digifact
 * (src/lib/digifactClient.js arma la llamada HTTP, src/lib/nucBuilder.js
 * arma el documento NUC a partir de la factura + su cliente) y devuelve el
 * UUID/serie/numero oficiales que asigna la SAT.
 */
import * as clientRepository from '../repositories/clientRepository.js';
import * as digifactClient from '../lib/digifactClient.js';
import { buildFacturaPayload } from '../lib/nucBuilder.js';
import { ApiError } from '../utils/ApiError.js';

const STUB_RESULT = { fel_certifier: null, fel_uuid: null, fel_series: null, fel_number: null, fel_issued_at: null, fel_environment: null, documents: null };

export async function certify(invoice) {
  if (!digifactClient._internal.isConfigured()) {
    return STUB_RESULT;
  }

  const client = await clientRepository.findById(invoice.client_id);
  if (!client) throw new ApiError(409, 'El cliente de la factura ya no existe');

  const payload = buildFacturaPayload(invoice, client);
  const response = await digifactClient.certifyDte(payload);

  // Digifact devuelve `code` como numero (0/1) o texto segun el endpoint -- comparar como string.
  if (String(response.code) !== '1') {
    throw new ApiError(502, response.message || 'Digifact rechazo el documento', response);
  }

  // Los archivos oficiales (XML firmado por Digifact y PDF con el QR de la SAT) llegan en base64
  // en esta misma respuesta: se devuelven para que invoiceService los guarde.
  return {
    fel_certifier: 'Digifact',
    fel_uuid: response.authNumber,
    fel_series: response.batch,
    fel_number: response.serial,
    // Fecha de emision EXACTA que se mando en el documento: la anulacion tiene que citarla igual.
    fel_issued_at: payload.Header.IssuedDateTime,
    fel_environment: digifactClient.environment(),
    documents: digifactClient.extractDocuments(response),
  };
}
