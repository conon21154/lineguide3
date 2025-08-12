const bcrypt = require('bcryptjs');
const { User, WorkOrder } = require('../models');

// 초기 사용자 데이터 생성
const initializeDefaultUsers = async () => {
  try {
    console.log('🔍 기본 사용자 데이터 확인 중...');
    
    // admin 사용자 확인
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      console.log('👤 기본 사용자 생성 중...');
      
      // 관리자 계정
      const adminPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        username: 'admin',
        password: adminPassword,
        name: '시스템 관리자',
        role: 'admin',
        email: 'admin@lineguide.com',
        is_active: true
      });
      console.log('✅ 사용자 생성: admin (시스템 관리자)');

      // 운용팀 현장 작업자들 (ktmos1~9)
      const workerPassword = await bcrypt.hash('123456', 12);
      const workers = [
        { username: 'ktmos1', name: '울산T', team: '울산T' },
        { username: 'ktmos2', name: '동부산T', team: '동부산T' },
        { username: 'ktmos3', name: '중부산T', team: '중부산T' },
        { username: 'ktmos4', name: '서부산T', team: '서부산T' },
        { username: 'ktmos5', name: '김해T', team: '김해T' },
        { username: 'ktmos6', name: '창원T', team: '창원T' },
        { username: 'ktmos7', name: '진주T', team: '진주T' },
        { username: 'ktmos8', name: '통영T', team: '통영T' },
        { username: 'ktmos9', name: '지하철T', team: '지하철T' }
      ];

      for (const worker of workers) {
        await User.create({
          ...worker,
          password: workerPassword,
          role: 'worker',
          email: `${worker.username}@lineguide.com`,
          is_active: true
        });
        console.log(`✅ 사용자 생성: ${worker.username} (${worker.name})`);
      }
      
      console.log('🎉 기본 사용자 데이터 생성 완료!');
    } else {
      console.log('✅ 기본 사용자 데이터가 이미 존재합니다.');
    }

    // 작업지시 샘플 데이터 생성 (사용자 존재 여부와 관계없이)
    console.log('📋 각 팀별 샘플 작업지시 생성 중...');
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (adminUser) {
      const sampleWorkOrders = [
        { managementNumber: 'WO-2024-001_DU측', team: '울산T', workType: 'DU측', operationTeam: '울산T' },
        { managementNumber: 'WO-2024-002_RU측', team: '울산T', workType: 'RU측', operationTeam: '울산T' },
        { managementNumber: 'WO-2024-003_DU측', team: '동부산T', workType: 'DU측', operationTeam: '동부산T' },
        { managementNumber: 'WO-2024-004_RU측', team: '동부산T', workType: 'RU측', operationTeam: '동부산T' },
        { managementNumber: 'WO-2024-005_DU측', team: '중부산T', workType: 'DU측', operationTeam: '중부산T' },
        { managementNumber: 'WO-2024-006_RU측', team: '중부산T', workType: 'RU측', operationTeam: '중부산T' },
        { managementNumber: 'WO-2024-007_DU측', team: '서부산T', workType: 'DU측', operationTeam: '서부산T' },
        { managementNumber: 'WO-2024-008_RU측', team: '서부산T', workType: 'RU측', operationTeam: '서부산T' },
        { managementNumber: 'WO-2024-009_DU측', team: '김해T', workType: 'DU측', operationTeam: '김해T' },
        { managementNumber: 'WO-2024-010_RU측', team: '김해T', workType: 'RU측', operationTeam: '김해T' },
        { managementNumber: 'WO-2024-011_DU측', team: '창원T', workType: 'DU측', operationTeam: '창원T' },
        { managementNumber: 'WO-2024-012_RU측', team: '창원T', workType: 'RU측', operationTeam: '창원T' },
        { managementNumber: 'WO-2024-013_DU측', team: '진주T', workType: 'DU측', operationTeam: '진주T' },
        { managementNumber: 'WO-2024-014_RU측', team: '진주T', workType: 'RU측', operationTeam: '진주T' },
        { managementNumber: 'WO-2024-015_DU측', team: '통영T', workType: 'DU측', operationTeam: '통영T' },
        { managementNumber: 'WO-2024-016_RU측', team: '통영T', workType: 'RU측', operationTeam: '통영T' },
        { managementNumber: 'WO-2024-017_DU측', team: '지하철T', workType: 'DU측', operationTeam: '지하철T' },
        { managementNumber: 'WO-2024-018_RU측', team: '지하철T', workType: 'RU측', operationTeam: '지하철T' }
      ];

      const { WorkOrder } = require('../models');
      for (const wo of sampleWorkOrders) {
        await WorkOrder.findOrCreate({
          where: { managementNumber: wo.managementNumber },
          defaults: {
            ...wo,
            requestDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            serviceLocation: `${wo.team} 관할구역`,
            created_by: adminUser.id
          }
        });
      }
      console.log('✅ 샘플 작업지시 생성 완료');
    }
    
  } catch (error) {
    console.error('❌ 기본 사용자 데이터 생성 실패:', error);
  }
};

module.exports = { initializeDefaultUsers };