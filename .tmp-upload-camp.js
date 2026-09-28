import { readFileSync, writeFileSync } from "fs";
const paths = [
  "C:\\Users\\usuario\\OneDrive\\Imágenes\\IMG_2990.png",
  "C:\\Users\\usuario\\OneDrive\\Imágenes\\IMG_2991.png",
  "C:\\Users\\usuario\\OneDrive\\Imágenes\\IMG_2992.png",
  "C:\\Users\\usuario\\OneDrive\\Imágenes\\IMG_5344.png",
];
const B = "https://autopublicador-zeta.vercel.app";
const cid = "e499053c-c39d-4eaa-a0a1-cd4894f39c76";

const urls = [];
for (const p of paths) {
  try {
    const fd = new FormData();
    fd.append("file", new Blob([readFileSync(p)]));
    fd.append("name", "campaña");
    const res = await fetch(`${B}/api/upload`, { method: "POST", body: fd });
    const d = await res.json();
    if (d.url) urls.push(d.url);
    console.log("SUBIDO", p, "→", d.url || d.error);
  } catch (e) {
    console.log("FALLÓ", p, e.message);
  }
}

if (urls.length > 0) {
  const putRes = await fetch(`${B}/api/campaigns/${cid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: urls }),
  });
  const putData = await putRes.json();
  console.log("GUARDADO EN CAMPAÑA:", (putData.campaign?.images || []).length, "imágenes");
  for (const u of (putData.campaign?.images || [])) console.log("  ", u);
}
