/** Regenerates plano-los-pinos.png from prisma/plano-layout.ts. Run: npx tsx prisma/seed-assets/generate-plano.ts */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { planoSvg } from "../plano-layout";

async function main() {
  const png = await sharp(Buffer.from(planoSvg())).png({ compressionLevel: 9, palette: true }).toBuffer();
  writeFileSync(join(process.cwd(), "prisma/seed-assets/plano-los-pinos.png"), png);
  console.log("plano-los-pinos.png", png.length, "bytes");
}
void main();
