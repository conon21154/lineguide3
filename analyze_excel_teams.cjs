const XLSX = require('xlsx');

// 엑셀 파일 읽기
const workbook = XLSX.readFile('작업지시.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(worksheet['!ref']);

console.log('=== 전체 데이터 분석 ===');
console.log('총 행 수:', range.e.r + 1);
console.log();

console.log('=== 모든 데이터 행 출력 ===');
for (let row = 0; row <= range.e.r; row++) {
  let rowData = [];
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({r: row, c: col});
    const cell = worksheet[cellRef];
    rowData.push(cell ? cell.v : null);
  }
  
  // D칼럼(열3)과 F칼럼(열5) 값 추출
  const duTeam = rowData[3]; // D칼럼 (0-based index 3)
  const ruTeam = rowData[5]; // F칼럼 (0-based index 5)
  
  console.log(`행 ${row + 1}: D칼럼(DU측 운용팀)='${duTeam}', F칼럼(RU측 운용팀)='${ruTeam}'`);
}

console.log();
console.log('=== D칼럼(DU측 운용팀) 고유값 추출 ===');
const duTeams = new Set();
for (let row = 0; row <= range.e.r; row++) {
  const cellRef = XLSX.utils.encode_cell({r: row, c: 3}); // D칼럼
  const cell = worksheet[cellRef];
  if (cell && cell.v && cell.v !== 'DU측' && cell.v !== '운용팀') {
    duTeams.add(cell.v);
  }
}
console.log('DU측 운용팀 목록:', Array.from(duTeams).sort());

console.log();
console.log('=== F칼럼(RU측 운용팀) 고유값 추출 ===');
const ruTeams = new Set();
for (let row = 0; row <= range.e.r; row++) {
  const cellRef = XLSX.utils.encode_cell({r: row, c: 5}); // F칼럼
  const cell = worksheet[cellRef];
  if (cell && cell.v && cell.v !== 'RU측' && cell.v !== '운용팀') {
    ruTeams.add(cell.v);
  }
}
console.log('RU측 운용팀 목록:', Array.from(ruTeams).sort());