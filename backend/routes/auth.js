const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 로그인 요청:', { username, passwordLength: password?.length });

    // 입력 검증
    if (!username || !password) {
      console.log('❌ 입력 검증 실패: username 또는 password 누락');
      return res.status(400).json({
        error: '사용자명과 비밀번호를 입력해주세요'
      });
    }

    // 사용자 찾기
    console.log('🔍 사용자 검색 중:', username);
    const user = await User.findOne({ where: { username } });
    console.log('👤 사용자 검색 결과:', user ? `찾음 (ID: ${user.id})` : '없음');
    
    if (!user) {
      console.log('❌ 사용자 없음:', username);
      return res.status(401).json({
        error: '잘못된 사용자명 또는 비밀번호입니다'
      });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: '잘못된 사용자명 또는 비밀번호입니다'
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        team: user.team,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        team: user.team,
        role: user.role
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      error: '로그인 중 오류가 발생했습니다'
    });
  }
});

// 사용자 정보 조회
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        error: '사용자를 찾을 수 없습니다'
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        team: user.team,
        role: user.role
      }
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      error: '사용자 정보 조회 중 오류가 발생했습니다'
    });
  }
});

// 토큰 갱신
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: '사용자를 찾을 수 없습니다'
      });
    }

    // 새 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        team: user.team,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token });

  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    res.status(500).json({
      error: '토큰 갱신 중 오류가 발생했습니다'
    });
  }
});

// 비밀번호 변경
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: '현재 비밀번호와 새 비밀번호를 입력해주세요'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: '새 비밀번호는 최소 6자 이상이어야 합니다'
      });
    }

    // 사용자 찾기
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: '사용자를 찾을 수 없습니다'
      });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: '현재 비밀번호가 일치하지 않습니다'
      });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 비밀번호 업데이트
    await user.update({ password: hashedPassword });

    res.json({
      message: '비밀번호가 성공적으로 변경되었습니다'
    });

  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({
      error: '비밀번호 변경 중 오류가 발생했습니다'
    });
  }
});

// 로그아웃
router.post('/logout', authMiddleware, (req, res) => {
  // JWT는 stateless이므로 클라이언트에서 토큰을 제거하는 것으로 충분
  res.json({
    message: '성공적으로 로그아웃되었습니다'
  });
});

module.exports = router;