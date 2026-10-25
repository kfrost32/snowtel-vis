import sharp from "sharp";
import { SPOT_KINDS, spotIconSvg } from "@snotel/core/spots";

const OUT_DIR = "apps/mobile/assets/map";

async function main() {
  for (const kind of SPOT_KINDS) {
    for (const scale of [1, 2, 3]) {
      const suffix = scale === 1 ? "" : `@${scale}x`;
      await sharp(Buffer.from(spotIconSvg(kind, scale))).png().toFile(`${OUT_DIR}/spot-${kind}${suffix}.png`);
    }
  }
  console.log(`Wrote spot icons to ${OUT_DIR}`);
}

main();
