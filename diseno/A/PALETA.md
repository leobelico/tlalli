# Tlalli · Cimiento — paleta y tipografía

Plano de ingeniería, cálido. Modo por defecto: claro (con variante oscura).

## Tipografías (Google Fonts)

- **Bricolage Grotesque** — Títulos y cifras grandes
- **Geist** — Texto de interfaz
- **Geist Mono** — Datos, etiquetas y códigos de campaña

Enlace: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap`. En producción se cargarían con `next/font` (autoalojadas), porque el CSP de la app solo permite fuentes del mismo sitio.

## Colores

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F3F1EC` | Fondo de la app y de la landing |
| `surface` | `#FFFFFF` | Tarjetas, paneles y barras |
| `surface2` | `#E9E6DE` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#14202B` | Texto principal |
| `muted` | `#4C5964` | Texto secundario y etiquetas |
| `line` | `#CFCABD` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#1B4B82` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#FFFFFF` | Texto e íconos sobre el color primario |
| `accent` | `#A94E1F` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#FFFFFF` | Texto sobre el acento |
| `ok` | `#17694A` | Lote disponible · todo bien |
| `warn` | `#835400` | Lote apartado · atención |
| `sold` | `#3B4A5A` | Lote vendido |
| `danger` | `#B3361A` | Lead frío · urgente · error |
| `okBg` | `#DDF0E7` | Fondo de "disponible" |
| `warnBg` | `#F7E7C4` | Fondo de "apartado" |
| `soldBg` | `#DCE2E8` | Fondo de "vendido" |
| `dangerBg` | `#FBE3DC` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#14202B` / `#F3F1EC` | 14.6:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#14202B` / `#FFFFFF` | 16.5:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#4C5964` / `#F3F1EC` | 6.4:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#4C5964` / `#FFFFFF` | 7.2:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#FFFFFF` / `#1B4B82` | 8.8:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#1B4B82` / `#F3F1EC` | 7.8:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#FFFFFF` / `#A94E1F` | 5.5:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#17694A` / `#DDF0E7` | 5.6:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#835400` / `#F7E7C4` | 5.3:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#3B4A5A` / `#DCE2E8` | 7.0:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#B3361A` / `#FBE3DC` | 4.9:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#B3361A` / `#FFFFFF` | 6.1:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#17694A` / `#E9E6DE` | 5.3:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#835400` / `#E9E6DE` | 5.2:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#3B4A5A` / `#E9E6DE` | 7.3:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#14202B` / `#DDF0E7` | 13.9:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#14202B` / `#F7E7C4` | 13.5:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#F3F1EC` / `#3B4A5A` | 8.0:1 | 4.5:1 | Pasa |

### Modo oscuro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0F1720` | Fondo de la app y de la landing |
| `surface` | `#17212C` | Tarjetas, paneles y barras |
| `surface2` | `#1F2C39` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#E8EDF2` | Texto principal |
| `muted` | `#A3B1BE` | Texto secundario y etiquetas |
| `line` | `#2F3E4D` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#7FB0EE` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#0B1620` | Texto e íconos sobre el color primario |
| `accent` | `#E58A5B` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#1A0E07` | Texto sobre el acento |
| `ok` | `#58C79B` | Lote disponible · todo bien |
| `warn` | `#E8B04A` | Lote apartado · atención |
| `sold` | `#9FB0C0` | Lote vendido |
| `danger` | `#FF8A68` | Lead frío · urgente · error |
| `okBg` | `#12372B` | Fondo de "disponible" |
| `warnBg` | `#3A2B0B` | Fondo de "apartado" |
| `soldBg` | `#27323E` | Fondo de "vendido" |
| `dangerBg` | `#40201A` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#E8EDF2` / `#0F1720` | 15.3:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#E8EDF2` / `#17212C` | 13.8:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#A3B1BE` / `#0F1720` | 8.2:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#A3B1BE` / `#17212C` | 7.4:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#0B1620` / `#7FB0EE` | 8.1:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#7FB0EE` / `#0F1720` | 8.0:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#1A0E07` / `#E58A5B` | 7.3:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#58C79B` / `#12372B` | 6.3:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#E8B04A` / `#3A2B0B` | 7.0:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#9FB0C0` / `#27323E` | 5.9:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#FF8A68` / `#40201A` | 6.3:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#FF8A68` / `#17212C` | 7.0:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#58C79B` / `#1F2C39` | 6.8:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#E8B04A` / `#1F2C39` | 7.3:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#9FB0C0` / `#1F2C39` | 6.4:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#E8EDF2` / `#12372B` | 11.1:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#E8EDF2` / `#3A2B0B` | 11.6:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#0F1720` / `#9FB0C0` | 8.1:1 | 4.5:1 | Pasa |

**Resultado global:** todos los pares de texto cumplen 4.5:1 y los de no-texto (bordes de lote) 3:1, en modo claro y oscuro.

**Estatus del plano (no depende solo del color):** disponible = relleno claro + borde verde; apartado = rayado diagonal + borde ámbar; vendido = relleno sólido oscuro/gris. Se distinguen en escala de grises.
