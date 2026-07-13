import type { ChildProfile, Household } from '../domain/types'
import { getChatProvider, setChatProvider, sleepingProvider } from './adapter'
import { createClaudeProvider, createGeminiProvider } from './providers'
import { MAX_MESSAGES_PER_DAY } from './prompts'

/* Kopplar hushållets chattkonfiguration till rätt leverantör. */

export function configureChatFromHousehold(household: Household): void {
  const cfg = household.chat
  if (!cfg || !cfg.apiKey) {
    setChatProvider(sleepingProvider)
    return
  }
  setChatProvider(cfg.provider === 'claude' ? createClaudeProvider(cfg.apiKey) : createGeminiProvider(cfg.apiKey))
  // Värm modellistan direkt så första chattmeddelandet slipper vänta på den.
  if (cfg.provider === 'gemini') {
    void import('./providers').then(({ listGeminiModels }) => listGeminiModels(cfg.apiKey).catch(() => {}))
  }
}

/** Är chatten redo för det här barnet? (nyckel finns + påslagen för barnet) */
export const chatReadyFor = (child: ChildProfile): boolean =>
  child.chatEnabled && getChatProvider().ready()

/** Meddelanden kvar idag för barnet (dagstak mot kostnad och tjat). */
export function messagesLeftToday(child: ChildProfile, household: Household, todayIso: string): number {
  const used = household.chatLog.filter(
    (e) => e.childId === child.id && e.role === 'child' && e.at.slice(0, 10) === todayIso,
  ).length
  return Math.max(0, MAX_MESSAGES_PER_DAY - used)
}
