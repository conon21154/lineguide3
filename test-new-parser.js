import XLSX from 'xlsx';
import fs from 'fs';

const wslPath = '/mnt/c/Users/conon/Desktop/작업지시.xlsx';

console.log('🧪 새로운 파서 테스트 시작...\n');

try {
  const workbook = XLSX.readFile(wslPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  });

  const OPERATION_TEAMS = ['운용1팀', '운용2팀', '운용3팀', '운용4팀', '운용5팀', '기타'];

  function normalizeOperationTeam(value) {
    const normalized = value.trim();
    if (OPERATION_TEAMS.includes(normalized)) {
      return normalized;
    }
    return '기타';
  }

  function parseWorkOrder5G(row, rowIndex) {
    return {
      managementNumber: `5G_${Date.now()}_${rowIndex}`,
      requestDate: String(row[0] || ''),
      operationTeam: normalizeOperationTeam(String(row[1] || '')),
      concentratorName5G: String(row[4] || ''),
      equipmentType: String(row[5] || ''),
      equipmentName: String(row[7] || ''),
      category: String(row[12] || ''),
      serviceType: String(row[3] || ''),
      duId: String(row[14] || ''),
      duName: String(row[15] || ''),
      channelCard: String(row[16] || ''),
      port: String(row[17] || ''),
      lineNumber: String(row[11] || '')
    };
  }

  function parseWorkOrderMUX(row) {
    return {
      managementNumber: String(row[0] || ''),
      requestDate: String(row[2] || ''),
      operationTeam: normalizeOperationTeam(String(row[3] || '')),
      concentratorName5G: String(row[11] || ''),
      equipmentType: String(row[7] || ''),
      equipmentName: String(row[9] || ''),
      category: String(row[16] || ''),
      serviceType: String(row[13] || ''),
      duId: String(row[14] || ''),
      duName: String(row[15] || ''),
      channelCard: String(row[17] || ''),
      port: String(row[18] || ''),
      lineNumber: String(row[15] || '')
    };
  }

  console.log(`📊 Excel 파일 로드: ${jsonData.length}행`);
  
  const parsedData = [];
  const errors = [];
  
  // 5G 개통 정보 섹션 파싱 (10~13행)
  console.log('📝 5G 개통 정보 섹션 파싱...');
  for (let i = 9; i < 13; i++) {
    const row = jsonData[i];
    if (!row || row.every(cell => !cell)) continue;
    
    try {
      const workOrder = parseWorkOrder5G(row, i);
      
      if (workOrder.requestDate && workOrder.operationTeam && workOrder.equipmentName) {
        parsedData.push(workOrder);
        console.log(`  ✅ ${i + 1}행: ${workOrder.operationTeam} - ${workOrder.equipmentName}`);
        console.log(`    관리번호: ${workOrder.managementNumber}`);
        console.log(`    5G 집중국: ${workOrder.concentratorName5G}`);
        console.log(`    DU: ${workOrder.duId} - ${workOrder.duName}`);
      } else {
        console.log(`  ⚠️ ${i + 1}행: 필수 필드 부족으로 건너뜀`);
      }
    } catch (error) {
      errors.push(`${i + 1}행: 5G 섹션 파싱 오류 - ${error}`);
    }
  }
  
  // MUX 설치 정보 섹션 파싱 (18~21행)
  console.log('\n📝 MUX 설치 정보 섹션 파싱...');
  for (let i = 17; i < 21; i++) {
    const row = jsonData[i];
    if (!row || row.every(cell => !cell)) continue;
    
    try {
      const workOrder = parseWorkOrderMUX(row);
      
      if (workOrder.managementNumber && workOrder.requestDate && workOrder.operationTeam) {
        parsedData.push(workOrder);
        console.log(`  ✅ ${i + 1}행: ${workOrder.managementNumber} - ${workOrder.operationTeam}`);
        console.log(`    장비명: ${workOrder.equipmentName}`);
        console.log(`    5G 집중국: ${workOrder.concentratorName5G}`);
        console.log(`    서비스구분: ${workOrder.serviceType}`);
      } else {
        console.log(`  ⚠️ ${i + 1}행: 필수 필드 부족으로 건너뜀`);
      }
    } catch (error) {
      errors.push(`${i + 1}행: MUX 섹션 파싱 오류 - ${error}`);
    }
  }
  
  console.log(`\n🎯 총 ${parsedData.length}개 작업지시 파싱 완료`);
  
  if (errors.length > 0) {
    console.log('\n❌ 오류 목록:');
    errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n📋 파싱된 작업지시 요약:');
  parsedData.forEach((order, index) => {
    console.log(`${index + 1}. [${order.managementNumber}] ${order.operationTeam} - ${order.equipmentName}`);
  });

} catch (error) {
  console.error('❌ 오류:', error.message);
}