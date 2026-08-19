export async function downloadLabelPdf(
  sourceUrl: string,
  apiKey: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (sourceUrl.startsWith("data:")) {
    const comma = sourceUrl.indexOf(",");
    if (comma < 0) return null;
    const header = sourceUrl.slice(0, comma);
    const data = sourceUrl.slice(comma + 1);
    const mime = header.match(/data:([^;]+)/)?.[1] ?? "application/pdf";
    return { bytes: new Uint8Array(Buffer.from(data, "base64")), contentType: mime };
  }

  const response = await fetch(sourceUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const body = (await response.json()) as Record<string, unknown>;
    const nestedUrl =
      (typeof body.url === "string" && body.url) ||
      (typeof (body.shipping_documents as { url?: string }[] | undefined)?.[0]?.url === "string"
        ? (body.shipping_documents as { url: string }[])[0].url
        : "");
    const nestedB64 =
      (body.base64_encoded_strings as string[] | undefined)?.[0] ||
      (body.shipping_documents as { base64_encoded_strings?: string[] }[] | undefined)?.[0]
        ?.base64_encoded_strings?.[0];
    if (nestedUrl && nestedUrl !== sourceUrl) {
      return downloadLabelPdf(nestedUrl, apiKey);
    }
    if (nestedB64) {
      return { bytes: new Uint8Array(Buffer.from(nestedB64, "base64")), contentType: "application/pdf" };
    }
    return null;
  }
  if (!response.ok) return null;
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: contentType || "application/pdf",
  };
}
