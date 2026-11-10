# Supuestos (no hubo preguntas; esto es lo que di por cierto)

## Sobre KoatlCyber
- **No encontré ningún activo de KoatlCyber** (logotipo, guía de marca, tipografías) en el repositorio ni en la carpeta del proyecto. Por eso la "familia" la definí yo con tres rasgos compartidos por las tres direcciones, para que se sientan hermanas de un mismo estudio de tecnología: (1) **etiquetas en monoespaciada** pequeña para datos, códigos y secciones; (2) **rejilla visible y ordenada** (módulos de 8 px, tablas y columnas alineadas a ella); (3) **tono directo en español de México**, sin tecnicismos. Si KoatlCyber ya tiene tipografía o color propios, hay que reemplazar estos tres rasgos por los reales.
- "Un producto de KoatlCyber" aparece como sello discreto, siempre en monoespaciada.
- Cada dirección tiene un **acento propio** que no pertenece a la familia: arcilla (A), amarillo-limón (B), amarillo flor (C).

## Sobre la app real (de donde partí)
- Leí los componentes actuales: columnas y tarjetas del pipeline (`pipeline/board.tsx`), banner "Contacta primero", aviso "Deshacer (n s)", menú del celular de 10 secciones, leyenda y colores del plano de lotes (`plan-board.tsx`), y los tokens de `globals.css` (azul cianotipo, naranja de estaca para "frío", ocre para "apartado", esquinas pequeñas, Bricolage Grotesque + Geist). Las pantallas del diseño usan las mismas piezas: columnas Nuevo → Apartado, tarjetas con campaña, última interacción y "Mover a…", y los avisos de frío.
- No toqué `src/`, `prisma/` ni `tests/`. No apliqué el cambio de nombre.
- Todos los datos son **inventados** (personas, desarrollos "Los Álamos" y "Vista Real", "Desarrollos Lomas del Altiplano", códigos de campaña). La cita de la landing es de ejemplo y está marcada como tal.

## Sobre el nombre y el logotipo
- Tlalli (náhuatl: tierra, terreno). **No hice búsqueda de marca ni de dominio**; no puedo garantizar que no exista un logotipo parecido, solo que ninguno copia uno que yo conozca. Antes de adoptarlo hay que hacer búsqueda en IMPI y en dominios.
- Inspiración náhuatl, sutil y sin símbolos sagrados ni deidades: **A** usa el ritmo de una retícula de parcelas (una "T" hecha de lotes con uno marcado); **B** usa la geometría del mojón de topografía, un rombo partido en cuatro triángulos; **C** usa los surcos del campo como tres líneas onduladas. Ninguno usa grecas, pirámides escalonadas, serpientes, soles ni calendarios.
- Los logotipos están **dibujados con trazos propios, sin fuentes**, para que el SVG se vea igual en cualquier lugar. Las letras de A y C son minúsculas de trazo constante; las de B son mayúsculas angulares.

## Sobre accesibilidad
- Verifiqué con la fórmula WCAG 2.x todos los pares de texto a **4.5:1** y los bordes de lote del plano a **3:1**, en claro y oscuro, para las tres direcciones (tablas en `A|B|C/PALETA.md` y `paleta.html`). Texto grande no se usó para relajar ningún par.
- El estatus del plano nunca depende solo del color: disponible (relleno claro), apartado (rayado), vendido (relleno sólido).
- Objetivos táctiles de 44 px o más y campos de 16 px en las pantallas de celular.
- Verifiqué contraste y desbordes, no usé lectores de pantalla ni probé daltonismo con simulador; el rayado se eligió por eso.

## Sobre las pantallas
- Cada dirección tiene tres pantallas en HTML/CSS: **landing** (1280 y 390), **app de escritorio** (pipeline, 1280) y **celular** (lista de seguimiento del asesor, 390). El plano de lotes aparece en la landing; el plano de lotes interactivo de la app real no se rediseñó como pantalla aparte porque pidieron tres.
- Las capturas son PNG con deviceScaleFactor 2: las landings en página completa y las pantallas de la app en la ventana visible (las barras fijas y avisos de "Deshacer" se ven donde estarían en el uso real).
- Las fuentes se cargan de Google Fonts al abrir el HTML (necesita internet); las capturas se generaron con las fuentes cargadas (lo comprobé en cada una).
- El modo alterno se ve agregando `?tema=oscuro` o `?tema=claro` a la dirección de cada pantalla; hay capturas del modo alterno de la app de escritorio en `capturas/`.
- En producción las fuentes irían autoalojadas con `next/font` (como ya hace la app): el CSP que agregamos solo permite fuentes del mismo sitio.

## Qué dejé fuera
- Pantalla de plano a tamaño completo, estados vacíos, formularios y diálogos; pantallas de inicio de sesión; un sistema completo de componentes. Son siguiente paso después de elegir.
