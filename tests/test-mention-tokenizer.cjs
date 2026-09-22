const knownNames = [
  'Nguyễn Phương nam',
  'Bạch Đức Huy',
  'Nguyễn Phương Nam',
  'Bạch Đức Duy',
  'Nguyễn Yến My',
  'Lường Thị Hường',
  'Đỗ Thị Minh Huyền',
  'Đoàn Thị Phương Thảo',
  'Nguyễn Thị Thu Hiền',
  'Trang',
  'Cường',
  'Trường',
  'Minh',
  'Hiệp',
  'Đạt',
  'Triết',
  'Mai Anh',
  'Sương',
  'Phong',
  'Hà',
  'Phương',
  'Mạnh',
  'Chính',
  'Hồng'
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTokenRegex(names = []) {
  // Sort known names by descending length so "Nguyễn Phương nam" matches before "Nguyễn"
  const sorted = [...new Set(names.map(n => n.trim().normalize('NFC')))].filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const knownPattern = sorted.map(escapeRegex).join('|');

  // Title-case Vietnamese name: 1 to 4 Capitalized words
  // E.g. "Nguyễn Phương Nam", "Bạch Đức Duy", "Mai Anh", "Trang"
  const generalTitleCaseName = '[A-ZÀ-ỸĐ][a-zà-ỹđ0-9_]*(?:\\s+[A-ZÀ-ỸĐ][a-zà-ỹđ0-9_]*){0,3}';

  // Single-word handle / email / username, e.g. "namnp5", "trangbt9", "admin"
  const singleWordHandle = '[a-zA-Z0-9_\\p{L}\\p{M}]+(?:\\.[a-zA-Z0-9_\\p{L}\\p{M}]+)*';

  const mentionPattern = '@(?:' + (knownPattern ? knownPattern + '|' : '') + generalTitleCaseName + '|' + singleWordHandle + ')';

  const pattern = 
    '(https?:\\/\\/[^\\s]+|' +
    '(?:\\/|@)[sS][eE][nN]?[dD]?_?[tT][oO]_?[pP][oO](?::|\\s)?|' +
    '(?:\\/|@)(?:[pP][oO]_)?(?:[pP][eE][nN][dD][iI][nN][gG])(?::|\\s)?|' +
    '@[aA][lL][lL]\\b|@[eE][vV][eE][rR][yY][oO][nN][eE]\\b|@[mM][ọo][iị]\\s+[nN][gG][ưu][ờo][iì]\\b|' +
    mentionPattern + ')';

  return new RegExp(pattern, 'gu');
}

const tokenRegex = buildTokenRegex(knownNames);

const testCases = [
  {
    name: 'Sentence with two unknown/known users in sentence',
    text: 'User viết @Nguyễn Phương Nam và @Bach Đức Duy 2 user này đều ko có trong task phần khiến phần UI chat lỗi'
  },
  {
    name: 'Old NFD text from sheet with figma link',
    text: 'Link Wireframe: https://www.figma.com/design/CBen8jLcPx... @Nguyễn Phương nam @Bạch Đức Huy'
  },
  {
    name: 'Mentions with punctuation',
    text: 'Chào @Nguyễn Phương Nam, nhờ bạn xem giúp! CC: @Bạch Đức Huy: hãy xác nhận.'
  },
  {
    name: 'Mention all and commands',
    text: '/sentopo: Link design: https://figma.com @all @mọi người xem nhé'
  },
  {
    name: 'Single word usernames',
    text: 'Ping @trangbt9 và @namnp5.os vào trao đổi'
  }
];

testCases.forEach(({ name, text }) => {
  console.log('=== ' + name + ' ===');
  const normalized = text.normalize('NFC');
  const parts = normalized.split(tokenRegex).filter(Boolean);
  console.log(parts);
});
