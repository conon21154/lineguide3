const bcrypt = require('bcryptjs');
const { User, WorkOrder } = require('../models');

// 초기 사용자 데이터 생성
const createInitialUsers = async () => {
  try {
    // 관리자 계정 생성
    const adminPassword = await bcrypt.hash('admin123', 12);
    await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        username: 'admin',
        password: adminPassword,
        name: '시스템 관리자',
        role: 'admin',
        email: 'admin@lineguide.com',
        is_active: true
      }
    });

    // 샘플 팀 리더 계정들
    const teamLeaderPassword = await bcrypt.hash('leader123', 12);
    
    const teamLeaders = [
      { username: 'leader_a', name: 'A팀 리더', team: 'A팀' },
      { username: 'leader_b', name: 'B팀 리더', team: 'B팀' },
      { username: 'leader_c', name: 'C팀 리더', team: 'C팀' }
    ];

    for (const leader of teamLeaders) {
      await User.findOrCreate({
        where: { username: leader.username },
        defaults: {
          ...leader,
          password: teamLeaderPassword,
          role: 'team_leader',
          email: `${leader.username}@lineguide.com`,
          is_active: true
        }
      });
    }

    // 샘플 작업자 계정들
    const workerPassword = await bcrypt.hash('worker123', 12);
    
    const workers = [
      { username: 'worker_a1', name: 'A팀 작업자1', team: 'A팀' },
      { username: 'worker_a2', name: 'A팀 작업자2', team: 'A팀' },
      { username: 'worker_b1', name: 'B팀 작업자1', team: 'B팀' },
      { username: 'worker_b2', name: 'B팀 작업자2', team: 'B팀' },
      { username: 'worker_c1', name: 'C팀 작업자1', team: 'C팀' },
      { username: 'worker_c2', name: 'C팀 작업자2', team: 'C팀' }
    ];

    for (const worker of workers) {
      await User.findOrCreate({
        where: { username: worker.username },
        defaults: {
          ...worker,
          password: workerPassword,
          role: 'worker',
          email: `${worker.username}@lineguide.com`,
          is_active: true
        }
      });
    }

    console.log('✅ 초기 사용자 데이터 생성 완료');

  } catch (error) {
    console.error('❌ 초기 사용자 데이터 생성 실패:', error);
  }
};

// 샘플 작업지시 데이터 생성
const createSampleWorkOrders = async () => {
  try {
    // 관리자 사용자 ID 가져오기
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminUser) {
      console.log('관리자 사용자가 없어 샘플 작업지시를 생성하지 않습니다.');
      return;
    }

    const sampleWorkOrders = [
      {
        customer_name: '김철수',
        service_location: '서울시 강남구 테헤란로 123',
        work_content: '인터넷 설치 및 설정',
        team: 'A팀',
        priority: 'normal',
        status: 'pending',
        created_by: adminUser.id,
        mux_info: {
          mux_id: 'MUX001',
          location: '강남구 센터',
          port: 'P-01'
        }
      },
      {
        customer_name: '이영희',
        service_location: '서울시 서초구 반포대로 456',
        work_content: '인터넷 속도 개선',
        team: 'A팀',
        priority: 'high',
        status: 'in_progress',
        created_by: adminUser.id,
        mux_info: {
          mux_id: 'MUX002',
          location: '서초구 센터',
          port: 'P-02'
        }
      },
      {
        customer_name: '박민수',
        service_location: '서울시 송파구 올림픽로 789',
        work_content: 'IPTV 추가 설치',
        team: 'B팀',
        priority: 'normal',
        status: 'completed',
        created_by: adminUser.id,
        completed_at: new Date(),
        response_notes: '정상적으로 설치 완료되었습니다.',
        mux_info: {
          mux_id: 'MUX003',
          location: '송파구 센터',
          port: 'P-03'
        }
      },
      {
        customer_name: '정수현',
        service_location: '서울시 마포구 월드컵로 321',
        work_content: '회선 장애 점검',
        team: 'B팀',
        priority: 'urgent',
        status: 'pending',
        created_by: adminUser.id,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 내일까지
        mux_info: {
          mux_id: 'MUX004',
          location: '마포구 센터',
          port: 'P-04'
        }
      },
      {
        customer_name: '최준호',
        service_location: '서울시 용산구 한강대로 654',
        work_content: '무선 공유기 교체',
        team: 'C팀',
        priority: 'normal',
        status: 'pending',
        created_by: adminUser.id,
        mux_info: {
          mux_id: 'MUX005',
          location: '용산구 센터',
          port: 'P-05'
        }
      }
    ];

    for (const workOrder of sampleWorkOrders) {
      await WorkOrder.findOrCreate({
        where: { 
          customer_name: workOrder.customer_name,
          service_location: workOrder.service_location 
        },
        defaults: workOrder
      });
    }

    console.log('✅ 샘플 작업지시 데이터 생성 완료');

  } catch (error) {
    console.error('❌ 샘플 작업지시 데이터 생성 실패:', error);
  }
};

// 모든 초기 데이터 생성
const seedDatabase = async () => {
  try {
    console.log('📡 초기 데이터 생성을 시작합니다...');
    
    await createInitialUsers();
    await createSampleWorkOrders();
    
    console.log('✅ 모든 초기 데이터 생성이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 초기 데이터 생성 중 오류 발생:', error);
  }
};

module.exports = {
  createInitialUsers,
  createSampleWorkOrders,
  seedDatabase
};