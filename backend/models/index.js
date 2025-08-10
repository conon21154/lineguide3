const { sequelize } = require('../config/database');

// 모델 import
const User = require('./User');
const WorkOrder = require('./WorkOrder');
const FieldResponse = require('./FieldResponse');
const ResponseNote = require('./ResponseNote');

// 모델 관계 설정
const setupAssociations = () => {
  // User와 WorkOrder 관계
  User.hasMany(WorkOrder, { 
    foreignKey: 'created_by',
    as: 'createdWorkOrders'
  });
  
  User.hasMany(WorkOrder, { 
    foreignKey: 'assigned_to',
    as: 'assignedWorkOrders'
  });

  WorkOrder.belongsTo(User, { 
    foreignKey: 'created_by',
    as: 'creator'
  });
  
  WorkOrder.belongsTo(User, { 
    foreignKey: 'assigned_to',
    as: 'assignee'
  });
};

// 관계 설정 실행
setupAssociations();

module.exports = {
  sequelize,
  User,
  WorkOrder,
  FieldResponse,
  ResponseNote
};