import type { Task, TaskGenerator, DifficultyLevel } from '../domain/types'
import { TALENS_DAL_GENERATORS } from './talens-dal'
import { MULTIPLIKATIONSSKOGEN_GENERATORS } from './multiplikationsskogen'
import { BRAKBERGET_GENERATORS } from './brakberget'
import { MONSTERSKOGEN_GENERATORS } from './monsterskogen'
import { FORMERNAS_BERG_GENERATORS } from './formernas-berg'
import { OVRIGA_GENERATORS } from './ovriga-varldar'
import { freshSeed } from './rng'

/**
 * Registret över alla uppgiftsgeneratorer. Läroplansträdet pekar hit
 * via momentens generatorId — ett moment utan registrerad generator
 * visas som "kommer snart" i appen.
 */
const ALL: TaskGenerator[] = [
  ...TALENS_DAL_GENERATORS,
  ...MULTIPLIKATIONSSKOGEN_GENERATORS,
  ...BRAKBERGET_GENERATORS,
  ...MONSTERSKOGEN_GENERATORS,
  ...FORMERNAS_BERG_GENERATORS,
  ...OVRIGA_GENERATORS,
]

const registry = new Map<string, TaskGenerator>(ALL.map((g) => [g.id, g]))

export const hasGenerator = (generatorId: string | undefined): boolean =>
  generatorId !== undefined && registry.has(generatorId)

export function generateTask(generatorId: string, level: DifficultyLevel, seed = freshSeed()): Task {
  const gen = registry.get(generatorId)
  if (!gen) throw new Error(`Ingen generator registrerad för ${generatorId}`)
  return gen.generate(level, seed)
}

export const allGeneratorIds = (): string[] => [...registry.keys()]
