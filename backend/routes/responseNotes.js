const express = require('express');
const { Op } = require('sequelize');
const { ResponseNote, WorkOrder } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 회신 메모 목록 조회 (삭제되지 않은 것만)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const responseNotes = await ResponseNote.findAll({
      where: {
        deletedAt: null
      },
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'workOrderId',
        'side', 
        'ruId',
        'content',
        'createdBy',
        'confirmedAt',
        ['created_at', 'createdAt'],  // 명시적으로 created_at을 createdAt으로 매핑
        ['updated_at', 'updatedAt']   // 명시적으로 updated_at을 updatedAt으로 매핑
      ]
    });

    console.log('🔍 ResponseNotes API - 첫 번째 레코드:', responseNotes[0]?.dataValues);
    res.json(responseNotes);
  } catch (error) {
    console.error('회신 메모 목록 조회 오류:', error);
    res.status(500).json({
      error: '회신 메모 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 최신 응답 노트 조회 API (라벨 프린터용)
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const { workOrderId } = req.query;

    if (!workOrderId) {
      return res.status(400).json({ error: 'workOrderId는 필수입니다' });
    }

    const latestNote = await ResponseNote.findOne({
      where: {
        workOrderId,
        deletedAt: null
      },
      order: [['created_at', 'DESC']]
    });

    if (!latestNote) {
      return res.json({
        found: false,
        mux: '',
        tie: '',
        lteMux: ''
      });
    }

    // content에서 mux, tie, lteMux 정보 추출 (간단한 파싱)
    const content = latestNote.content || '';
    
    // 기본적인 키워드 매칭으로 정보 추출
    const muxMatch = content.match(/(?:5G\s*)?MUX[:\s]*([^\n\r,]+)/i);
    const tieMatch = content.match(/(?:5G\s*)?TIE[:\s]*([^\n\r,]+)/i);
    const lteMuxMatch = content.match(/LTE\s*MUX[:\s]*([^\n\r,]+)/i);

    res.json({
      found: true,
      mux: muxMatch ? muxMatch[1].trim() : '',
      tie: tieMatch ? tieMatch[1].trim() : '',
      lteMux: lteMuxMatch ? lteMuxMatch[1].trim() : '',
      content: content
    });
  } catch (error) {
    console.error('최신 응답 노트 조회 오류:', error);
    res.status(500).json({
      error: '최신 응답 노트 조회 중 오류가 발생했습니다'
    });
  }
});

// 중복 확인 API
router.get('/check-duplicate', authMiddleware, async (req, res) => {
  try {
    const { workOrderId, side, ruId } = req.query;

    if (!workOrderId || !side) {
      return res.status(400).json({ error: 'workOrderId와 side는 필수입니다' });
    }

    const existing = await ResponseNote.findOne({
      where: {
        workOrderId,
        side,
        ruId: ruId || null,
        deletedAt: null
      }
    });

    res.json({
      exists: !!existing,
      existing: existing ? {
        id: existing.id,
        content: existing.content,
        createdAt: existing.createdAt
      } : null
    });
  } catch (error) {
    console.error('중복 확인 오류:', error);
    res.status(500).json({
      error: '중복 확인 중 오류가 발생했습니다'
    });
  }
});

// 회신 메모 등록
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { workOrderId, content, side } = req.body;

    // 필수 필드 검증
    if (!workOrderId || !content || !side) {
      return res.status(400).json({ 
        error: 'workOrderId, content, side는 필수입니다' 
      });
    }

    // workOrderId 숫자 변환
    const workOrderIdNum = parseInt(workOrderId);
    if (isNaN(workOrderIdNum)) {
      return res.status(400).json({ error: 'workOrderId는 숫자여야 합니다' });
    }

    // side 값 변환 및 검증
    let normalizedSide;
    if (side === 'DU측' || side === 'DU') {
      normalizedSide = 'DU';
    } else if (side === 'RU측' || side === 'RU') {
      normalizedSide = 'RU';
    } else {
      return res.status(400).json({ error: 'side는 "DU측", "RU측", "DU", "RU" 중 하나여야 합니다' });
    }

    // 작업지시 존재 및 완료 상태 확인
    const workOrder = await WorkOrder.findByPk(workOrderIdNum);
    if (!workOrder) {
      return res.status(404).json({ error: '작업지시를 찾을 수 없습니다' });
    }

    if (workOrder.status !== 'completed' && workOrder.status !== '확인완료') {
      return res.status(400).json({ 
        error: '완료된 작업만 회신 메모 등록 가능' 
      });
    }

    // 중복 확인 (work_order_id + side 조합)
    const existing = await ResponseNote.findOne({
      where: {
        workOrderId: workOrderIdNum,
        side: normalizedSide,
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(409).json({ 
        error: '이미 등록된 회신 메모가 있습니다.',
        existing: {
          id: existing.id,
          content: existing.content,
          createdAt: existing.createdAt
        }
      });
    }

    // 회신 메모 생성 (content는 개행 포함해서 그대로 저장)
    const responseNote = await ResponseNote.create({
      workOrderId: workOrderIdNum,
      side: normalizedSide,
      content: content, // trim 하지 않음 - 개행과 공백 유지
      createdBy: req.user.userId
    });

    console.log('✅ 회신 메모 등록 완료:', responseNote.id);
    res.status(201).json({
      message: '회신 메모가 등록되었습니다',
      responseNote
    });

  } catch (error) {
    console.error('회신 메모 등록 오류:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ 
        error: '이미 등록된 회신 메모가 있습니다.' 
      });
    } else {
      res.status(500).json({
        error: '회신 메모 등록 중 오류가 발생했습니다'
      });
    }
  }
});

// 회신 메모 수정
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'content는 필수입니다' });
    }

    const responseNote = await ResponseNote.findOne({
      where: {
        id: req.params.id,
        deletedAt: null
      }
    });

    if (!responseNote) {
      return res.status(404).json({ error: '회신 메모를 찾을 수 없습니다' });
    }

    await responseNote.update({
      content: content.trim(),
      updatedAt: new Date()
    });

    res.json({
      message: '회신 메모가 수정되었습니다',
      responseNote
    });

  } catch (error) {
    console.error('회신 메모 수정 오류:', error);
    res.status(500).json({
      error: '회신 메모 수정 중 오류가 발생했습니다'
    });
  }
});

// 회신 메모 비우기
router.patch('/:id/clear', authMiddleware, async (req, res) => {
  try {
    const responseNote = await ResponseNote.findOne({
      where: {
        id: req.params.id,
        deletedAt: null
      }
    });

    if (!responseNote) {
      return res.status(404).json({ error: '회신 메모를 찾을 수 없습니다' });
    }

    await responseNote.update({
      content: '',
      updatedAt: new Date()
    });

    console.log('✅ 회신 메모 비우기 완료:', req.params.id);
    res.json({
      message: '회신 메모가 비워졌습니다',
      responseNote
    });

  } catch (error) {
    console.error('회신 메모 비우기 오류:', error);
    res.status(500).json({
      error: '회신 메모 비우기 중 오류가 발생했습니다'
    });
  }
});

// 회신 메모 삭제 (소프트 삭제)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const responseNote = await ResponseNote.findOne({
      where: {
        id: req.params.id,
        deletedAt: null
      }
    });

    if (!responseNote) {
      return res.status(404).json({ error: '회신 메모를 찾을 수 없습니다' });
    }

    await responseNote.update({
      deletedAt: new Date()
    });

    console.log('✅ 회신 메모 소프트 삭제 완료:', req.params.id);
    res.json({ message: '회신 메모가 삭제되었습니다' });

  } catch (error) {
    console.error('회신 메모 삭제 오류:', error);
    res.status(500).json({
      error: '회신 메모 삭제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;