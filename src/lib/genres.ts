export const CONCERT_GENRES = [
  'Pop',
  'Indie',
  'Rock',
  'Punk',
  'Jazz',
  'Akustik',
  'EDM',
  'Hip-Hop',
  'R&B',
  'Folk',
  'Metal',
  'Blues',
  'Dangdut',
  'Festival',
] as const;

export type ConcertGenre = (typeof CONCERT_GENRES)[number];
