// One canonical layout for the story JSON, shared by the story editor and scripts/format_story.mjs,
// so saving from the editor only changes the lines that were edited.
// Objects and arrays holding only plain values (a line of dialogue, a drink option, a list of slots)
// go on one line; everything else is indented by two spaces.

const isPlain = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);
const isFlat = (v) =>
  Array.isArray(v) ? v.every(isPlain) : v && typeof v === 'object' && Object.values(v).every(isPlain);

function write(v, indent) {
  if (isPlain(v)) return JSON.stringify(v);
  const pad = '  '.repeat(indent + 1),
    end = '  '.repeat(indent);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (isFlat(v)) return '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']';
    return '[\n' + v.map((x) => pad + write(x, indent + 1)).join(',\n') + '\n' + end + ']';
  }
  const entries = Object.entries(v).filter(([, x]) => x !== undefined);
  if (!entries.length) return '{}';
  if (isFlat(v))
    return '{ ' + entries.map(([k, x]) => JSON.stringify(k) + ': ' + JSON.stringify(x)).join(', ') + ' }';
  return (
    '{\n' +
    entries.map(([k, x]) => pad + JSON.stringify(k) + ': ' + write(x, indent + 1)).join(',\n') +
    '\n' +
    end +
    '}'
  );
}

export function formatStoryJson(data) {
  return write(data, 0) + '\n';
}
