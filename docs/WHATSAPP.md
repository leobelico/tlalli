# Conectar WhatsApp Cloud API (Meta)

El CRM habla con WhatsApp a través de un **adaptador** (`src/server/whatsapp/`):

| Proveedor | `WHATSAPP_PROVIDER` | Uso |
|---|---|---|
| Simulado | `mock` (por defecto) | Desarrollo. No hace llamadas a Meta; los envíos quedan "Enviados" al instante y en la ficha del lead hay un botón para **simular mensajes entrantes**. |
| Cloud API | `cloud` | Producción. Envía por `graph.facebook.com` y recibe por webhook. |

Los dos proveedores usan **el mismo formato de webhook de Meta** y el mismo procesamiento de mensajes entrantes, así que lo que funciona en desarrollo funciona igual en producción.

## Qué hace el sistema

- **Enviar plantillas** aprobadas (`src/server/whatsapp/templates.ts`). Requieren consentimiento registrado del aviso de privacidad.
- **Responder con texto libre** solo dentro de la ventana de 24 h que abre el último mensaje del cliente (regla de WhatsApp).
- **Recibir mensajes** por webhook: se guardan en la ficha del lead; si el número no existe se crea un lead nuevo (canal WhatsApp, asignado al asesor con menos carga). Es idempotente (Meta puede reenviar el mismo evento).
- **Estados de entrega** (enviado, entregado, leído, fallido), sin retroceder de estado si llegan desordenados.
- Cada organización se identifica por su **Phone number ID**; el webhook enruta los eventos a la organización correcta.

## Pasos para conectar un número real

1. **Cuenta de Meta Business** verificada (Business Manager) del cliente o de la plataforma.
2. En <https://developers.facebook.com> crea una **App** tipo *Business* y agrega el producto **WhatsApp**.
3. En *WhatsApp → Configuración de la API*:
   - Agrega y verifica el número de teléfono (no puede estar en uso en la app de WhatsApp normal/Business; hay que darlo de baja ahí primero).
   - Copia el **Phone number ID** → pégalo en el CRM en *Configuración → WhatsApp: Phone number ID* de esa organización.
4. Crea un **System User** en Business Manager con permisos `whatsapp_business_messaging` y `whatsapp_business_management`, y genera un **token permanente** → `WHATSAPP_ACCESS_TOKEN`.
5. En *App → Configuración → Básica* copia la **Clave secreta de la app** → `WHATSAPP_APP_SECRET` (se usa para validar la firma `X-Hub-Signature-256` de cada webhook).
6. Inventa un texto aleatorio largo → `WHATSAPP_VERIFY_TOKEN`.
7. Configura las variables en el servidor y cambia `WHATSAPP_PROVIDER=cloud`. Reinicia.
8. En *WhatsApp → Configuración → Webhook*:
   - URL de devolución de llamada: `https://TU-DOMINIO/api/webhooks/whatsapp`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Suscríbete al campo **messages**.
9. En *WhatsApp Manager → Plantillas de mensajes* crea y espera la aprobación de cada plantilla con **el mismo nombre, idioma (`es_MX`) y número de variables** que en `templates.ts`:
   - `bienvenida_prospecto` (3 variables)
   - `seguimiento_prospecto` (3 variables)
   - `recordatorio_visita` (3 variables)
   - `cotizacion_enviada` (2 variables)
10. Prueba: escribe al número desde un celular → debe aparecer el lead en el CRM con el mensaje.

## Variables de entorno

```env
WHATSAPP_PROVIDER=cloud
WHATSAPP_ACCESS_TOKEN=EAAG...            # token permanente del System User (secreto)
WHATSAPP_APP_SECRET=abc123...            # clave secreta de la app (secreto)
WHATSAPP_VERIFY_TOKEN=un-texto-largo     # el mismo que pones en Meta
WHATSAPP_API_VERSION=v23.0               # versión de Graph API; revisa la vigente
```

Ninguna de estas variables lleva prefijo `NEXT_PUBLIC_`, así que nunca llegan al navegador.

## Limitaciones conocidas del MVP

- Un solo token/app de Meta para toda la plataforma; cada organización aporta su Phone number ID. Para que cada inmobiliaria use su propia cuenta de Meta habría que guardar tokens por organización (cifrados) o implementar *Embedded Signup*.
- Solo texto. Imágenes, audios y documentos entrantes se registran como "[Imagen]", "[Nota de voz]", etc., sin descargar el archivo.
- No hay cola de reintentos para envíos fallidos: se marcan como "Falló" con el error de Meta.
- Costos: Meta cobra por conversación/plantilla según su tarifa vigente para México.
