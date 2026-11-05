import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title={`Aviso de privacidad de ${BRAND.name}`} updated="5 de noviembre de 2026">
      <p>
        Este aviso aplica a las personas que crean una cuenta o usan {BRAND.name} (administradores y asesores). Los prospectos que dejan sus datos a una inmobiliaria
        se rigen por el aviso de privacidad de esa inmobiliaria, no por este.
      </p>
      <h2>Datos que recabamos</h2>
      <ul>
        <li>Nombre, correo electrónico y contraseña (almacenada con cifrado por nuestro proveedor de autenticación).</li>
        <li>Datos de la organización y de su uso del Servicio (por ejemplo, fechas de acceso).</li>
      </ul>
      <h2>Finalidades</h2>
      <p>
        Crear y administrar tu cuenta, prestar el Servicio, brindarte soporte, facturar y mantener la seguridad. No vendemos tus datos.
      </p>
      <h2>Encargados y transferencias</h2>
      <p>
        Usamos proveedores de infraestructura y mensajería para operar el Servicio (alojamiento, base de datos y WhatsApp/Meta). Solo reciben los datos necesarios para
        prestar su función.
      </p>
      <h2>Derechos ARCO y revocación</h2>
      <p>
        Puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus datos, o revocar tu consentimiento, escribiendo a {BRAND.supportEmail}.
      </p>
      <h2>Cambios</h2>
      <p>Publicaremos cualquier modificación a este aviso en esta página.</p>
    </LegalPage>
  );
}
