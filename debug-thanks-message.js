import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '/home/conon/test-excel-data.xlsx';

console.log('🔍 감사 인사말 위치 찾기...\n');

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

  console.log('📄 전체 데이터에서 감사 인사말 찾기:');
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    const rowText = row.join(' ').toLowerCase();
    
    if (rowText.includes('감사합니다') || 
        rowText.includes('수고하십시오') ||
        rowText.includes('수고하세요') ||
        rowText.includes('고생하셨습니다')) {
      console.log(`🚫 ${i+1}행에서 발견: "${row.join(' ')}"`)
      console.log(`    셀별 내용:`, row.slice(0, 10));
    }
  }
  
  console.log('\n📊 전체 행 수:', jsonData.length);
  console.log('📋 마지막 5행 미리보기:');
  
  for (let i = Math.max(0, jsonData.length - 5); i < jsonData.length; i++) {
    const row = jsonData[i] || [];
    console.log(`${i+1}행:`, row.slice(0, 5).join(' | '));
  }

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}