import XLSX from 'xlsx';

const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('🔍 새로운 간결한 엑셀 구조 분석...\n');

try {
  const workbook = XLSX.readFile(wslPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });
  
  console.log(`📊 총 ${jsonData.length}행 발견`);
  
  // 모든 행 검사해서 헤더 찾기
  let headerRow = -1;
  for (let i = 0; i < Math.min(15, jsonData.length); i++) {
    const row = jsonData[i];
    if (row && row.some(cell => cell && cell.toString().includes('관리번호'))) {
      headerRow = i;
      console.log(`\n📋 헤더 발견! ${i + 1}행:`);
      row.forEach((cell, index) => {
        if (cell && cell.toString().trim()) {
          console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
        }
      });
      break;
    }
  }
  
  if (headerRow === -1) {
    console.log('\n❌ 관리번호 헤더를 찾을 수 없습니다. 처음 10행 내용:');
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      console.log(`${i + 1}행:`, row.filter(cell => cell && cell.toString().trim()));
    }
    
    // 데이터 행들 찾기
    console.log('\n📝 데이터 행들:');
    let dataCount = 0;
    for (let i = headerRow + 1; i < Math.min(headerRow + 10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some(cell => cell && cell.toString().trim())) {
        dataCount++;
        console.log(`\n${i + 1}행 데이터 ${dataCount}:`);
        row.forEach((cell, index) => {
          if (cell && cell.toString().trim()) {
            console.log(`  ${String.fromCharCode(65 + index)}열: "${cell}"`);
          }
        });
        
        if (dataCount >= 3) break; // 처음 3개 데이터만 보기
      }
    }
  
    // 사용자가 요청한 필드와 매핑 추정
    console.log('\n🎯 필드 매핑 추정:');
    const expectedFields = [
      '관리번호', '작업요청일', 'DU측 운용팀', 'RU측 운용팀', '대표 RU_ID', 
      '5G CO-SITE수량', '5G 집중국명', '선번장', 'MUX종류', '서비스구분', 
      'DU ID', 'DU명', '채널카드', '포트'
    ];
    
    if (headerRow >= 0) {
      const headers = jsonData[headerRow];
      headers.forEach((header, index) => {
        if (header && header.toString().trim()) {
          const colLetter = String.fromCharCode(65 + index);
          console.log(`${colLetter}열: "${header}"`);
        }
      });
    }
  }

} catch (error) {
  console.error('❌ 오류:', error.message);
}