import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '/home/conon/작업지시.xlsx';

console.log('🔍 작업구분(DU측/RU측) 분석\n');

try {
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📋 헤더 분석 - DU/RU 관련 컬럼 찾기:');
  
  // 2-3행에서 DU/RU 관련 헤더 찾기
  for (let rowIndex = 1; rowIndex < 4; rowIndex++) {
    const row = jsonData[rowIndex] || [];
    console.log(`\n${rowIndex + 1}행에서 DU/RU 관련 헤더:`);
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').trim();
      
      if (cellValue.toLowerCase().includes('du') || cellValue.toLowerCase().includes('ru')) {
        console.log(`  컬럼 ${colIndex}: "${cellValue}"`);
      }
      
      if (cellValue.toLowerCase().includes('구분') || cellValue.toLowerCase().includes('작업')) {
        console.log(`  컬럼 ${colIndex}: "${cellValue}" (구분 관련)`);
      }
    }
  }

  console.log('\n📄 실제 데이터에서 DU/RU 패턴 분석:');
  
  // 각 행의 데이터에서 DU/RU 구분할 수 있는 패턴 찾기
  for (let i = 3; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] || [];
    console.log(`\n${i + 1}행 분석:`);
    console.log(`  관리번호: "${row[0]}"`);
    
    // 각 컬럼에서 DU/RU 관련 값 찾기
    for (let j = 0; j < Math.min(15, row.length); j++) {
      const cellValue = String(row[j] || '').trim();
      
      if (cellValue.toLowerCase().includes('du') || cellValue.toLowerCase().includes('ru')) {
        console.log(`  컬럼 ${j}: "${cellValue}" (DU/RU 관련)`);
      }
    }
    
    // DU측 운용팀과 RU측 운용팀 비교
    console.log(`  DU측 운용팀 (컬럼 3): "${row[3]}"`);
    console.log(`  RU측 운용팀 (컬럼 5): "${row[5]}"`);
    
    // 작업구분 추정
    if (row[3] && row[5]) {
      if (row[3] === row[5]) {
        console.log(`  → 추정: DU측과 RU측이 동일팀 ("${row[3]}")`);
      } else {
        console.log(`  → 추정: DU측("${row[3]}")과 RU측("${row[5]}")이 다른팀`);
      }
    }
  }

  console.log('\n🎯 관리번호별 그룹화 분석:');
  
  // 동일한 관리번호가 여러 번 나오는지 확인
  const managementNumbers = {};
  for (let i = 3; i < jsonData.length; i++) {
    const row = jsonData[i] || [];
    const mgmtNum = String(row[0] || '').trim();
    
    if (mgmtNum && mgmtNum !== '') {
      if (!managementNumbers[mgmtNum]) {
        managementNumbers[mgmtNum] = [];
      }
      managementNumbers[mgmtNum].push({
        rowIndex: i + 1,
        duTeam: String(row[3] || '').trim(),
        ruTeam: String(row[5] || '').trim(),
        구분: String(row[7] || '').trim() // 7번 컬럼이 구분일 가능성
      });
    }
  }
  
  console.log('관리번호별 중복 확인:');
  Object.entries(managementNumbers).forEach(([mgmtNum, rows]) => {
    if (rows.length > 1) {
      console.log(`\n관리번호 "${mgmtNum}": ${rows.length}번 등장`);
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.rowIndex}행 - DU:${row.duTeam}, RU:${row.ruTeam}, 구분:${row.구분}`);
      });
    }
  });

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}