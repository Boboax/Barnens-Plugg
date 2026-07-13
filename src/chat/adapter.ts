/* ============================================================
   Chattadaptern — Mattekompisen Pi (fas 5).

   Gränssnittet är en del av grundarkitekturen även om chatten
   driftsätts senare: leverantörsoberoende (Gemini/Claude), och
   ALLT säkerhetskritiskt ligger utanför AI:ns räckvidd —
   tidsgränser, framsteg och belöningar styrs av appens kod.

   Se docs/GUARDRAILS.md för hela säkerhetsdesignen.
   ============================================================ */

export interface ChatMessage {
  role: 'child' | 'ai'
  text: string
  /** Kladdytan som PNG-dataURL — Pi kan läsa uträkningen. */
  imagePngDataUrl?: string
}

export interface ChatContext {
  childName: string
  childAge: number
  /** Momentet barnet tränar på just nu (styr Pis fokus). */
  momentTitle: string
  /** Uppgiften på skärmen, om någon. */
  currentTaskPrompt?: string
}

export interface ChatReply {
  text: string
  /** Sattes stopp av ämnesfiltret? Loggas och visas i föräldraläget. */
  refusedOffTopic: boolean
}

export interface ChatSendOptions {
  /** Appens egna snabbknappar är förhandsgodkända — hoppa över ämnesfiltret. */
  skipFilter?: boolean
  /** Strömma svaret bit för bit när leverantören kan (Gemini). */
  onDelta?: (chunk: string) => void
}

export interface ChatProvider {
  readonly name: string
  /** Är leverantören konfigurerad och nåbar? (Pi "sover" annars.) */
  ready(): boolean
  send(context: ChatContext, history: ChatMessage[], opts?: ChatSendOptions): Promise<ChatReply>
}

/**
 * Fas 1–4: ingen chatt. Pi sover, men UI:t och loggformatet är på plats
 * så fas 5 bara behöver registrera en riktig leverantör + proxy-URL.
 */
export const sleepingProvider: ChatProvider = {
  name: 'sover',
  ready: () => false,
  send: async () => ({
    text: 'Zzz … Pi sover än så länge. Chatten kommer i en senare version!',
    refusedOffTopic: false,
  }),
}

let provider: ChatProvider = sleepingProvider

export const getChatProvider = (): ChatProvider => provider
export const setChatProvider = (p: ChatProvider): void => {
  provider = p
}
