-- LineGuide 3 데이터베이스 생성 스크립트

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS lineguide 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 (필요시)
-- CREATE USER 'lineguide_user'@'localhost' IDENTIFIED BY 'your_password';
-- GRANT ALL PRIVILEGES ON lineguide.* TO 'lineguide_user'@'localhost';
-- FLUSH PRIVILEGES;

-- 데이터베이스 사용
USE lineguide;

-- 테이블 생성은 Sequelize 모델과 마이그레이션으로 처리됩니다