/**
 * ESTE ARCHIVO ES UN "SIMULADOR" TEMPORAL DE LA CERTIFICACION FISCAL (FEL).
 *
 * En Guatemala, para que una factura sea valida ante la SAT, debe pasar por un
 * "certificador FEL" (una empresa autorizada, ej. Digifact, Infile, Megaprint)
 * que le asigna un numero unico oficial (UUID) y una serie/numero fiscal.
 *
 * Taller AEG TODAVIA NO HA CONTRATADO ningun certificador de estos. Por eso,
 * esta funcion no hace ninguna llamada real a la SAT ni a ningun proveedor:
 * simplemente devuelve todos los datos fiscales vacios (null) a proposito.
 * NO se inventan numeros falsos, porque eso seria como fabricar una factura
 * fiscal invalida/fraudulenta.
 *
 * Lo que SI pasa cuando se "certifica" una factura en el sistema hoy: el estado
 * interno de la factura cambia a "certificada" (sirve para uso administrativo del
 * taller, para saber que ya se reviso), pero esa factura NO es valida ante la SAT
 * todavia. En la pantalla/PDF de la factura se muestra un aviso cuando falta el
 * numero fiscal real.
 *
 * Cuando el taller contrate un certificador FEL de verdad: aqui es donde se debe
 * conectar (enviar los datos de la factura a su sistema y recibir el UUID/serie/
 * numero oficiales de vuelta). No hay que tocar ningun otro archivo para eso.
 */
export async function certify(_invoice) {
  return {
    fel_certifier: null,
    fel_uuid: null,
    fel_series: null,
    fel_number: null,
  };
}
