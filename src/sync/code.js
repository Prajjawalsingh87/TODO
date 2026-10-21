// Sync codes: 128 random bits written as 26 Crockford base32 characters,
// shown in groups ("0ABCDE-FGHJK-MNPQR-STVWX-YZ012"). The code is the only
// credential, so it is never logged; the server stores only its SHA-256 hash.

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const LENGTH = 26 // ceil(128 / 5)

/** 16 random bytes -> 26 base32 characters (the first carries the top 3 bits). */
export const encodeCode = (bytes) => {
  let value = 0n
  for (const b of bytes) value = (value << 8n) | BigInt(b)
  let out = ""
  for (let i = 0; i < LENGTH; i++) {
    out = ALPHABET[Number(value & 31n)] + out
    value >>= 5n
  }
  return out
}

export const generateCode = (cryptoImpl = globalThis.crypto) => encodeCode(cryptoImpl.getRandomValues(new Uint8Array(16)))

/**
 * Accept what a person types or pastes: any case, with spaces or dashes, and
 * the usual look-alikes (O -> 0, I/L -> 1). Returns the canonical code or null.
 */
export const normalizeCode = (input) => {
  if (typeof input !== "string" || input.length > 100) return null
  const code = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1")
  if (code.length !== LENGTH || ![...code].every((c) => ALPHABET.includes(c))) return null
  // 26 characters hold 130 bits; a real 128-bit code starts with 0-7.
  return ALPHABET.indexOf(code[0]) < 8 ? code : null
}

/** Display form in short groups for reading aloud or typing: 6-5-5-5-5 characters. */
export const formatCode = (code) => [code.slice(0, 6), ...code.slice(6).match(/.{1,5}/g)].join("-")
