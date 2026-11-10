# Tlalli · Milpa — paleta y tipografía

Cálido, cercano, de campo. Modo por defecto: claro (con variante oscura).

## Tipografías (Google Fonts)

- **Fraunces** — Títulos y cifras grandes
- **DM Sans** — Texto de interfaz
- **DM Mono** — Datos, etiquetas y códigos de campaña

Enlace: `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap`. En producción se cargarían con `next/font` (autoalojadas), porque el CSP de la app solo permite fuentes del mismo sitio.

## Colores

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#FBF6EC` | Fondo de la app y de la landing |
| `surface` | `#FFFFFF` | Tarjetas, paneles y barras |
| `surface2` | `#F2E9D8` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#1F2A26` | Texto principal |
| `muted` | `#55625C` | Texto secundario y etiquetas |
| `line` | `#E0D4BC` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#0E5A4E` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#FFFFFF` | Texto e íconos sobre el color primario |
| `accent` | `#F4A300` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#1F1500` | Texto sobre el acento |
| `ok` | `#176B45` | Lote disponible · todo bien |
| `warn` | `#7A4F00` | Lote apartado · atención |
| `sold` | `#4A5568` | Lote vendido |
| `danger` | `#B8301F` | Lead frío · urgente · error |
| `okBg` | `#DDF0E4` | Fondo de "disponible" |
| `warnBg` | `#FBE8BE` | Fondo de "apartado" |
| `soldBg` | `#E4E7EC` | Fondo de "vendido" |
| `dangerBg` | `#FADDD7` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#1F2A26` / `#FBF6EC` | 13.8:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#1F2A26` / `#FFFFFF` | 14.8:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#55625C` / `#FBF6EC` | 5.9:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#55625C` / `#FFFFFF` | 6.4:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#FFFFFF` / `#0E5A4E` | 8.1:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#0E5A4E` / `#FBF6EC` | 7.5:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#1F1500` / `#F4A300` | 8.7:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#176B45` / `#DDF0E4` | 5.5:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#7A4F00` / `#FBE8BE` | 5.9:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#4A5568` / `#E4E7EC` | 6.1:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#B8301F` / `#FADDD7` | 4.7:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#B8301F` / `#FFFFFF` | 6.0:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#176B45` / `#F2E9D8` | 5.4:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#7A4F00` / `#F2E9D8` | 5.9:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#4A5568` / `#F2E9D8` | 6.2:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#1F2A26` / `#DDF0E4` | 12.5:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#1F2A26` / `#FBE8BE` | 12.3:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#FBF6EC` / `#4A5568` | 7.0:1 | 4.5:1 | Pasa |

### Modo oscuro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0F1A17` | Fondo de la app y de la landing |
| `surface` | `#172421` | Tarjetas, paneles y barras |
| `surface2` | `#20312D` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#F3EDE0` | Texto principal |
| `muted` | `#A9B8B0` | Texto secundario y etiquetas |
| `line` | `#2D4039` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#5FD0B8` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#06201A` | Texto e íconos sobre el color primario |
| `accent` | `#F7B733` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#1F1500` | Texto sobre el acento |
| `ok` | `#5FD0A0` | Lote disponible · todo bien |
| `warn` | `#F0BD4F` | Lote apartado · atención |
| `sold` | `#A8B4C2` | Lote vendido |
| `danger` | `#FF8D78` | Lead frío · urgente · error |
| `okBg` | `#12372B` | Fondo de "disponible" |
| `warnBg` | `#3A2B0B` | Fondo de "apartado" |
| `soldBg` | `#28333D` | Fondo de "vendido" |
| `dangerBg` | `#40201A` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#F3EDE0` / `#0F1A17` | 15.2:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#F3EDE0` / `#172421` | 13.7:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#A9B8B0` / `#0F1A17` | 8.6:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#A9B8B0` / `#172421` | 7.8:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#06201A` / `#5FD0B8` | 9.1:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#5FD0B8` / `#0F1A17` | 9.5:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#1F1500` / `#F7B733` | 10.1:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#5FD0A0` / `#12372B` | 6.9:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#F0BD4F` / `#3A2B0B` | 7.9:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#A8B4C2` / `#28333D` | 6.1:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#FF8D78` / `#40201A` | 6.5:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#FF8D78` / `#172421` | 7.1:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#5FD0A0` / `#20312D` | 7.2:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#F0BD4F` / `#20312D` | 7.9:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#A8B4C2` / `#20312D` | 6.5:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#F3EDE0` / `#12372B` | 11.2:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#F3EDE0` / `#3A2B0B` | 11.8:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#0F1A17` / `#A8B4C2` | 8.4:1 | 4.5:1 | Pasa |

**Resultado global:** todos los pares de texto cumplen 4.5:1 y los de no-texto (bordes de lote) 3:1, en modo claro y oscuro.

**Estatus del plano (no depende solo del color):** disponible = relleno claro + borde verde; apartado = rayado diagonal + borde ámbar; vendido = relleno sólido oscuro/gris. Se distinguen en escala de grises.
