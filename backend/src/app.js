const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// 환경변수 로드
dotenv.config();

// 데이터베이스 연결
const { sequelize, testConnection } = require('../config/database');

// Express 앱 생성
const app = express();
const server = createServer(app);

// 개발/운영별 CORS 허용 도메인 설정
const isDev = process.env.NODE_ENV !== 'production'

const allowedOriginsList = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'https://conon21154.github.io'  // GitHub Pages 도메인
]

const isAllowedOrigin = (origin) => {
  if (!origin) return true
  if (allowedOriginsList.includes(origin)) return true
  // 192.168.x.x:5173~5177 허용 (개발용)
  if (/^http:\/\/192\.168\.[0-9]{1,3}\.[0-9]{1,3}:517[3-7]$/.test(origin)) return true
  return false
}

// Socket.IO 설정
const io = new Server(server, {
  cors: isDev
    ? { origin: '*', methods: ['GET', 'POST'] } // 개발에서는 전체 허용
    : { origin: allowedOriginsList, methods: ['GET', 'POST'], credentials: true }
});

// 미들웨어 설정
app.use(
  cors({
    origin: (origin, callback) => {
      if (isDev || isAllowedOrigin(origin)) {
        callback(null, true)
      } else {
        callback(new Error('CORS: Origin not allowed'))
      }
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (업로드된 파일용)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 라우터 import
const authRoutes = require('../routes/auth');
const workOrderRoutes = require('../routes/workOrders');
const teamRoutes = require('../routes/teams');

// 라우터 사용
app.use('/api/auth', authRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/teams', teamRoutes);

// 기본 라우터
app.get('/', (req, res) => {
  res.json({
    message: 'LineGuide 3 API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// 헬스 체크 엔드포인트 (Render.com용)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
});

// 404 에러 처리
app.use('*', (req, res) => {
  res.status(404).json({
    error: '요청한 API 엔드포인트를 찾을 수 없습니다'
  });
});

// 전역 에러 처리
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? '서버 내부 오류가 발생했습니다' 
      : err.message
  });
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log('클라이언트 연결:', socket.id);

  // 작업지시 실시간 업데이트
  socket.on('join-team', (team) => {
    socket.join(`team-${team}`);
    console.log(`클라이언트 ${socket.id}가 팀 ${team}에 참가`);
  });

  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제:', socket.id);
  });
});

// 서버 시작
const PORT = 5000;

const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    await testConnection();

    // 데이터베이스 동기화 (안전 모드: alter 비활성화)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ 데이터베이스 초기화 완료 (dev, alter:false)');
    } else {
      await sequelize.sync({ alter: false });
      console.log('✅ 데이터베이스 동기화 완료 (alter:false)');
    }

    // FieldResponse 테이블은 개별적으로 스키마 동기화 (alter 허용)
    try {
      const { FieldResponse } = require('../models');
      await FieldResponse.sync({ alter: true });
      console.log('✅ FieldResponse 테이블 동기화 완료 (alter:true)');
    } catch (frErr) {
      console.warn('⚠️ FieldResponse 테이블 동기화 실패:', frErr?.message || frErr);
    }

    // 서버 시작
    server.listen(PORT, () => {
      console.log(`🚀 LineGuide 3 API 서버가 포트 ${PORT}에서 실행 중입니다`);
      console.log(`📡 Socket.IO 서버도 함께 실행 중입니다`);
    });

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// 서버 시작
startServer();

// Socket.IO 인스턴스를 다른 모듈에서 사용할 수 있도록 export
module.exports = { app, io };