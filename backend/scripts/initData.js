const bcrypt = require('bcryptjs');
const { User } = require('../models');

// 초기 사용자 데이터 생성
const initializeDefaultUsers = async () => {
  try {
    console.log('🔍 기본 사용자 데이터 확인 중...');
    
    // admin 사용자 확인
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      console.log('👤 기본 사용자 생성 중...');
      
      // 기본 사용자들 생성
      const defaultUsers = [
        {
          username: 'admin',
          password: await bcrypt.hash('admin123', 10),
          name: '시스템 관리자',
          email: 'admin@lineguide.com',
          role: 'admin',
          team: null,
          isActive: true
        },
        {
          username: 'leader_a',
          password: await bcrypt.hash('leader123', 10),
          name: 'A팀 리더',
          email: 'leader_a@lineguide.com',
          role: 'team_leader',
          team: 'A팀',
          isActive: true
        },
        {
          username: 'worker_a1',
          password: await bcrypt.hash('worker123', 10),
          name: 'A팀 작업자1',
          email: 'worker_a1@lineguide.com',
          role: 'worker',
          team: 'A팀',
          isActive: true
        }
      ];

      for (const userData of defaultUsers) {
        await User.create(userData);
        console.log(`✅ 사용자 생성: ${userData.username} (${userData.name})`);
      }
      
      console.log('🎉 기본 사용자 데이터 생성 완료!');
    } else {
      console.log('✅ 기본 사용자 데이터가 이미 존재합니다.');
    }
    
  } catch (error) {
    console.error('❌ 기본 사용자 데이터 생성 실패:', error);
  }
};

module.exports = { initializeDefaultUsers };