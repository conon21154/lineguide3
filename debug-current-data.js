// 현재 localStorage에 저장된 데이터 확인
const STORAGE_KEY = 'lineguide_work_orders';

console.log('🔍 현재 저장된 작업지시 데이터 분석...\n');

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    console.log('❌ localStorage에 저장된 데이터가 없습니다.');
    process.exit(1);
  }
  
  const workOrders = JSON.parse(stored);
  console.log(`📊 총 ${workOrders.length}개의 작업지시 발견\n`);
  
  // 처음 3개 데이터의 관리번호와 작업요청일 확인
  workOrders.slice(0, 3).forEach((order, index) => {
    console.log(`${index + 1}번째 작업지시:`);
    console.log(`  📝 관리번호: "${order.managementNumber}"`);
    console.log(`  📅 작업요청일: "${order.requestDate}"`);
    console.log(`  👥 운용팀: "${order.operationTeam}"`);
    console.log(`  🏢 5G 집중국: "${order.concentratorName5G}"`);
    console.log('');
  });
  
  // 관리번호와 작업요청일이 합쳐진 케이스 찾기
  const problematicOrders = workOrders.filter(order => {
    const mgmtNum = order.managementNumber || '';
    const reqDate = order.requestDate || '';
    
    // 관리번호에 날짜 정보가 포함되어 있는지 확인
    return mgmtNum.includes('월') || mgmtNum.includes('일') || 
           reqDate.includes('25_') || reqDate.includes('_');
  });
  
  if (problematicOrders.length > 0) {
    console.log(`⚠️ 데이터가 섞인 것으로 보이는 ${problematicOrders.length}개 발견:`);
    problematicOrders.slice(0, 3).forEach((order, index) => {
      console.log(`  ${index + 1}. 관리번호: "${order.managementNumber}"`);
      console.log(`     작업요청일: "${order.requestDate}"`);
      console.log('');
    });
  } else {
    console.log('✅ 데이터 분리가 올바르게 되어 있습니다.');
  }
  
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}