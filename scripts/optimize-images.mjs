// Mengubah foto di photos/ menjadi WebP (lebar maks 1600px) di public/portfolio/.
// Pakai: taruh foto asli (jpg/jpeg/png/webp/tif) di photos/, lalu `npm run images:optimize`.
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT_DIR = "photos";
const OUTPUT_DIR = path.join("public", "portfolio");
const MAX_WIDTH = 1600;
const QUALITY = 80;
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

await mkdir(OUTPUT_DIR, { recursive: true });

const files = (await readdir(INPUT_DIR)).filter((file) =>
  EXTENSIONS.has(path.extname(file).toLowerCase()),
);

if (files.length === 0) {
  console.log(`Tidak ada foto di ${INPUT_DIR}/.`);
  process.exit(0);
}

for (const file of files) {
  const name = path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const output = path.join(OUTPUT_DIR, `${name}.webp`);
  const info = await sharp(path.join(INPUT_DIR, file))
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(output);
  console.log(`${file} → ${output} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`);
}
