# Guía de ventas: entrevistas y demo

Dos herramientas para tus primeras conversaciones con desarrolladoras e inmobiliarias: (1) preguntas de entrevista para descubrir si el dolor es real y cuánto vale, y (2) un guion de demo de 10 minutos con los datos de ejemplo del sistema. Orden recomendado: primero entrevistas, después demo solo a quien confirme el dolor.

> Los precios, las cifras y los nombres de esta guía son propuestas sin validar. Las entrevistas sirven justamente para corregirlas.

---

## Parte 1. Entrevista de descubrimiento (30 a 40 min)

**Reglas.** Habla poco. No vendas ni muestres el sistema en esta llamada. Pide ejemplos concretos ("¿qué pasó la última vez?") en lugar de opiniones. Anota las palabras exactas que usa; las vas a reusar en tu propaganda. Termina siempre pidiendo una segunda conversación o una referencia.

**Con quién.** Dueños, directores comerciales o gerentes de ventas de desarrolladoras e inmobiliarias con 3 a 20 asesores. Meta: 10 a 15 entrevistas.

### Apertura (2 min)
Presenta el motivo: "Estoy investigando cómo dan seguimiento a sus prospectos las desarrolladoras. No te voy a vender nada hoy; me interesa entender cómo lo hacen." Pide permiso para tomar notas.

### A. Su negocio (5 min)
1. ¿Qué desarrollos tienen activos y cuántas unidades quedan por vender?
2. ¿Cuántos asesores atienden prospectos? ¿Son internos o externos?
3. ¿Cuántos prospectos nuevos les llegan al mes, más o menos?
4. ¿Cuántas ventas cierran al mes y cuál es el ticket promedio?

### B. De dónde vienen los prospectos (7 min)
5. ¿En qué medios anuncian (radio, espectaculares, redes, Google, portales, referidos, expos)? ¿Cuánto invierten al mes en total?
6. ¿Cómo saben cuál de esos medios les trajo un prospecto? Cuéntame la última vez que lo revisaron.
7. ¿Han dejado de invertir en algún medio o subido la inversión por una razón concreta? ¿Con qué dato decidieron?
8. ¿Qué pasa cuando alguien llama o escribe sin decir cómo se enteró?

### C. Seguimiento (10 min)
9. Cuando entra un prospecto, ¿qué sigue? ¿Quién lo recibe y en cuánto tiempo suele responderse?
10. ¿Dónde guardan los datos hoy (Excel, libreta, WhatsApp personal, CRM)? Si pudieras enseñarme cómo lo llevan, mejor.
11. ¿Qué pasa con un prospecto que no contesta tres días? ¿Quién se entera?
12. Cuéntame de la última venta que se les cayó o se la ganó la competencia. ¿Qué falló?
13. Si un asesor se va, ¿qué pasa con sus prospectos y su historial?
14. ¿Cómo se enteran de si un asesor está dando seguimiento o no?

### D. WhatsApp (5 min)
15. ¿Los asesores atienden por su WhatsApp personal o hay un número de la empresa?
16. ¿Qué pasa con las conversaciones cuando el asesor cambia de teléfono o se va?
17. ¿Hay algo en WhatsApp que les gustaría controlar y hoy no pueden?

### E. Lo que ya probaron (4 min)
18. ¿Han probado algún CRM u otra herramienta? ¿Por qué lo dejaron o por qué lo siguen usando?
19. ¿Cuánto pagan hoy por herramientas de ventas y marketing?

### F. Decisión y dinero (5 min)
20. Si resolvieras el seguimiento, ¿qué número cambiaría y cuánto valdría para ustedes (más ventas, menos prospectos perdidos, menos publicidad desperdiciada)?
21. ¿Quién decide una compra como esta y quién más opina? ¿Cómo se ha tomado una decisión parecida antes?
22. ¿Cuándo sería el momento natural de cambiar algo (lanzamiento de etapa, cierre de año)?

### Cierre (2 min)
23. "Con lo que me contaste, ¿hay algo que debí preguntarte y no pregunté?"
24. "¿Conoces a alguien más a quien le pase esto y te parezca bien que le escriba?"
25. "¿Te parece si en 15 días te muestro algo concreto y me dices si te sirve?"

### Cómo leer las respuestas
| Señal | Qué significa |
|---|---|
| Cuenta una venta perdida concreta y reciente | Dolor real. Candidato a piloto. |
| Dice "ya tenemos Excel" pero no sabe cuántos prospectos recuperó | Tiene un problema que no ve. Hay que mostrárselo con sus números. |
| Responde en generalidades ("todo bien") | No hay dolor o no confía en ti todavía. No lo persigas. |
| No sabe cuánto invierte ni qué medio funciona | Tu mejor cliente: la atribución por campaña es justo lo que vendes. |
| Quien responde no decide | Pregunta cómo llegar a quien decide. |

Después de cada entrevista, anota: dolor principal (en sus palabras), cuánto vale, quién decide y si aceptó la segunda reunión.

---

## Parte 2. Guion de demo de 10 minutos

**Objetivo.** Contar una historia: *un prospecto entra, el sistema te dice de qué campaña vino, no se enfría y se cierra*. No recorras menús; recorre la historia.

### Preparación (antes de la llamada)
- Servidor encendido: `npx supabase start` y `npm run dev`; datos frescos con `npm run db:seed`.
- Entra con **admin@potosi.ejemplo.test** (contraseña `Demo1234!`), que es la organización "Desarrollos del Potosí (demo)" en plan Élite.
- Ten abierta una segunda ventana con **asesor1@potosi.ejemplo.test** por si quieres mostrar lo que ve un asesor.
- Usa pantalla compartida en modo ventana del navegador, zoom 100 % y sin otras pestañas visibles.
- Si vas a mostrar IA, pon `ANTHROPIC_API_KEY` en `.env.local` y ensáyalo antes. Sin llave verás el aviso "falta ANTHROPIC_API_KEY".
- Ensaya el plano antes de la demo: abre "Residencial Los Pinos", pestaña **Plano**.
- Antes de decirle al prospecto "esto es tu información", aclara que los datos son de ejemplo.

### Qué NO prometer todavía
- **El WhatsApp de la demo es simulado.** No sale a ningún teléfono. Dilo con claridad si te preguntan; la conexión real con Meta aún no se ha probado.
- **No hay cobro automático ni facturación integrada.** Se maneja por fuera mientras dure el piloto.
- **No hay recuperación de contraseña por correo** ni notificaciones por correo.
- Los precios son propuestas: no los cierres en la demo.

### Guion

**0:00 a 1:00. Planteamiento (sin pantalla o con el Inicio abierto)**
> "Lo que me contaste es que gastas en radio, redes y espectaculares y no sabes cuál te trae ventas, y que algunos prospectos se enfrían. Te voy a mostrar cómo se vería eso resuelto, con datos de ejemplo."

**1:00 a 3:00. Inicio: el dinero por campaña**
- Abre el **Inicio**. Señala el embudo, el costo por lead y el desempeño por campaña.
- Frase: "Aquí ves de qué campaña vino cada lead y cuánto te costó, sin que nadie lo capture a mano."
- Pausa para que reaccione. Si pregunta "¿cómo sabe de dónde vino?", pasa a la siguiente escena.

**3:00 a 4:30. Campañas y captura de leads**
- Entra a **Campañas** y muestra una campaña con su código único (por ejemplo, la del radio).
- Frase: "En el radio se dice 'menciona este código'; en la web el formulario lo trae solo. Al llegar el lead ya viene marcado con su campaña."
- Muestra un lead en **Leads** con campaña, desarrollo de interés y consentimiento de privacidad.

**4:30 a 6:00. Seguimiento: pipeline y lead frío**
- Abre **Pipeline**. Muestra el kanban y arrastra un lead de etapa.
- Muestra un lead marcado como **frío** y las **Tareas**.
- Frase: "Si un prospecto lleva más de [24] horas sin atención, el sistema lo marca y le avisa al asesor. Tú decides cuántas horas."
- Si pregunta por el motivo de pérdida: muestra que al marcar un lead como perdido se pide el motivo.

**6:00 a 7:00. WhatsApp**
- Abre una conversación en **WhatsApp**.
- Frase: "La conversación queda ligada al lead y a su historial; si el asesor se va, no se pierde." Aclara que aquí es simulado.

**7:00 a 8:30. Plano y cotizador**
- Entra a **Desarrollos → Residencial Los Pinos → Plano**. Pasa el cursor sobre un lote, haz clic y toca **Cotizar**.
- Genera la cotización y abre el PDF.
- Frase: "Del plano a la cotización en dos clics. Los lotes se pintan solos según estén disponibles, apartados o vendidos."

**8:30 a 9:30. IA (solo si la probaste antes)**
- En un lead, muestra el asistente: resumen, temperatura y borrador de mensaje.
- Frase: "Solo propone; nunca envía nada solo. Y no recibe el teléfono ni el correo del cliente."
- Si no está lista, salta esta escena y no la menciones como funcional.

**9:30 a 10:00. Cierre**
> "¿Esto se parece a lo que me contabas? ¿Qué parte te serviría más?"
> "Propongo un piloto de 30 días con uno de tus desarrollos. Me dices qué número quieres mover y lo medimos juntos."

### Manejo de objeciones
| Objeción | Respuesta corta |
|---|---|
| "Ya uso Excel." | "Perfecto, empezamos importando tu Excel. El sistema te avisa lo que Excel no: quién lleva días sin contestar y qué campaña vende." |
| "Mis asesores no lo van a usar." | "Por eso el piloto es con un solo desarrollo y los asesores ven solo sus prospectos. Medimos si lo usan en la primera semana." |
| "¿Y mis datos?" | "Cada empresa ve solo lo suyo; los datos no se mezclan entre clientes. El aviso de privacidad y el consentimiento están integrados." No prometas certificaciones que no tienes. |
| "Es caro." | "Compáralo con una venta de un lote. Si recupera un solo prospecto al mes, ya se pagó." |
| "Quiero WhatsApp real ya." | "Es la siguiente etapa del piloto: verificamos el número con Meta contigo. Hoy lo que ves es simulado." |

### Después de la demo
Envía el mismo día un correo corto con: lo que te dijo que le dolía (con sus palabras), la propuesta de piloto (alcance, duración, precio, qué números mediremos) y la fecha de la siguiente llamada.
