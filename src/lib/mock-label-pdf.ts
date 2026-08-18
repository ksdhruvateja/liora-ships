export function buildMockLabelPdf(options: {
  appName: string;
  trackingNumber: string;
  courierName: string;
  shipmentId: string;
}): Buffer {
  const lines = [
    options.appName,
    `Tracking: ${options.trackingNumber}`,
    `Service: ${options.courierName}`,
    `Ref: ${options.shipmentId}`,
  ].map((line) => line.replace(/[()\\]/g, " "));

  const escaped = lines
    .map((line, index) => `0 ${index === 0 ? 0 : -22} Td (${line}) Tj`)
    .join(" ");
  const stream = `BT /F1 16 Tf 50 760 Td ${escaped} ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];
  let offset = 9;
  const offsets = [0];
  const chunks = ["%PDF-1.4\n"];
  for (const object of objects) {
    offsets.push(offset);
    chunks.push(`${object}\n`);
    offset += object.length + 1;
  }
  const xrefStart = offset;
  const xref = `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n `)
    .join("\n")}\n`;
  chunks.push(xref);
  chunks.push(`trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return Buffer.from(chunks.join(""), "utf8");
}
