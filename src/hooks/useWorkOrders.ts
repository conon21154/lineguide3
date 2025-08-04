import { useState, useEffect } from 'react';
import { workOrderStore } from '@/stores/workOrderStore';
import { WorkOrder, WorkOrderFilter, ResponseNote } from '@/types';

export function useWorkOrders(filter?: WorkOrderFilter) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateWorkOrders = () => {
      let orders;
      if (filter) {
        orders = workOrderStore.getWorkOrdersByFilter(filter);
        console.log('🔍 필터된 작업지시 로드:', orders.length, '건, 필터:', filter);
      } else {
        orders = workOrderStore.getAllWorkOrders();
        console.log('📋 전체 작업지시 로드:', orders.length, '건');
      }
      setWorkOrders(orders);
    };

    updateWorkOrders();
    const unsubscribe = workOrderStore.subscribe(updateWorkOrders);

    return unsubscribe;
  }, [filter]);

  const addWorkOrders = async (orders: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>[]) => {
    setLoading(true);
    try {
      const newOrders = workOrderStore.addWorkOrders(orders);
      return { success: true, data: newOrders };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: WorkOrder['status'], notes?: string) => {
    setLoading(true);
    try {
      const success = workOrderStore.updateWorkOrderStatus(id, status, notes);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkOrder = async (id: string) => {
    setLoading(true);
    try {
      const success = workOrderStore.deleteWorkOrder(id);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  const updateResponseNote = async (id: string, responseNote: Partial<ResponseNote>) => {
    setLoading(true);
    try {
      const success = workOrderStore.updateResponseNote(id, responseNote);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  const markResponseNoteAsChecked = async (id: string) => {
    setLoading(true);
    try {
      const success = workOrderStore.markResponseNoteAsChecked(id);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  return {
    workOrders,
    loading,
    addWorkOrders,
    updateStatus,
    deleteWorkOrder,
    updateResponseNote,
    markResponseNoteAsChecked
  };
}

export function useWorkOrderStatistics() {
  const [statistics, setStatistics] = useState(workOrderStore.getStatistics());

  useEffect(() => {
    const updateStatistics = () => {
      setStatistics(workOrderStore.getStatistics());
    };

    const unsubscribe = workOrderStore.subscribe(updateStatistics);
    return unsubscribe;
  }, []);

  return statistics;
}

export function useCompletedResponseNotes() {
  const [completedNotes, setCompletedNotes] = useState<WorkOrder[]>([]);

  useEffect(() => {
    const updateCompletedNotes = () => {
      setCompletedNotes(workOrderStore.getCompletedWorkOrdersWithResponseNotes());
    };

    updateCompletedNotes();
    const unsubscribe = workOrderStore.subscribe(updateCompletedNotes);
    return unsubscribe;
  }, []);

  return completedNotes;
}