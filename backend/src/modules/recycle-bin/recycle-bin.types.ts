export const permanentDeleteEntities = [
  'lead',
  'account',
  'contact',
  'opportunity',
  'task',
  'case',
] as const;

export type PermanentDeleteEntity = (typeof permanentDeleteEntities)[number];

export const isPermanentDeleteEntity = (
  value: string,
): value is PermanentDeleteEntity =>
  permanentDeleteEntities.includes(value as PermanentDeleteEntity);
