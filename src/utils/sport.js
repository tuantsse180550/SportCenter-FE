const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const KEYWORDS = [
  ['tabletennis', ['bong ban', 'table tennis', 'ping pong', 'pingpong']],
  ['badminton', ['cau long', 'badminton']],
  ['tennis', ['tennis', 'quan vot']],
  ['pilates', ['pilates']],
  ['yoga', ['yoga', 'thien']],
  ['baseball', ['bong chay', 'baseball', 'softball']],
  ['boxing', ['boxing', 'quyen anh', 'kickboxing', 'muay thai', 'vo thuat']],
  ['football', ['football', 'bong da', 'soccer', 'futsal']],
  ['basketball', ['bong ro', 'basketball']],
  ['swimming', ['boi', 'boi loi', 'swim', 'swimming']],
  ['gym', ['gym', 'the hinh', 'fitness']],
];

/** Sport key from a subject name ("Bóng bàn" → "tabletennis"); "generic" when nothing matches. */
export function sportKey(name) {
  const text = ` ${fold(name)} `;
  // Whole-word match, so 'boi' does not catch 'bong ban'.
  const found = KEYWORDS.find(([, words]) => words.some(word => text.includes(` ${word} `)));
  return found ? found[0] : 'generic';
}
