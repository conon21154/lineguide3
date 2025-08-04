import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '/home/conon/작업지시.xlsx';

console.log('🔍 실제 작업지시 엑셀 파일 구조 분석\n');

try {
  if (!fs.existsSync(excelPath)) {
    console.log('❌ 엑셀 파일을 찾을 수 없습니다:', excelPath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  console.log('📋 시트 목록:', workbook.SheetNames);
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log(`\n📊 총 ${jsonData.length}행의 데이터가 있습니다.`);

  console.log('\n📋 처음 5행의 전체 구조:');
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i] || [];
    console.log(`\n${i + 1}행 (총 ${row.length}개 컬럼):`);
    
    // 처음 20개 컬럼만 출력
    for (let j = 0; j < Math.min(20, row.length); j++) {
      const cellValue = String(row[j] || '').trim();
      if (cellValue) {
        console.log(`  컬럼 ${j}: "${cellValue}"`);
      }
    }
    
    // 나머지 컬럼에 데이터가 있는지 확인
    const hasMoreData = row.slice(20).some(cell => String(cell || '').trim() !== '');
    if (hasMoreData) {
      console.log('  ... (더 많은 컬럼 데이터 있음)');
    }
  }

  console.log('\n🎯 헤더 분석 - 관리번호와 작업요청일 찾기:');
  
  // 각 행에서 "관리번호"와 "작업요청일" 관련 헤더 찾기
  for (let rowIndex = 0; rowIndex < Math.min(4, jsonData.length); rowIndex++) {
    const row = jsonData[rowIndex] || [];
    console.log(`\n${rowIndex + 1}행에서 헤더 검색:`);
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').trim().toLowerCase();
      
      if (cellValue.includes('관리번호') || cellValue.includes('관리') || cellValue.includes('번호')) {
        console.log(`  📍 관리번호 관련: 컬럼 ${colIndex} = "${row[colIndex]}"`);
      }
      
      if (cellValue.includes('작업요청일') || cellValue.includes('요청일') || cellValue.includes('작업일') || cellValue.includes('일정')) {
        console.log(`  📅 작업요청일 관련: 컬럼 ${colIndex} = "${row[colIndex]}"`);
      }
      
      if (cellValue.includes('운용팀') || cellValue.includes('du측')) {
        console.log(`  👥 운용팀 관련: 컬럼 ${colIndex} = "${row[colIndex]}"`);
      }
    }
  }

  console.log('\n📄 실제 데이터 행 분석 (4행부터):');
  for (let i = 3; i < Math.min(8, jsonData.length); i++) {
    const row = jsonData[i] || [];
    console.log(`\n${i + 1}행 데이터:`);
    
    // 처음 10개 컬럼의 데이터 출력
    for (let j = 0; j < Math.min(10, row.length); j++) {
      const cellValue = String(row[j] || '').trim();
      if (cellValue) {
        console.log(`  컬럼 ${j}: "${cellValue}"`);
      }
    }
  }

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}