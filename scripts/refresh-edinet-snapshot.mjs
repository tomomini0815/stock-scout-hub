import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchEdinetDocumentArchive, fetchSmartMoneyData } from "../api/_shared/smart-money.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const snapshotPath = join(rootDir, "api/_shared/edinet-snapshot.js");
const pdfCacheDir = join(rootDir, "public/edinet-cache");

const docIdFromSignal = (signal) => {
  const idMatch = String(signal.id ?? "").match(/^edinet-([A-Z0-9_-]+)$/i);
  if (idMatch) return idMatch[1];
  return String(signal.sourceUrl ?? "").match(/(?:docId=|\/)([A-Z0-9_-]+)(?:\.pdf|$|&)/i)?.[1] ?? "";
};

const normalizeEdinetSignal = (signal, docId) => {
  const note = String(signal.note ?? "");
  const cacheNote = "本番環境ではEDINET APIの直接取得が制限される場合があるため、直近取得済みの公式提出PDFを表示します。";
  return {
    ...signal,
    sourceUrl: `/edinet-cache/${docId}.pdf`,
    note: note.includes(cacheNote) ? note : `${note} ${cacheNote}`.trim(),
  };
};

const writeSnapshot = async (signals) => {
  const body = `export const EDINET_SNAPSHOT_SIGNALS = ${JSON.stringify(signals, null, 2)};\n`;
  await writeFile(snapshotPath, body);
};

const clearPdfCache = async () => {
  await mkdir(pdfCacheDir, { recursive: true });
  const files = await readdir(pdfCacheDir);
  await Promise.all(files.filter((file) => file.endsWith(".pdf")).map((file) => rm(join(pdfCacheDir, file))));
};

const writePdfCache = async (signals) => {
  await clearPdfCache();
  for (const signal of signals) {
    const docId = docIdFromSignal(signal);
    const archive = await fetchEdinetDocumentArchive(docId, "2");
    await writeFile(join(pdfCacheDir, `${docId}.pdf`), archive.buffer);
  }
};

const main = async () => {
  const payload = await fetchSmartMoneyData({ force: true });
  if (payload.sourceStatus?.edinet !== "live") {
    throw new Error(`EDINET live fetch failed. status=${payload.sourceStatus?.edinet ?? "unknown"}`);
  }

  const signals = payload.signals
    .filter((signal) => signal.source === "edinet")
    .map((signal) => {
      const docId = docIdFromSignal(signal);
      if (!docId) throw new Error(`Missing EDINET doc id for signal ${signal.id}`);
      return normalizeEdinetSignal(signal, docId);
    });

  if (!signals.length) throw new Error("No EDINET signals found.");

  await writeSnapshot(signals);
  await writePdfCache(signals);
  console.log(JSON.stringify({ edinet: signals.length, updatedAt: new Date().toISOString() }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
