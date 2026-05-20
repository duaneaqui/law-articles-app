/**
 * One-off generator: parses Wikisource HTML dump of the 1987 Philippine Constitution
 * into a TypeScript module for offline use in the app.
 *
 * Authoritative source for citation: https://www.officialgazette.gov.ph/constitutions/1987-constitution/
 * If `wikisource-constitution.html` is missing, the script downloads it from Wikisource (or place the file manually / `npm run gen:constitution`).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = path.join(root, 'wikisource-constitution.html');
const outPath = path.join(root, 'src', 'data', 'constitution1987.generated.ts');

function decodeEntities(str) {
  return str
    .replace(/&#95;/g, '_')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToText(htmlChunk) {
  let s = htmlChunk;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/p>/gi, '\n\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function extractArticleHeading(chunk) {
  const m = chunk.match(
    /<p><b>(ARTICLE\s+[IVXLCDM]+)<br\s*\/?><i>([\s\S]*?)<\/i><\/b>/i
  );
  if (!m) return null;
  const subtitle = decodeEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  return `${m[1]} — ${subtitle}`;
}

function extractOrdinanceHeading(chunk) {
  const m = chunk.match(/<p><b>([\s\S]*?)<\/b>/);
  if (!m) return 'Ordinance';
  const line = decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return line.slice(0, 120);
}

async function loadHtml() {
  if (fs.existsSync(inputPath)) {
    return fs.readFileSync(inputPath, 'utf8');
  }
  const url = 'https://en.wikisource.org/wiki/Constitution_of_the_Philippines_(1987)';
  console.warn('Downloading Wikisource HTML →', inputPath);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const html = await res.text();
  fs.writeFileSync(inputPath, html, 'utf8');
  return html;
}

async function main() {
  const html = await loadHtml();

  const anchorRe = /<span class="anchor" id="([^"]+)"><\/span>/g;
  /** @type {{ rawId: string, index: number }[]} */
  const anchors = [];
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    anchors.push({ rawId: m[1], index: m.index });
  }
  anchors.sort((a, b) => a.index - b.index);

  const wanted = new Set([
    'Preamble',
    ...[
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
      'X',
      'XI',
      'XII',
      'XIII',
      'XIV',
      'XV',
      'XVI',
      'XVII',
      'XVIII',
    ].map((r) => `Article_${r}`),
    'Ordinance',
  ]);

  /** @type {{ key: string, start: number, end: number }[]} */
  const slices = [];
  for (let i = 0; i < anchors.length; i++) {
    const key = decodeEntities(anchors[i].rawId);
    if (!wanted.has(key)) continue;
    const start = anchors[i].index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : html.indexOf('licenseContainer');
    slices.push({ key, start, end: end > start ? end : html.length });
  }

  /** @type {{ id: number; title: string; description: string; content: string }[]} */
  const articles = [];

  let id = 1;
  for (const s of slices) {
    const chunk = html.slice(s.start, s.end);
    let title = '';
    let description = '';
    let content = '';

    if (s.key === 'Preamble') {
      title = 'Preamble';
      description = '1987 Constitution of the Republic of the Philippines';
      content = htmlToText(chunk.replace(/^[\s\S]*?<\/div>/i, '')); // drop heading wrappers loosely
      const preambleBody = content.replace(/^Preamble\s*/i, '').trim();
      content = preambleBody || content;
    } else if (s.key === 'Ordinance') {
      title = extractOrdinanceHeading(chunk) || 'Ordinance';
      description = 'Attached ordinance — consult Official Gazette for authoritative formatting.';
      content = htmlToText(chunk);
    } else {
      const heading = extractArticleHeading(chunk);
      title = heading || s.key.replace(/_/g, ' ');
      description = '1987 Constitution — Official Gazette (authoritative)';
      content = htmlToText(chunk);
      content = content.replace(new RegExp(`^${title.split(' — ')[0]}\\s*`, 'i'), '').trim();
    }

    articles.push({
      id: id++,
      title,
      description,
      content,
    });
  }

  const body = `import { Article } from '../types/article';\n\nexport const constitutionArticles: Article[] = ${JSON.stringify(
    articles,
    null,
    2
  )};\n`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body, 'utf8');
  console.log('Wrote', outPath, `(${articles.length} sections)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
