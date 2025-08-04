const XLSX = require('xlsx');

// 엑셀 파일 읽기
const workbook = XLSX.readFile('작업지시.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(worksheet['!ref']);

console.log('=== 병합된 헤더 구조 분석 ===');
console.log('총 행 수:', range.e.r + 1, '총 열 수:', range.e.c + 1);
console.log();

// 첫 3행을 자세히 분석
console.log('=== 1-3행 헤더 구조 ===');
for (let row = 0; row < 3; row++) {
    console.log(`\n--- 행 ${row + 1} ---`);
    for (let col = 0; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({r: row, c: col});
        const cell = worksheet[cellRef];
        const letter = XLSX.utils.encode_col(col);
        const value = cell ? cell.v : null;
        
        if (value !== null) {
            console.log(`${letter}${row + 1} (열${col}): "${value}"`);
        }
    }
}

console.log('\n=== 병합 정보 분석 ===');
if (worksheet['!merges']) {
    console.log('병합된 셀들:');
    worksheet['!merges'].forEach((merge, index) => {
        const startCell = XLSX.utils.encode_cell(merge.s);
        const endCell = XLSX.utils.encode_cell(merge.e);
        console.log(`병합 ${index + 1}: ${startCell}:${endCell}`);
    });
} else {
    console.log('병합된 셀이 없습니다.');
}

console.log('\n=== 주요 칼럼 위치 확인 ===');
console.log('A칼럼 (관리번호)');
console.log('B칼럼 (빈 칼럼)');
console.log('C칼럼 (작업 요청일)');
console.log('D칼럼 (DU측 운용팀)');
console.log('E칼럼 (DU측 담당자)');
console.log('F칼럼 (RU측 운용팀)');
console.log('G칼럼 (RU측 담당자)');

// 실제 헤더 값 확인
console.log('\n=== 2-3행 헤더 실제 값 ===');
const row2Headers = [];
const row3Headers = [];

for (let col = 0; col <= range.e.c; col++) {
    const cell2 = worksheet[XLSX.utils.encode_cell({r: 1, c: col})];
    const cell3 = worksheet[XLSX.utils.encode_cell({r: 2, c: col})];
    
    row2Headers.push(cell2 ? cell2.v : null);
    row3Headers.push(cell3 ? cell3.v : null);
}

console.log('행 2 헤더:', row2Headers);
console.log('행 3 헤더:', row3Headers);