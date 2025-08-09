const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT 토큰 검증 미들웨어
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '인증 토큰이 필요합니다'
      });
    }

    const token = authHeader.substring(7); // "Bearer " 제거

    // JWT 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 사용자 존재 확인
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: '유효하지 않은 사용자입니다'
      });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      team: decoded.team,
      role: decoded.role
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: '유효하지 않은 토큰입니다'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '토큰이 만료되었습니다'
      });
    }

    console.error('인증 미들웨어 오류:', error);
    return res.status(500).json({
      error: '인증 처리 중 오류가 발생했습니다'
    });
  }
};

// 관리자 권한 확인 미들웨어
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: '관리자 권한이 필요합니다'
    });
  }
  next();
};

// 팀 리더 이상 권한 확인 미들웨어
const teamLeaderMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'team_leader') {
    return res.status(403).json({
      error: '팀 리더 이상의 권한이 필요합니다'
    });
  }
  next();
};

// 같은 팀 또는 관리자 권한 확인 미들웨어
const sameTeamOrAdminMiddleware = (req, res, next) => {
  const { team } = req.params;
  
  if (req.user.role === 'admin' || req.user.team === team) {
    next();
  } else {
    return res.status(403).json({
      error: '해당 팀에 대한 접근 권한이 없습니다'
    });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  teamLeaderMiddleware,
  sameTeamOrAdminMiddleware
};