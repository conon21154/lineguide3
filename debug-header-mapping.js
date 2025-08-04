import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '/home/conon/test-excel-data.xlsx';

console.log('🔍 헤더 매핑 로직 상세 디버깅\n');

try {
  if (!fs.existsSync(excelPath)) {
    console.log('❌ 엑셀 파일을 찾을 수 없습니다:', excelPath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📋 전체 헤더 구조 분석:');
  
  // 1~3행 전체 출력
  for (let rowIndex = 0; rowIndex < Math.min(4, jsonData.length); rowIndex++) {
    const row = jsonData[rowIndex] || [];
    console.log(`${rowIndex + 1}행: [${row.slice(0, 20).map((cell, i) => `${i}:"${cell}"`).join(', ')}]`);
  }

  console.log('\n🎯 매핑 로직 시뮬레이션:');
  
  // 실제 파서의 매핑 로직 재현
  const headerPatterns = {
    '관리번호': ['관리번호', '관리', '번호', 'ID', 'id'],
    '작업요청일': ['작업요청일', '요청일', '작업일', '요청', '일정', '날짜', '예정일'],
    'DU측_운용팀': ['DU측', '운용팀', 'DU', '운용', '팀', 'DU측운용팀', 'DU 측']
  };
  
  const headerMapping = {};
  
  if (jsonData.length >= 2) {
    const row2 = jsonData[1] || []; // 2행 (실제 헤더)
    const maxCols = Math.max(row2.length, 30);
    
    for (let colIndex = 0; colIndex < maxCols; colIndex++) {
      const header2 = String(row2[colIndex] || '').trim();
      const combinedHeader = header2;
      
      console.log(`\n컬럼 ${colIndex}: "${header2}"`);
      
      // 각 필수 필드와 매칭 시도
      for (const [fieldName, patterns] of Object.entries(headerPatterns)) {
        if (headerMapping[fieldName] === undefined) {
          const isMatch = patterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            const header2Lower = header2.toLowerCase();
            const combinedLower = combinedHeader.toLowerCase();
            
            const match = header2Lower.includes(patternLower) || combinedLower.includes(patternLower);
            if (match) {
              console.log(`  ✅ "${fieldName}" 매칭: "${pattern}" in "${header2}"`);
            }
            return match;
          });
          
          if (isMatch) {
            headerMapping[fieldName] = colIndex;
            console.log(`  📍 ${fieldName} -> 컬럼 ${colIndex} 확정`);
            break;
          }
        }
      }
    }
  }
  
  console.log('\n📊 최종 매핑 결과:');
  console.log(headerMapping);
  
  console.log('\n🧪 실제 데이터 추출 테스트:');
  
  // 3행(index 2) 데이터로 테스트
  const testRow = jsonData[2] || [];
  console.log('테스트 행 데이터:', testRow.slice(0, 10));
  
  const extractedData = {
    관리번호: String(testRow[headerMapping['관리번호']] || '').trim(),
    작업요청일: String(testRow[headerMapping['작업요청일']] || '').trim(),
    DU측_운용팀: String(testRow[headerMapping['DU측_운용팀']] || '').trim()
  };
  
  console.log('추출된 데이터:', extractedData);

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}