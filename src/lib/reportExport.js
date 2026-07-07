import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import magellanLogo from "../assets/Magellan_Logo-removebg-preview.png";

/** @param {unknown} s */
export function csvCell(s) {
  const t = String(s ?? "").replace(/^—$/, "");
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** @param {string[]} headers @param {unknown[][]} rows @param {string} filename */
export function downloadReportCsv(headers, rows, filename) {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

let logoDataUrlPromise = null;

function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(magellanLogo)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      );
  }
  return logoDataUrlPromise;
}

/**
 * PDF export: logo header + table only (no filters, period text, or page chrome).
 * @param {{ headers: string[], rows: unknown[][], filename: string }} opts
 */
export async function downloadReportPdf({ headers, rows, filename }) {
  const landscape = headers.length > 7;
  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const logo = await getLogoDataUrl();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoW = Math.min(160, pageWidth * 0.35);
  const logoH = logoW * 0.28;
  doc.addImage(logo, "PNG", (pageWidth - logoW) / 2, 14, logoW, logoH);

  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map((c) => String(c ?? ""))),
    startY: 14 + logoH + 10,
    styles: { fontSize: landscape ? 6.5 : 7, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 250, 252] },
    margin: { left: 18, right: 18, bottom: 18 },
    tableWidth: "auto",
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export { magellanLogo };
