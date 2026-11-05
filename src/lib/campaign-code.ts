const PREFIX: Record<string, string> = {
  RADIO: "RAD",
  ESPECTACULAR: "ESP",
  FACEBOOK: "FB",
  INSTAGRAM: "IG",
  GOOGLE: "GOO",
  TIKTOK: "TT",
  REFERIDO: "REF",
  SITIO_WEB: "WEB",
  WHATSAPP: "WA",
  VOLANTE: "VOL",
  EVENTO: "EXPO",
  PORTAL: "POR",
};

/** "RADIO" + "Radio Exa octubre" -> "RAD-RADI-OCTU" */
export function suggestCampaignCode(channel: string, name: string): string {
  const word = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(/s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w.slice(0, 4))
    .join("-");
  return [PREFIX[channel] ?? "CMP", word].filter(Boolean).join("-").slice(0, 30);
}
