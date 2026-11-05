/** Default privacy notice (aviso de privacidad simplificado) template. Admins can edit it. */
export function defaultPrivacyNotice(orgName: string): string {
  return `AVISO DE PRIVACIDAD SIMPLIFICADO

${orgName}, con domicilio en San Luis Potosí, S.L.P., es responsable del tratamiento de los datos personales que nos proporcione (nombre, teléfono y correo electrónico).

Finalidades primarias: contactarle para darle información sobre los desarrollos, unidades, precios y formas de pago por los que mostró interés; agendar citas y visitas; y elaborar cotizaciones.

Finalidades secundarias: enviarle información promocional de otros desarrollos. Si no desea que sus datos se usen para esta finalidad, indíquelo al correo de contacto.

Sus datos no se transfieren a terceros sin su consentimiento, salvo las excepciones previstas en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).

Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO), así como revocar su consentimiento, enviando una solicitud al correo de contacto de ${orgName}.

[Edite este texto con el domicilio completo, correo de contacto para derechos ARCO y la liga al aviso de privacidad integral.]`;
}
