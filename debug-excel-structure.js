import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

// 엑셀 구조 디버깅
function debugExcelStructure() {
  console.log('🔍 엑셀 파일 구조 상세 분석');
  
  try {
    const fileBuffer = readFileSync('test-excel-data.xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false 
    });
    
    console.log(`📊 총 ${jsonData.length}행`);
    
    // 각 행 상세 분석
    jsonData.forEach((row, index) => {
      console.log(`\n${index + 1}행 (index ${index}):`);
      if (row && row.length > 0) {
        console.log(`  길이: ${row.length}`);
        console.log(`  A열 (index 0): "${row[0] || ''}"`);
        console.log(`  B열 (index 1): "${row[1] || ''}"`);
        console.log(`  C열 (index 2): "${row[2] || ''}"`);
        console.log(`  D열 (index 3): "${row[3] || ''}"`);
        console.log(`  E열 (index 4): "${row[4] || ''}"`);
        console.log(`  첫 10개 셀:`, row.slice(0, 10));
      } else {
        console.log('  빈 행');
      }
    });
    
    return jsonData;
  } catch (error) {
    console.log(`❌ 오류: ${error}`);
  }
}

debugExcelStructure();