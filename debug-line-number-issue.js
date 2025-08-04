import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '/home/conon/작업지시.xlsx';

console.log('🔍 선번장과 작업요청일 컬럼 정확한 매핑 분석\n');

try {
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // raw: true로 설정해서 원본 데이터 형식 확인
  const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: true 
  });
  
  // raw: false로 설정해서 변환된 데이터 확인
  const jsonDataString = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📋 헤더 분석 (2-3행):');
  console.log('2행:', jsonDataString[1]?.slice(0, 20).join(' | '));
  console.log('3행:', jsonDataString[2]?.slice(0, 20).join(' | '));

  console.log('\n🔍 선번장 관련 컬럼 찾기:');
  for (let rowIndex = 1; rowIndex < 4; rowIndex++) {
    const row = jsonDataString[rowIndex] || [];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').trim().toLowerCase();
      if (cellValue.includes('선번장') || cellValue.includes('회선번호') || cellValue.includes('lte')) {
        console.log(`${rowIndex + 1}행 컬럼 ${colIndex}: "${row[colIndex]}"`);
      }
    }
  }

  console.log('\n📊 실제 데이터 비교 (raw vs string):');
  
  for (let i = 3; i < Math.min(6, jsonDataRaw.length); i++) {
    const rowRaw = jsonDataRaw[i] || [];
    const rowString = jsonDataString[i] || [];
    
    console.log(`\n${i + 1}행 데이터:`);
    console.log(`관리번호 (컬럼 0): "${rowString[0]}"`);
    console.log(`작업요청일 (컬럼 2): "${rowString[2]}"`);
    
    // 선번장으로 추정되는 컬럼들 확인
    for (let j = 10; j < 20; j++) {
      if (rowRaw[j] !== undefined && rowString[j] !== undefined) {
        const raw = rowRaw[j];
        const str = rowString[j];
        
        // 과학적 표기법이 포함된 경우나 긴 숫자인 경우
        if (String(str).includes('E+') || String(str).includes('E-') || 
            (typeof raw === 'number' && raw > 1000000000)) {
          console.log(`컬럼 ${j}: RAW="${raw}" → STRING="${str}" (과학적 표기법 의심)`);
        }
        
        // LTE MUX가 포함된 경우
        if (String(str).toLowerCase().includes('lte') || String(str).toLowerCase().includes('mux')) {
          console.log(`컬럼 ${j}: "${str}" (선번장 의심)`);
        }
      }
    }
  }

  console.log('\n🎯 작업요청일 후보 컬럼들:');
  for (let i = 3; i < Math.min(6, jsonDataRaw.length); i++) {
    const row = jsonDataString[i] || [];
    console.log(`\n${i + 1}행:`);
    
    for (let j = 0; j < 10; j++) {
      const cellValue = String(row[j] || '').trim();
      if (cellValue.includes('월') || cellValue.includes('일') || cellValue.includes('(') || 
          cellValue.includes('내') || cellValue.includes('생성')) {
        console.log(`  컬럼 ${j}: "${cellValue}" (날짜 관련)`);
      }
    }
  }

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}