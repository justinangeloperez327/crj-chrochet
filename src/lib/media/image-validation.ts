export function matchesImageType(bytes: Uint8Array, type: string) {
  const data = Buffer.from(bytes);
  if (type === "image/jpeg") return data.length >= 3 && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (type === "image/png") return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/webp") return data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  if (type === "image/avif") return data.subarray(4, 8).toString() === "ftyp" && /avif|avis/.test(data.subarray(8, 32).toString());
  return false;
}
