# Tlalli · Cimiento · 3 Tierra — paleta y tipografía

Terracota y verde turquesa. Modo por defecto: claro (con variante oscura).

## Tipografías (Google Fonts)

- **Bricolage Grotesque** — Títulos y cifras grandes
- **Geist** — Texto de interfaz
- **Geist Mono** — Datos, etiquetas y códigos de campaña

Enlace: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap`. En producción se cargarían con `next/font` (autoalojadas), porque el CSP de la app solo permite fuentes del mismo sitio.

## Colores

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F6F0E7` | Fondo de la app y de la landing |
| `surface` | `#FFFFFF` | Tarjetas, paneles y barras |
| `surface2` | `#ECE3D5` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#25190F` | Texto principal |
| `muted` | `#5E4E41` | Texto secundario y etiquetas |
| `line` | `#D6C9B6` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#8A3F1E` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#FFFFFF` | Texto e íconos sobre el color primario |
| `accent` | `#0F766E` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#FFFFFF` | Texto sobre el acento |
| `accentInk` | `#0F766E` | Acento cuando se usa como texto (palabra destacada) |
| `ok` | `#17694A` | Lote disponible · todo bien |
| `warn` | `#835400` | Lote apartado · atención |
| `sold` | `#5A4B3E` | Lote vendido |
| `danger` | `#B0243A` | Lead frío · urgente · error |
| `okBg` | `#DDF0E7` | Fondo de "disponible" |
| `warnBg` | `#F7E7C4` | Fondo de "apartado" |
| `soldBg` | `#E6DDD2` | Fondo de "vendido" |
| `dangerBg` | `#F9DDE1` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#25190F` / `#F6F0E7` | 15.1:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#25190F` / `#FFFFFF` | 17.1:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#5E4E41` / `#F6F0E7` | 7.0:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#5E4E41` / `#FFFFFF` | 7.9:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#FFFFFF` / `#8A3F1E` | 7.5:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#8A3F1E` / `#F6F0E7` | 6.6:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#FFFFFF` / `#0F766E` | 5.5:1 | 4.5:1 | Pasa |
| Acento usado como texto (palabra destacada) sobre fondo | `#0F766E` / `#F6F0E7` | 4.8:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#17694A` / `#DDF0E7` | 5.6:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#835400` / `#F7E7C4` | 5.3:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#5A4B3E` / `#E6DDD2` | 6.2:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#B0243A` / `#F9DDE1` | 5.2:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#B0243A` / `#FFFFFF` | 6.6:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#17694A` / `#ECE3D5` | 5.2:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#835400` / `#ECE3D5` | 5.1:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#5A4B3E` / `#ECE3D5` | 6.6:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#25190F` / `#DDF0E7` | 14.4:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#25190F` / `#F7E7C4` | 14.0:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#F6F0E7` / `#5A4B3E` | 7.4:1 | 4.5:1 | Pasa |

### Modo oscuro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#1A130F` | Fondo de la app y de la landing |
| `surface` | `#241B15` | Tarjetas, paneles y barras |
| `surface2` | `#2F241C` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#F2E9E0` | Texto principal |
| `muted` | `#BBAA9C` | Texto secundario y etiquetas |
| `line` | `#43332A` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#E58A5B` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#1A0E07` | Texto e íconos sobre el color primario |
| `accent` | `#4FD1C5` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#04201D` | Texto sobre el acento |
| `accentInk` | `#4FD1C5` | Acento cuando se usa como texto (palabra destacada) |
| `ok` | `#58C79B` | Lote disponible · todo bien |
| `warn` | `#E8B04A` | Lote apartado · atención |
| `sold` | `#B3A59A` | Lote vendido |
| `danger` | `#FF8A9A` | Lead frío · urgente · error |
| `okBg` | `#12372B` | Fondo de "disponible" |
| `warnBg` | `#3A2B0B` | Fondo de "apartado" |
| `soldBg` | `#3A2E26` | Fondo de "vendido" |
| `dangerBg` | `#40181F` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#F2E9E0` / `#1A130F` | 15.3:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#F2E9E0` / `#241B15` | 14.1:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#BBAA9C` / `#1A130F` | 8.2:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#BBAA9C` / `#241B15` | 7.5:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#1A0E07` / `#E58A5B` | 7.3:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#E58A5B` / `#1A130F` | 7.1:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#04201D` / `#4FD1C5` | 9.2:1 | 4.5:1 | Pasa |
| Acento usado como texto (palabra destacada) sobre fondo | `#4FD1C5` / `#1A130F` | 9.8:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#58C79B` / `#12372B` | 6.3:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#E8B04A` / `#3A2B0B` | 7.0:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#B3A59A` / `#3A2E26` | 5.5:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#FF8A9A` / `#40181F` | 6.8:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#FF8A9A` / `#241B15` | 7.5:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#58C79B` / `#2F241C` | 7.2:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#E8B04A` / `#2F241C` | 7.7:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#B3A59A` / `#2F241C` | 6.3:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#F2E9E0` / `#12372B` | 10.9:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#F2E9E0` / `#3A2B0B` | 11.4:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#1A130F` / `#B3A59A` | 7.7:1 | 4.5:1 | Pasa |

**Resultado global:** todos los pares de texto cumplen 4.5:1 y los de no-texto (bordes de lote) 3:1, en modo claro y oscuro.

**Estatus del plano (no depende solo del color):** disponible = relleno claro + borde verde; apartado = rayado diagonal + borde ámbar; vendido = relleno sólido oscuro/gris. Se distinguen en escala de grises.
