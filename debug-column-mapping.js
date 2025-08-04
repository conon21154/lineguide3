import XLSX from 'xlsx';
import fs from 'fs';

// 실제 엑셀 파일 경로 (사용자가 업로드한 파일 경로로 수정 필요)
const excelPath = '/home/conon/test-excel-data.xlsx';

console.log('🔍 엑셀 파일 칼럼 매핑 디버깅...\n');

try {
  if (!fs.existsSync(excelPath)) {
    console.log('❌ 엑셀 파일을 찾을 수 없습니다:', excelPath);
    console.log('💡 실제 업로드된 파일 경로를 확인해주세요.');
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  console.log('📋 헤더 구조 분석:');
  console.log('1행:', jsonData[0]?.slice(0, 20).join(' | '));
  console.log('2행:', jsonData[1]?.slice(0, 20).join(' | '));
  console.log('3행:', jsonData[2]?.slice(0, 20).join(' | '));
  console.log('4행 (첫 데이터):', jsonData[3]?.slice(0, 20).join(' | '));
  
  console.log('\n🔍 각 칼럼 상세 분석:');
  const maxCols = Math.max(
    jsonData[0]?.length || 0,
    jsonData[1]?.length || 0, 
    jsonData[2]?.length || 0,
    30
  );
  
  for (let i = 0; i < Math.min(maxCols, 30); i++) {
    const col1 = String(jsonData[0]?.[i] || '').trim();
    const col2 = String(jsonData[1]?.[i] || '').trim();
    const col3 = String(jsonData[2]?.[i] || '').trim();
    const combined = `${col2} ${col3}`.trim();
    
    console.log(`${String.fromCharCode(65 + i)}열(${i}): "${col2}" | "${col3}" | 합성: "${combined}"`);
    
    // 선번장 관련 패턴 체크
    if (combined.toLowerCase().includes('선번장') || 
        combined.toLowerCase().includes('lte') ||
        combined.toLowerCase().includes('mux') ||
        combined.toLowerCase().includes('회선') ||
        combined.toLowerCase().includes('국간망')) {
      console.log(`   🎯 선번장 후보 발견!`);
    }
    
    // DU측 운용팀 관련 패턴 체크
    if (combined.toLowerCase().includes('du') && 
        (combined.toLowerCase().includes('운용') || combined.toLowerCase().includes('팀'))) {
      console.log(`   🎯 DU측 운용팀 후보 발견!`);
    }
  }
  
  console.log('\n📄 첫 5행 데이터 미리보기:');
  for (let i = 3; i < Math.min(8, jsonData.length); i++) {
    console.log(`${i+1}행:`, jsonData[i]?.slice(0, 10).map(cell => 
      String(cell || '').length > 20 ? String(cell).substring(0, 20) + '...' : cell
    ).join(' | '));
  }

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}