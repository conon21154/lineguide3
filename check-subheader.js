import XLSX from 'xlsx';

const workbook = XLSX.readFile('/mnt/c/Users/conon/Desktop/작업지시.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

console.log('🔍 3행 서브헤더 확인:');
const row3 = jsonData[2];
row3.forEach((cell, index) => {
  if (cell && cell.toString().trim()) {
    console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
  }
});

console.log('\n📝 첫 번째 데이터 (4행):');
const row4 = jsonData[3];
row4.forEach((cell, index) => {
  if (cell && cell.toString().trim()) {
    console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
  }
});

console.log('\n🎯 컬럼 매핑 (2행+3행 헤더 결합):');
console.log('A열: 관리번호');
console.log('C열: 작업요청일 (2행: "작업", 3행에 세부항목)');
console.log('D열: DU측 운용팀 (2행: "DU측")');
console.log('F열: RU측 운용팀 (2행: "RU측")'); 
console.log('I열: 대표 RU_ID (2행: "대표")');
console.log('K열: 5G CO-SITE수량 (2행: "5G CO-")');
console.log('L열: 5G 집중국명');
console.log('P열: 선번장');
console.log('Q열: MUX 종류');
console.log('[열: 서비스구분 (31번째 컬럼)');
console.log('\\열: DU ID (32번째 컬럼)');
console.log(']열: DU명 (33번째 컬럼)');
console.log('^열: 채널카드 (34번째 컬럼)');
console.log('_열: 포트 (35번째 컬럼)');