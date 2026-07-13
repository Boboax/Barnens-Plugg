/* PIN-hantering för föräldraläget. Hashas med SHA-256 — aldrig klartext. */

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`barnens-plugg:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  return (await hashPin(pin)) === storedHash
}
