import { BRAND } from "@/lib/brand";
import type { EmailMessage } from "./email";

type Body = Omit<EmailMessage, "to">;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function layout(title: string, paragraphs: string[], cta?: { label: string; href: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${p}</p>`).join("");
  const button = cta
    ? `<p style="margin:20px 0"><a href="${esc(cta.href)}" style="background:#1d4a85;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${esc(cta.label)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917"><h1 style="font-size:18px;margin:0 0 16px">${esc(title)}</h1>${body}${button}<p style="margin:24px 0 0;font-size:12px;color:#78716c">${BRAND.name} · Si no esperabas este correo, puedes ignorarlo.</p></div>`;
}

export function invitationEmail(i: { orgName: string; inviterName: string; role: "ADMIN" | "ASESOR"; link: string }): Body {
  const role = i.role === "ADMIN" ? "administrador" : "asesor";
  return {
    subject: `${i.inviterName} te invitó a ${i.orgName} en ${BRAND.name}`,
    text: `${i.inviterName} te invitó a unirte a ${i.orgName} como ${role}.\n\nCrea tu cuenta aquí (el enlace vence en 7 días y solo sirve una vez):\n${i.link}\n`,
    html: layout(
      `Te invitaron a ${i.orgName}`,
      [`${esc(i.inviterName)} te invitó a unirte a <strong>${esc(i.orgName)}</strong> como ${role}.`, "El enlace vence en 7 días y solo sirve una vez."],
      { label: "Aceptar invitación", href: i.link },
    ),
  };
}

export function leadAssignedEmail(i: { leadName: string; phone: string; origin: string; link: string }): Body {
  return {
    subject: `Nuevo lead asignado: ${i.leadName}`,
    text: `Te asignaron un lead nuevo.\n\n${i.leadName}\nTeléfono: ${i.phone}\nOrigen: ${i.origin}\n\nContáctalo cuanto antes, los primeros minutos son los que más cuentan:\n${i.link}\n`,
    html: layout(
      "Te asignaron un lead nuevo",
      [`<strong>${esc(i.leadName)}</strong><br>Teléfono: ${esc(i.phone)}<br>Origen: ${esc(i.origin)}`, "Contáctalo cuanto antes: los primeros minutos son los que más cuentan."],
      { label: "Abrir el lead", href: i.link },
    ),
  };
}

export function leadsAssignedSummaryEmail(i: { name: string; count: number; link: string }): Body {
  const n = plural(i.count, "lead", "leads");
  return {
    subject: `Te asignaron ${n}`,
    text: `Hola ${i.name}, te asignaron ${n} nuevos (importación o reparto).\n\nRevísalos aquí: ${i.link}\n`,
    html: layout(`Te asignaron ${n}`, [`Hola ${esc(i.name)}, te asignaron ${n} nuevos por importación o reparto.`], {
      label: "Ver mis leads",
      href: i.link,
    }),
  };
}

export function digestEmail(i: { name: string; overdueTasks: number; staleLeads: number; link: string }): Body {
  const lines: string[] = [];
  if (i.overdueTasks > 0) lines.push(`${plural(i.overdueTasks, "tarea vencida", "tareas vencidas")}`);
  if (i.staleLeads > 0) lines.push(`${plural(i.staleLeads, "lead sin contacto", "leads sin contacto")}`);
  const list = lines.join("\n");
  return {
    subject: "Tus pendientes de hoy",
    text: `Hola ${i.name}, esto es lo que te espera hoy:\n\n${list}\n\nÁbrelo aquí: ${i.link}\n`,
    html: layout("Tus pendientes de hoy", [`Hola ${esc(i.name)}, esto es lo que te espera hoy:`, lines.map(esc).join("<br>")], {
      label: "Abrir Pórtico",
      href: i.link,
    }),
  };
}

export function authorizationRequestedEmail(i: { requester: string; summary: string; link: string }): Body {
  return {
    subject: `Por autorizar: ${i.requester} pide tu autorización`,
    text: `${i.requester} pide tu autorización:

${i.summary}

Apruébalo o recházalo aquí:
${i.link}
`,
    html: layout(`${i.requester} pide tu autorización`, [esc(i.summary), "Mientras no respondas, la solicitud queda pendiente y el cliente espera."], {
      label: "Revisar la solicitud",
      href: i.link,
    }),
  };
}

export function authorizationDecidedEmail(i: { approved: boolean; summary: string; note: string | null; link: string }): Body {
  const verdict = i.approved ? "aprobada" : "rechazada";
  const note = i.note ? `
Nota del administrador: ${i.note}` : "";
  return {
    subject: `Tu solicitud fue ${verdict}`,
    text: `Tu solicitud fue ${verdict}:

${i.summary}${note}

Ábrela aquí: ${i.link}
`,
    html: layout(`Tu solicitud fue ${verdict}`, [esc(i.summary), ...(i.note ? [`Nota del administrador: ${esc(i.note)}`] : [])], {
      label: i.approved ? "Abrir" : "Ver detalle",
      href: i.link,
    }),
  };
}
