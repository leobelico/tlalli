# Tlalli · Obsidiana — paleta y tipografía

Oscuro, técnico, de noche. Modo por defecto: oscuro (con variante clara).

## Tipografías (Google Fonts)

- **Space Grotesk** — Títulos y cifras grandes
- **Space Mono** — Texto de interfaz

Enlace: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap`. En producción se cargarían con `next/font` (autoalojadas), porque el CSP de la app solo permite fuentes del mismo sitio.

## Colores

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F4F6F2` | Fondo de la app y de la landing |
| `surface` | `#FFFFFF` | Tarjetas, paneles y barras |
| `surface2` | `#E7ECE6` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#0F1A17` | Texto principal |
| `muted` | `#475852` | Texto secundario y etiquetas |
| `line` | `#CBD5CE` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#1F3B33` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#FFFFFF` | Texto e íconos sobre el color primario |
| `accent` | `#0B6B55` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#FFFFFF` | Texto sobre el acento |
| `ok` | `#0B6B55` | Lote disponible · todo bien |
| `warn` | `#7A5200` | Lote apartado · atención |
| `sold` | `#4A5A54` | Lote vendido |
| `danger` | `#B23A1E` | Lead frío · urgente · error |
| `okBg` | `#D8F0E8` | Fondo de "disponible" |
| `warnBg` | `#F6E5BE` | Fondo de "apartado" |
| `soldBg` | `#DDE4E0` | Fondo de "vendido" |
| `dangerBg` | `#FBE2DB` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#0F1A17` / `#F4F6F2` | 16.4:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#0F1A17` / `#FFFFFF` | 17.8:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#475852` / `#F4F6F2` | 6.9:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#475852` / `#FFFFFF` | 7.5:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#FFFFFF` / `#1F3B33` | 12.1:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#1F3B33` / `#F4F6F2` | 11.2:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#FFFFFF` / `#0B6B55` | 6.5:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#0B6B55` / `#D8F0E8` | 5.4:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#7A5200` / `#F6E5BE` | 5.6:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#4A5A54` / `#DDE4E0` | 5.6:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#B23A1E` / `#FBE2DB` | 4.8:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#B23A1E` / `#FFFFFF` | 6.0:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#0B6B55` / `#E7ECE6` | 5.4:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#7A5200` / `#E7ECE6` | 5.8:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#4A5A54` / `#E7ECE6` | 6.1:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#0F1A17` / `#D8F0E8` | 14.9:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#0F1A17` / `#F6E5BE` | 14.3:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#F4F6F2` / `#4A5A54` | 6.7:1 | 4.5:1 | Pasa |

### Modo oscuro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0C1110` | Fondo de la app y de la landing |
| `surface` | `#151C1A` | Tarjetas, paneles y barras |
| `surface2` | `#1D2623` | Columnas del pipeline, fondo del plano, controles suaves |
| `ink` | `#ECF2EE` | Texto principal |
| `muted` | `#9DB0A7` | Texto secundario y etiquetas |
| `line` | `#2A3631` | Bordes y divisores (decorativos, no cuentan como texto) |
| `primary` | `#D9F24F` | Acción principal, enlaces, selección activa |
| `onPrimary` | `#0C1110` | Texto e íconos sobre el color primario |
| `accent` | `#3DDBB0` | Acento propio de Tlalli: etiquetas, avisos, botón de llamado |
| `onAccent` | `#04130E` | Texto sobre el acento |
| `ok` | `#3DDBB0` | Lote disponible · todo bien |
| `warn` | `#F5B83D` | Lote apartado · atención |
| `sold` | `#8FA19A` | Lote vendido |
| `danger` | `#FF7A59` | Lead frío · urgente · error |
| `okBg` | `#0F3329` | Fondo de "disponible" |
| `warnBg` | `#3A2C0A` | Fondo de "apartado" |
| `soldBg` | `#242E2A` | Fondo de "vendido" |
| `dangerBg` | `#3F1E16` | Fondo de avisos de frío |

**Contraste verificado (WCAG 2.x AA)**

| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |
|---|---|---|---|---|
| Texto principal sobre fondo | `#ECF2EE` / `#0C1110` | 16.8:1 | 4.5:1 | Pasa |
| Texto principal sobre tarjeta | `#ECF2EE` / `#151C1A` | 15.3:1 | 4.5:1 | Pasa |
| Texto secundario sobre fondo | `#9DB0A7` / `#0C1110` | 8.3:1 | 4.5:1 | Pasa |
| Texto secundario sobre tarjeta | `#9DB0A7` / `#151C1A` | 7.6:1 | 4.5:1 | Pasa |
| Texto sobre color primario (botón) | `#0C1110` / `#D9F24F` | 15.2:1 | 4.5:1 | Pasa |
| Color primario como texto/enlace sobre fondo | `#D9F24F` / `#0C1110` | 15.2:1 | 4.5:1 | Pasa |
| Texto sobre acento (etiqueta, botón secundario) | `#04130E` / `#3DDBB0` | 10.8:1 | 4.5:1 | Pasa |
| Disponible (texto) sobre su fondo | `#3DDBB0` / `#0F3329` | 7.8:1 | 4.5:1 | Pasa |
| Apartado (texto) sobre su fondo | `#F5B83D` / `#3A2C0A` | 7.6:1 | 4.5:1 | Pasa |
| Vendido (texto) sobre su fondo | `#8FA19A` / `#242E2A` | 5.2:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre su fondo | `#FF7A59` / `#3F1E16` | 5.8:1 | 4.5:1 | Pasa |
| Frío / urgente (texto) sobre tarjeta | `#FF7A59` / `#151C1A` | 6.7:1 | 4.5:1 | Pasa |
| Plano: borde de lote Disponible sobre el plano (no texto) | `#3DDBB0` / `#1D2623` | 8.8:1 | 3:1 | Pasa |
| Plano: borde de lote Apartado sobre el plano (no texto) | `#F5B83D` / `#1D2623` | 8.7:1 | 3:1 | Pasa |
| Plano: borde de lote Vendido sobre el plano (no texto) | `#8FA19A` / `#1D2623` | 5.7:1 | 3:1 | Pasa |
| Plano: número de lote sobre Disponible | `#ECF2EE` / `#0F3329` | 12.1:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Apartado (con halo) | `#ECF2EE` / `#3A2C0A` | 12.0:1 | 4.5:1 | Pasa |
| Plano: número de lote sobre Vendido | `#ECF2EE` / `#55645E` | 5.5:1 | 4.5:1 | Pasa |

**Resultado global:** todos los pares de texto cumplen 4.5:1 y los de no-texto (bordes de lote) 3:1, en modo claro y oscuro.

**Estatus del plano (no depende solo del color):** disponible = relleno claro + borde verde; apartado = rayado diagonal + borde ámbar; vendido = relleno sólido oscuro/gris. Se distinguen en escala de grises.
