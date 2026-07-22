/**
 * Adaptador de certificacion fiscal FEL (Factura Electronica en Linea, Guatemala).
 *
 * Taller AEG aun no tiene contratado un certificador autorizado por la SAT
 * (ej. Digifact, Infile, Megaprint). Mientras tanto esta funcion NO debe
 * inventar un UUID/serie/numero FEL — eso equivaldria a fabricar un
 * documento fiscal falso. Devuelve todo en null y deja la factura marcada
 * como certificada solo a nivel interno (invoiceService.certify).
 *
 * Cuando se contrate un certificador: reemplazar el cuerpo de esta funcion
 * por la llamada real a su API (enviar el XML/DTE del `invoice`, recibir
 * uuid/serie/numero de vuelta) sin tocar invoiceService ni las rutas.
 */
export async function certify(_invoice) {
  return {
    fel_certifier: null,
    fel_uuid: null,
    fel_series: null,
    fel_number: null,
  };
}
