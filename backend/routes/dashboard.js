const express = require('express');
const { Op } = require('sequelize');
const { ResponseNote, WorkOrder } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 현장 회신 현황 API - 대시보드 전용
router.get('/field-replies', authMiddleware, async (req, res) => {
  try {
    // Cache-Control: no-store 헤더 설정
    res.set('Cache-Control', 'no-store');

    // 소프트삭제 제외, 중복 제거를 위한 최신 데이터만 선택
    // work_order_id + side + COALESCE(ru_id,'') 조합의 최신 1건만 집계
    const latestResponseNotes = await ResponseNote.findAll({
      where: {
        deletedAt: null // 소프트삭제 제외
      },
      order: [
        ['work_order_id', 'ASC'],
        ['side', 'ASC'], 
        ['ru_id', 'ASC'],
        ['created_at', 'DESC'] // 최신순
      ],
      raw: true
    });

    // 중복 제거: work_order_id + side + ru_id 조합의 최신 1건만 유지
    const uniqueResponseNotes = [];
    const seenKeys = new Set();

    for (const note of latestResponseNotes) {
      const key = `${note.work_order_id}-${note.side}-${note.ru_id || ''}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueResponseNotes.push(note);
      }
    }

    // 통계 계산
    const totals = {
      all: uniqueResponseNotes.length,
      unconfirmed: uniqueResponseNotes.filter(note => !note.confirmed_at).length,
      confirmed: uniqueResponseNotes.filter(note => note.confirmed_at).length,
      last24h: uniqueResponseNotes.filter(note => {
        const createdAt = new Date(note.created_at);
        const now = new Date();
        const diffHours = (now - createdAt) / (1000 * 60 * 60);
        return diffHours <= 24;
      }).length
    };

    // 최신 20건 (중복 제거 기준)
    const recent = uniqueResponseNotes
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map(note => ({
        id: note.id,
        workOrderId: note.work_order_id,
        side: note.side,
        ruId: note.ru_id,
        content: note.content,
        confirmedAt: note.confirmed_at ? new Date(note.confirmed_at).toISOString() : null,
        createdAt: note.created_at ? new Date(note.created_at).toISOString() : null,
        createdBy: note.created_by
      }));

    res.json({
      success: true,
      data: {
        totals,
        recent
      }
    });

  } catch (error) {
    console.error('현장 회신 현황 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '현장 회신 현황 조회 중 오류가 발생했습니다'
    });
  }
});

// 현장 회신 확인 상태 토글 API
router.patch('/field-replies/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed } = req.body;

    // Cache-Control: no-store 헤더 설정  
    res.set('Cache-Control', 'no-store');

    const responseNote = await ResponseNote.findOne({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!responseNote) {
      return res.status(404).json({
        success: false,
        error: '현장 회신을 찾을 수 없습니다'
      });
    }

    // 확인 상태 업데이트
    await responseNote.update({
      confirmedAt: confirmed ? new Date() : null
    });

    res.json({
      success: true,
      data: {
        id: responseNote.id,
        confirmed: !!responseNote.confirmedAt,
        confirmedAt: responseNote.confirmedAt
      }
    });

  } catch (error) {
    console.error('현장 회신 확인 상태 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '확인 상태 업데이트 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;