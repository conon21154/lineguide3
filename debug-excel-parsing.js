import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '/home/conon/test-excel-data.xlsx';

console.log('🔍 엑셀 파일 상세 분석 - 관리번호와 작업요청일 분리 확인\n');

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

  console.log('📋 엑셀 구조 상세 분석:');
  
  // 헤더 위치 확인 (2행)
  const row2 = jsonData[1] || [];
  console.log('2행 헤더 전체:', row2.slice(0, 15).map((h, i) => `${i}:${h}`).join(' | '));
  
  // 관리번호와 작업요청일 컬럼 찾기
  let managementCol = -1;
  let requestDateCol = -1;
  
  for (let i = 0; i < row2.length; i++) {
    const header = String(row2[i] || '').trim().toLowerCase();
    if (header.includes('관리번호')) {
      managementCol = i;
      console.log(`📍 관리번호 컬럼: ${i}번째 (${row2[i]})`);
    }
    if (header.includes('작업요청일') || header.includes('요청일')) {
      requestDateCol = i;
      console.log(`📍 작업요청일 컬럼: ${i}번째 (${row2[i]})`);
    }
  }
  
  console.log('\n📄 실제 데이터 분석 (처음 5행):');
  
  for (let i = 2; i < Math.min(7, jsonData.length); i++) {
    const row = jsonData[i] || [];
    console.log(`\n${i+1}행 데이터:`);
    
    if (managementCol >= 0) {
      const mgmtValue = String(row[managementCol] || '').trim();
      console.log(`  관리번호 (컬럼 ${managementCol}): "${mgmtValue}"`);
      console.log(`  관리번호 길이: ${mgmtValue.length}자`);
      console.log(`  관리번호에 월/일 포함: ${mgmtValue.includes('월') || mgmtValue.includes('일')}`);
    }
    
    if (requestDateCol >= 0) {
      const dateValue = String(row[requestDateCol] || '').trim();
      console.log(`  작업요청일 (컬럼 ${requestDateCol}): "${dateValue}"`);
      console.log(`  작업요청일 길이: ${dateValue.length}자`);
      console.log(`  작업요청일에 번호 포함: ${dateValue.includes('25_') || dateValue.includes('_')}`);
    }
    
    // 주변 컬럼들도 확인
    console.log(`  전체 행 데이터: [${row.slice(0, 8).map(cell => `"${cell}"`).join(', ')}]`);
  }
  
  // 실제 convertToWorkOrderFormat 함수 테스트
  console.log('\n🧪 변환 함수 테스트:');
  
  const testRow = jsonData[2] || [];
  const testData = {
    관리번호: String(testRow[managementCol] || '').trim(),
    작업요청일: String(testRow[requestDateCol] || '').trim(),
    DU측_운용팀: String(testRow[4] || '').trim(), // 추정
  };
  
  console.log('변환 전 데이터:', testData);
  
  const converted = {
    managementNumber: testData.관리번호,
    requestDate: testData.작업요청일,
    operationTeam: testData.DU측_운용팀,
  };
  
  console.log('변환 후 데이터:', converted);

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}