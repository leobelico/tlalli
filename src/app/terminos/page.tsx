import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Términos del servicio" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos del servicio" updated="5 de noviembre de 2026">
      <p>
        Estos términos regulan el uso de {BRAND.name} (el &quot;Servicio&quot;), un CRM para dar seguimiento a prospectos de inmobiliarias y desarrolladoras.
        Al crear una cuenta aceptas estos términos en nombre de tu organización.
      </p>
      <h2>1. Cuenta y usuarios</h2>
      <p>
        Eres responsable de la actividad de los usuarios de tu organización y de mantener la confidencialidad de sus contraseñas. El número de usuarios
        activos está limitado por el plan contratado.
      </p>
      <h2>2. Tus datos y los de tus prospectos</h2>
      <p>
        Tu organización es la responsable del tratamiento de los datos personales de sus prospectos (LFPDPPP) y se obliga a contar con su aviso de privacidad
        y con el consentimiento correspondiente antes de contactarlos. {BRAND.name} actúa como encargado del tratamiento y solo trata esos datos conforme a tus instrucciones
        para prestar el Servicio.
      </p>
      <h2>3. Uso permitido</h2>
      <ul>
        <li>No enviar mensajes no solicitados ni contactar a personas que revocaron su consentimiento.</li>
        <li>Cumplir las políticas de WhatsApp Business de Meta, incluidas las reglas de plantillas y ventana de 24 horas.</li>
        <li>No intentar acceder a datos de otras organizaciones ni vulnerar la seguridad del Servicio.</li>
      </ul>
      <h2>4. Planes, pagos y cancelación</h2>
      <p>
        Los precios vigentes están en la página de precios, en pesos mexicanos más IVA, y se cobran por mes. La prueba gratuita dura 14 días. Puedes cancelar en cualquier
        momento; al cancelar conservarás acceso hasta el fin del periodo pagado y podrás exportar tus datos.
      </p>
      <h2>5. Disponibilidad y responsabilidad</h2>
      <p>
        Procuramos mantener el Servicio disponible, pero no garantizamos que sea ininterrumpido. Las cotizaciones y cálculos generados son informativos; tu organización
        es responsable de verificar los precios y condiciones antes de entregarlos a un cliente. El Servicio depende de proveedores externos (por ejemplo, Meta/WhatsApp).
      </p>
      <h2>6. Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos y te avisaremos con anticipación razonable. Dudas: {BRAND.supportEmail}. Jurisdicción: tribunales competentes de San Luis Potosí, S.L.P.
      </p>
    </LegalPage>
  );
}
