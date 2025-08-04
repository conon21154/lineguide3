import { WorkOrder, WorkOrderStatus, OperationTeam, WorkOrderFilter, ResponseNote } from '@/types';

const STORAGE_KEY = 'lineguide_work_orders';

class WorkOrderStore {
  private workOrders: WorkOrder[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.workOrders = JSON.parse(stored);
      }
    } catch (error) {
      console.error('❌ localStorage 불러오기 실패:', error);
      this.workOrders = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workOrders));
    } catch (error) {
      console.error('❌ localStorage 저장 실패:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getAllWorkOrders(): WorkOrder[] {
    return [...this.workOrders];
  }

  getWorkOrdersByFilter(filter: WorkOrderFilter): WorkOrder[] {
    return this.workOrders.filter(order => {
      if (filter.operationTeam && order.operationTeam !== filter.operationTeam) {
        return false;
      }
      
      if (filter.status && order.status !== filter.status) {
        return false;
      }
      
      if (filter.dateRange) {
        const orderDate = new Date(order.requestDate);
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);
        
        if (orderDate < startDate || orderDate > endDate) {
          return false;
        }
      }
      
      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        const searchableFields = [
          order.managementNumber,
          order.equipmentName,
          order.concentratorName5G,
          order.equipmentType,
          order.serviceType,
          order.duId,
          order.duName,
          order.channelCard,
          order.port,
          order.lineNumber,
          order.category
        ];
        
        if (!searchableFields.some(field => 
          field.toLowerCase().includes(searchTerm)
        )) {
          return false;
        }
      }
      
      return true;
    });
  }

  addWorkOrders(orders: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>[]): WorkOrder[] {
    
    const newOrders = orders.map(order => ({
      ...order,
      id: this.generateId(),
      status: 'pending' as WorkOrderStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));


    this.workOrders.push(...newOrders);
    
    this.saveToStorage();
    this.notifyListeners();
    
    return newOrders;
  }

  updateWorkOrderStatus(id: string, status: WorkOrderStatus, notes?: string): boolean {
    const order = this.workOrders.find(o => o.id === id);
    if (!order) return false;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    if (status === 'completed') {
      order.completedAt = new Date().toISOString();
    }
    
    if (notes !== undefined) {
      order.notes = notes;
    }

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  deleteWorkOrder(id: string): boolean {
    const index = this.workOrders.findIndex(o => o.id === id);
    if (index === -1) return false;

    this.workOrders.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  clearAllWorkOrders() {
    this.workOrders = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  updateResponseNote(id: string, responseNote: Partial<ResponseNote>): boolean {
    const workOrder = this.workOrders.find(wo => wo.id === id);
    if (!workOrder) return false;

    // 기존 회신 메모와 병합
    workOrder.responseNote = {
      ...workOrder.responseNote,
      ...responseNote,
      updatedAt: new Date().toISOString()
    };

    workOrder.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  markResponseNoteAsChecked(id: string): boolean {
    const workOrder = this.workOrders.find(wo => wo.id === id);
    if (!workOrder || !workOrder.responseNote) return false;

    workOrder.responseNote.adminChecked = true;
    workOrder.responseNote.adminCheckedAt = new Date().toISOString();
    workOrder.updatedAt = new Date().toISOString();
    
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  getCompletedWorkOrdersWithResponseNotes(): WorkOrder[] {
    return this.workOrders.filter(wo => 
      wo.status === 'completed' && wo.responseNote
    ).sort((a, b) => 
      new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime()
    );
  }

  getStatistics() {
    const total = this.workOrders.length;
    const pending = this.workOrders.filter(o => o.status === 'pending').length;
    const inProgress = this.workOrders.filter(o => o.status === 'in_progress').length;
    const completed = this.workOrders.filter(o => o.status === 'completed').length;

    const byTeam: Record<OperationTeam, { pending: number; inProgress: number; completed: number }> = {
      '운용1팀': { pending: 0, inProgress: 0, completed: 0 },
      '운용2팀': { pending: 0, inProgress: 0, completed: 0 },
      '운용3팀': { pending: 0, inProgress: 0, completed: 0 },
      '운용4팀': { pending: 0, inProgress: 0, completed: 0 },
      '운용5팀': { pending: 0, inProgress: 0, completed: 0 },
      '울산T': { pending: 0, inProgress: 0, completed: 0 },
      '동부산T': { pending: 0, inProgress: 0, completed: 0 },
      '중부산T': { pending: 0, inProgress: 0, completed: 0 },
      '서부산T': { pending: 0, inProgress: 0, completed: 0 },
      '김해T': { pending: 0, inProgress: 0, completed: 0 },
      '창원T': { pending: 0, inProgress: 0, completed: 0 },
      '진주T': { pending: 0, inProgress: 0, completed: 0 },
      '통영T': { pending: 0, inProgress: 0, completed: 0 },
      '기타': { pending: 0, inProgress: 0, completed: 0 }
    };

    this.workOrders.forEach(order => {
      byTeam[order.operationTeam][order.status === 'in_progress' ? 'inProgress' : order.status]++;
    });

    // DU/RU 작업 분리 통계
    const duRuStats: Record<OperationTeam, { 
      duWork: { pending: number; inProgress: number; completed: number; total: number };
      ruWork: { pending: number; inProgress: number; completed: number; total: number };
    }> = {} as Record<OperationTeam, { 
      duWork: { pending: number; inProgress: number; completed: number; total: number };
      ruWork: { pending: number; inProgress: number; completed: number; total: number };
    }>;

    Object.keys(byTeam).forEach(team => {
      const operationTeam = team as OperationTeam;
      duRuStats[operationTeam] = {
        duWork: { pending: 0, inProgress: 0, completed: 0, total: 0 },
        ruWork: { pending: 0, inProgress: 0, completed: 0, total: 0 }
      };
    });

    this.workOrders.forEach(order => {
      const isDuWork = order.managementNumber.includes('_DU측');
      const isRuWork = order.managementNumber.includes('_RU측');
      
      if (isDuWork) {
        const statusKey = order.status === 'in_progress' ? 'inProgress' : order.status;
        duRuStats[order.operationTeam].duWork[statusKey]++;
        duRuStats[order.operationTeam].duWork.total++;
      } else if (isRuWork) {
        const statusKey = order.status === 'in_progress' ? 'inProgress' : order.status;
        duRuStats[order.operationTeam].ruWork[statusKey]++;
        duRuStats[order.operationTeam].ruWork.total++;
      }
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      byTeam,
      duRuStats
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const workOrderStore = new WorkOrderStore();