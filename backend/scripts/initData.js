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

      // 실제 운용팀 리더 계정들
      const teamLeaderPassword = await bcrypt.hash('leader123', 12);
      const teamLeaders = [
        // 기존 샘플 팀 리더들
        { username: 'leader_a', name: 'A팀 리더', team: 'A팀' },
        { username: 'leader_b', name: 'B팀 리더', team: 'B팀' },
        { username: 'leader_c', name: 'C팀 리더', team: 'C팀' },
        
        // 실제 운용팀 리더들  
        { username: 'leader_dongbusan', name: '동부산T 리더', team: '동부산T' },
        { username: 'leader_ulsan', name: '울산T 리더', team: '울산T' },
        { username: 'leader_jungbusan', name: '중부산T 리더', team: '중부산T' },
        { username: 'leader_seobusan', name: '서부산T 리더', team: '서부산T' },
        { username: 'leader_gimhae', name: '김해T 리더', team: '김해T' },
        { username: 'leader_changwon', name: '창원T 리더', team: '창원T' },
        { username: 'leader_jinju', name: '진주T 리더', team: '진주T' },
        { username: 'leader_tongyeong', name: '통영T 리더', team: '통영T' },
        { username: 'leader_subway', name: '지하철T 리더', team: '지하철T' }
      ];

      for (const leader of teamLeaders) {
        await User.create({
          ...leader,
          password: teamLeaderPassword,
          role: 'team_leader',
          email: `${leader.username}@lineguide.com`,
          is_active: true
        });
        console.log(`✅ 사용자 생성: ${leader.username} (${leader.name})`);
      }

      // 실제 운용팀 작업자 계정들
      const workerPassword = await bcrypt.hash('123456', 12);
      const workers = [
        // 기존 샘플 사용자들
        { username: 'worker_a1', name: 'A팀 작업자1', team: 'A팀' },
        { username: 'worker_a2', name: 'A팀 작업자2', team: 'A팀' },
        { username: 'worker_b1', name: 'B팀 작업자1', team: 'B팀' },
        { username: 'worker_b2', name: 'B팀 작업자2', team: 'B팀' },
        { username: 'worker_c1', name: 'C팀 작업자1', team: 'C팀' },
        { username: 'worker_c2', name: 'C팀 작업자2', team: 'C팀' },
        
        // 실제 운용팀 사용자들
        { username: 'ktmos1', name: '동부산T 작업자1', team: '동부산T' },
        { username: 'ktmos2', name: '동부산T 작업자2', team: '동부산T' },
        { username: 'ktul1', name: '울산T 작업자1', team: '울산T' },
        { username: 'ktul2', name: '울산T 작업자2', team: '울산T' },
        { username: 'ktcb1', name: '중부산T 작업자1', team: '중부산T' },
        { username: 'ktcb2', name: '중부산T 작업자2', team: '중부산T' },
        { username: 'ktsb1', name: '서부산T 작업자1', team: '서부산T' },
        { username: 'ktsb2', name: '서부산T 작업자2', team: '서부산T' },
        { username: 'ktkh1', name: '김해T 작업자1', team: '김해T' },
        { username: 'ktkh2', name: '김해T 작업자2', team: '김해T' },
        { username: 'ktcw1', name: '창원T 작업자1', team: '창원T' },
        { username: 'ktcw2', name: '창원T 작업자2', team: '창원T' },
        { username: 'ktjj1', name: '진주T 작업자1', team: '진주T' },
        { username: 'ktjj2', name: '진주T 작업자2', team: '진주T' },
        { username: 'ktty1', name: '통영T 작업자1', team: '통영T' },
        { username: 'ktty2', name: '통영T 작업자2', team: '통영T' },
        { username: 'ktsub1', name: '지하철T 작업자1', team: '지하철T' },
        { username: 'ktsub2', name: '지하철T 작업자2', team: '지하철T' }
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
    
  } catch (error) {
    console.error('❌ 기본 사용자 데이터 생성 실패:', error);
  }
};

module.exports = { initializeDefaultUsers };