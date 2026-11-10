# Tlalli · Cimiento · 2 Pino — paleta y tipografía

Verde de pino y ocre. Modo por defecto: claro (con variante oscura).

## Tipografías (Google Fonts)

- **Bricolage Grotesque** — Títulos y cifras grandes
- **Geist** — Texto de interfaz
- **Geist Mono** — Datos, etiquetas y códigos de campaña

Enlace: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap`. En producción se cargarían con `next/font` (autoalojadas), porque el CSP de la app solo permite fuentes del mismo sitio.

## Colores

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F1F2EA` | Fondo de la app y de la landing |
| `surface` | `#FFFFFF` | Tarjetas, paneles y barras |
| `surface2` | `#E4E7DA` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#14241C` | Texto principal |
| `muted` | `#4A5B50` | Texto secundario y etiquetas |
| `line` | `#C9CDB9` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#1F5C45` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#FFFFFF` | Texto e íconos sobre el color primario |
| `accent` | `#E0A526` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#1F1400` | Texto sobre el acento |
| `accentInk` | `#8A5A00` | Acento cuando se usa como texto (palabra destacada) |
| `ok` | `#17694A` | Lote disponible · todo bien |
| `warn` | `#835400` | Lote apartado · atención |
| `sold` | `#3F4C45` | Lote vendido |
| `danger` | `#B3361A` | Lead frío · urgente · error |
| `okBg` | `#DCEFE3` | Fondo de "disponible" |
| `warnBg` | `#F7E7C4` | Fondo de "apartado" |
| `soldBg` | `#DEE3DC` | Fondo de "vendido" |
| `dangerBg` | `#FBE3DC` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#14241C` / `#F1F2EA` | 14.3:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#14241C` / `#FFFFFF` | 16.2:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#4A5B50` / `#F1F2EA` | 6.4:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#4A5B50` / `#FFFFFF` | 7.2:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#FFFFFF` / `#1F5C45` | 7.9:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#1F5C45` / `#F1F2EA` | 7.0:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#1F1400` / `#E0A526` | 8.3:1 | 4.5:1 | Pasa |
| Acento usado como texto (palabra destacada) sobre fondo | `#8A5A00` / `#F1F2EA` | 5.3:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#17694A` / `#DCEFE3` | 5.5:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#835400` / `#F7E7C4` | 5.3:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#3F4C45` / `#DEE3DC` | 6.9:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#B3361A` / `#FBE3DC` | 4.9:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#B3361A` / `#FFFFFF` | 6.1:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#17694A` / `#E4E7DA` | 5.3:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#835400` / `#E4E7DA` | 5.2:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#3F4C45` / `#E4E7DA` | 7.2:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#14241C` / `#DCEFE3` | 13.5:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#14241C` / `#F7E7C4` | 13.2:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#F1F2EA` / `#3F4C45` | 8.0:1 | 4.5:1 | Pasa |

### Modo oscuro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0F1A15` | Fondo de la app y de la landing |
| `surface` | `#17261F` | Tarjetas, paneles y barras |
| `surface2` | `#1F3329` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#E7EEE9` | Texto principal |
| `muted` | `#A2B5AA` | Texto secundario y etiquetas |
| `line` | `#2E4639` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#6FCB9F` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#07180F` | Texto e íconos sobre el color primario |
| `accent` | `#E6B33F` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#1F1400` | Texto sobre el acento |
| `accentInk` | `#E6B33F` | Acento cuando se usa como texto (palabra destacada) |
| `ok` | `#58C79B` | Lote disponible · todo bien |
| `warn` | `#E8B04A` | Lote apartado · atención |
| `sold` | `#9DB0A5` | Lote vendido |
| `danger` | `#FF8A68` | Lead frío · urgente · error |
| `okBg` | `#12372B` | Fondo de "disponible" |
| `warnBg` | `#3A2B0B` | Fondo de "apartado" |
| `soldBg` | `#26332C` | Fondo de "vendido" |
| `dangerBg` | `#40201A` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#E7EEE9` / `#0F1A15` | 15.1:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#E7EEE9` / `#17261F` | 13.4:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#A2B5AA` / `#0F1A15` | 8.3:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#A2B5AA` / `#17261F` | 7.3:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#07180F` / `#6FCB9F` | 9.3:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#6FCB9F` / `#0F1A15` | 9.1:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#1F1400` / `#E6B33F` | 9.4:1 | 4.5:1 | Pasa |
| Acento usado como texto (palabra destacada) sobre fondo | `#E6B33F` / `#0F1A15` | 9.2:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#58C79B` / `#12372B` | 6.3:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#E8B04A` / `#3A2B0B` | 7.0:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#9DB0A5` / `#26332C` | 5.8:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#FF8A68` / `#40201A` | 6.3:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#FF8A68` / `#17261F` | 6.8:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#58C79B` / `#1F3329` | 6.4:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#E8B04A` / `#1F3329` | 6.9:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#9DB0A5` / `#1F3329` | 5.9:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#E7EEE9` / `#12372B` | 11.1:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#E7EEE9` / `#3A2B0B` | 11.6:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#0F1A15` / `#9DB0A5` | 7.8:1 | 4.5:1 | Pasa |

**Resultado global:** todos los pares de texto cumplen 4.5:1 y los de no-texto (bordes de lote) 3:1, en modo claro y oscuro.

**Estatus del plano (no depende solo del color):** disponible = relleno claro + borde verde; apartado = rayado diagonal + borde ámbar; vendido = relleno sólido oscuro/gris. Se distinguen en escala de grises.
