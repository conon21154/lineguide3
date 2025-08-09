const express = require('express');
const { Op, sequelize } = require('sequelize');
const { WorkOrder, User } = require('../models');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// 팀 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 모든 팀 목록을 작업지시에서 추출
    const teams = await WorkOrder.findAll({
      attributes: ['team'],
      group: ['team'],
      where: {
        team: {
          [Op.not]: null
        }
      }
    });

    const teamList = teams.map(t => t.team);

    res.json({
      teams: teamList
    });

  } catch (error) {
    console.error('팀 목록 조회 오류:', error);
    res.status(500).json({
      error: '팀 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 특정 팀의 통계 조회
router.get('/:team/stats', authMiddleware, async (req, res) => {
  try {
    const { team } = req.params;
    const { startDate, endDate } = req.query;

    const where = { team };

    // 날짜 범위 필터
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // 상태별 통계
    const statusStats = await WorkOrder.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['status']
    });

    // 총 작업지시 수
    const totalCount = await WorkOrder.count({ where });

    // 완료율 계산
    const completedCount = statusStats.find(s => s.status === 'completed')?.get('count') || 0;
    const completionRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : 0;

    // 우선순위별 통계
    const priorityStats = await WorkOrder.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['priority']
    });

    // 최근 7일간 일별 작업 생성 통계
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await WorkOrder.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        team,
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });

    res.json({
      team,
      totalCount,
      completionRate: parseFloat(completionRate),
      statusStats: statusStats.map(s => ({
        status: s.status,
        count: parseInt(s.get('count'))
      })),
      priorityStats: priorityStats.map(p => ({
        priority: p.priority,
        count: parseInt(p.get('count'))
      })),
      dailyStats: dailyStats.map(d => ({
        date: d.get('date'),
        count: parseInt(d.get('count'))
      }))
    });

  } catch (error) {
    console.error('팀 통계 조회 오류:', error);
    res.status(500).json({
      error: '팀 통계 조회 중 오류가 발생했습니다'
    });
  }
});

// 특정 팀의 사용자 목록 조회
router.get('/:team/users', authMiddleware, async (req, res) => {
  try {
    const { team } = req.params;

    const users = await User.findAll({
      where: { team },
      attributes: { exclude: ['password'] }
    });

    res.json({
      team,
      users
    });

  } catch (error) {
    console.error('팀 사용자 조회 오류:', error);
    res.status(500).json({
      error: '팀 사용자 조회 중 오류가 발생했습니다'
    });
  }
});

// 관리자용 전체 팀 개요 (관리자만 접근 가능)
router.get('/admin/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // 전체 통계
    const totalWorkOrders = await WorkOrder.count();
    const totalUsers = await User.count();

    // 팀별 작업지시 수
    const teamWorkOrderCounts = await WorkOrder.findAll({
      attributes: [
        'team',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['team'],
      where: {
        team: {
          [Op.not]: null
        }
      }
    });

    // 팀별 사용자 수
    const teamUserCounts = await User.findAll({
      attributes: [
        'team',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['team'],
      where: {
        team: {
          [Op.not]: null
        }
      }
    });

    // 전체 상태별 통계
    const overallStatusStats = await WorkOrder.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // 최근 활동 (최근 10개 작업지시)
    const recentActivities = await WorkOrder.findAll({
      limit: 10,
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['username', 'name']
        }
      ]
    });

    res.json({
      overview: {
        totalWorkOrders,
        totalUsers,
        teamCount: teamWorkOrderCounts.length
      },
      teamStats: teamWorkOrderCounts.map(t => ({
        team: t.team,
        workOrderCount: parseInt(t.get('count')),
        userCount: teamUserCounts.find(u => u.team === t.team)?.get('count') || 0
      })),
      statusStats: overallStatusStats.map(s => ({
        status: s.status,
        count: parseInt(s.get('count'))
      })),
      recentActivities: recentActivities.map(w => ({
        id: w.id,
        customerName: w.customer_name,
        team: w.team,
        status: w.status,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        creator: w.creator
      }))
    });

  } catch (error) {
    console.error('관리자 개요 조회 오류:', error);
    res.status(500).json({
      error: '관리자 개요 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;