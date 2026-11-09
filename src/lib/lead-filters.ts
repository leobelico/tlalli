import type { Stage } from "@/generated/prisma/enums";
import type { LeadFilters } from "@/server/services/leads";
import { STAGES } from "@/lib/labels";
import { isUuid } from "@/lib/validation/common";
import { channelSchema } from "@/lib/validation/leads";

type Params = Record<string, string | string[] | undefined | null | FormDataEntryValue>;
const str = (v: Params[string]) => (typeof v === "string" ? v : undefined);

/** One parser for the leads list URL and for bulk actions posted from it, so both see the same leads. */
export function parseLeadFilters(sp: Params): LeadFilters {
  const etapa = str(sp.etapa);
  const asesor = str(sp.asesor);
  return {
    q: str(sp.q) || undefined,
    stage: STAGES.includes(etapa as Stage) ? (etapa as Stage) : undefined,
    campaignId: isUuid(str(sp.campana)) ? str(sp.campana) : undefined,
    channel: channelSchema.safeParse(str(sp.canal)).data,
    assignedToId: asesor === "none" || isUuid(asesor) ? asesor : undefined,
    staleOnly: str(sp.frios) === "1",
    page: Number(str(sp.pagina) ?? 1) || 1,
  };
}
