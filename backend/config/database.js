const { Sequelize } = require('sequelize');
require('dotenv').config();

// MySQL 연결 설정
const sequelize = new Sequelize(
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

// 데이터베이스 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL 데이터베이스 연결 성공');
  } catch (error) {
    console.error('❌ MySQL 데이터베이스 연결 실패:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection
};