const { Sequelize } = require('sequelize');
require('dotenv').config();

// 환경에 따른 데이터베이스 설정
let sequelize;

if (process.env.NODE_ENV === 'production' && !process.env.DB_HOST) {
  // 배포환경: SQLite 사용
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './data/lineguide.db',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  });
  console.log('🗄️ SQLite 데이터베이스 모드로 실행 중...');
} else {
  // 개발환경: MySQL 사용
  sequelize = new Sequelize(
    process.env.DB_NAME || 'lineguide',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '1234',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      }
    }
  );
  console.log('🗄️ MySQL 데이터베이스 모드로 실행 중...');
}

// 데이터베이스 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    const dbType = sequelize.getDialect();
    console.log(`✅ ${dbType.toUpperCase()} 데이터베이스 연결 성공`);
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection
};