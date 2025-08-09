#!/usr/bin/env node

const { sequelize } = require('../config/database');
const { seedDatabase } = require('../utils/seedData');

// 데이터베이스 설정 및 초기 데이터 생성 스크립트
const setupDatabase = async () => {
  try {
    console.log('🚀 LineGuide 3 데이터베이스 설정을 시작합니다...');
    
    // 데이터베이스 연결 테스트
    console.log('📡 데이터베이스 연결을 확인하는 중...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');

    // 테이블 생성/동기화
    console.log('🔧 데이터베이스 테이블을 생성하는 중...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ 데이터베이스 테이블 생성/업데이트 완료');

    // 초기 데이터 생성
    console.log('📝 초기 데이터를 생성하는 중...');
    await seedDatabase();

    console.log('🎉 LineGuide 3 데이터베이스 설정이 완료되었습니다!');
    console.log('');
    console.log('📋 생성된 기본 계정:');
    console.log('  관리자: admin / admin123');
    console.log('  A팀 리더: leader_a / leader123');
    console.log('  B팀 리더: leader_b / leader123');
    console.log('  C팀 리더: leader_c / leader123');
    console.log('  작업자: worker_a1, worker_a2, worker_b1, worker_b2, worker_c1, worker_c2 / worker123');
    console.log('');
    console.log('🚀 이제 "npm run dev"로 서버를 시작할 수 있습니다!');

    process.exit(0);

  } catch (error) {
    console.error('❌ 데이터베이스 설정 실패:', error.message);
    console.log('');
    console.log('🔍 문제 해결 방법:');
    console.log('1. MySQL 서버가 실행 중인지 확인하세요');
    console.log('2. .env 파일의 데이터베이스 설정을 확인하세요');
    console.log('3. 데이터베이스가 생성되어 있는지 확인하세요');
    console.log('   mysql -u root -p');
    console.log('   CREATE DATABASE lineguide CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    
    process.exit(1);
  }
};

// 스크립트가 직접 실행된 경우에만 실행
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };