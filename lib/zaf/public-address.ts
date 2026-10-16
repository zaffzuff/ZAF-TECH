/** StrKey account ID: version + 32-byte public key + little-endian CRC16-XModem. */
export function isValidPublicAddress(value: string) {
  const address = value.trim().toUpperCase();
  if (!/^G[A-Z2-7]{55}$/.test(address)) return false;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes: number[] = [];
  let bits = 0, buffer = 0;
  for (const char of address) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >>> bits) & 255); }
  }
  if (bytes.length !== 35 || bytes[0] !== 48) return false;
  let crc = 0;
  for (const byte of bytes.slice(0, 33)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return bytes[33] === (crc & 255) && bytes[34] === (crc >>> 8);
}
