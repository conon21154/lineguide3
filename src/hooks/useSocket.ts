import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { AuthToken } from '@/config/api'
import { useAuth } from '@/contexts/AuthContext'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:5000'

interface SocketEventHandlers {
  // 작업지시 관련 이벤트
  workOrderCreated?: (data: any) => void
  workOrdersBulkCreated?: (data: any) => void
  workOrderStatusChanged?: (data: any) => void
  workOrderDeleted?: (data: any) => void
  responseNoteCreated?: (data: any) => void
  
  // 연결 관련 이벤트
  connect?: () => void
  disconnect?: () => void
  error?: (error: any) => void
}

export function useSocket(eventHandlers?: SocketEventHandlers) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    // Socket 연결 생성
    const socket = io(SOCKET_URL, {
      auth: {
        token: AuthToken.get()
      },
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    // 기본 이벤트 핸들러
    socket.on('connect', () => {
      console.log('🔌 Socket 연결 성공:', socket.id)
      setConnected(true)
      setError(null)

      // 팀별 룸 참여
      if (user.role === 'admin') {
        socket.emit('join-admin')
        console.log('👨‍💼 관리자 룸 참여')
      } else if (user.team) {
        socket.emit('join-team', user.team)
        console.log(`👥 ${user.team} 팀 룸 참여`)
      }

      // 사용자 정의 연결 핸들러
      eventHandlers?.connect?.()
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket 연결 해제:', reason)
      setConnected(false)
      eventHandlers?.disconnect?.()
    })

    socket.on('connect_error', (err) => {
      console.error('❌ Socket 연결 오류:', err)
      setError(err.message)
      setConnected(false)
      eventHandlers?.error?.(err)
    })

    // 작업지시 관련 이벤트 핸들러
    if (eventHandlers?.workOrderCreated) {
      socket.on('workOrderCreated', eventHandlers.workOrderCreated)
    }

    if (eventHandlers?.workOrdersBulkCreated) {
      socket.on('workOrdersBulkCreated', eventHandlers.workOrdersBulkCreated)
    }

    if (eventHandlers?.workOrderStatusChanged) {
      socket.on('workOrderStatusChanged', eventHandlers.workOrderStatusChanged)
    }

    if (eventHandlers?.workOrderDeleted) {
      socket.on('workOrderDeleted', eventHandlers.workOrderDeleted)
    }

    if (eventHandlers?.responseNoteCreated) {
      socket.on('responseNoteCreated', eventHandlers.responseNoteCreated)
    }

    // 정리 함수
    return () => {
      console.log('🔌 Socket 연결 정리')
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user, eventHandlers])

  // Socket 이벤트 발송
  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('⚠️ Socket이 연결되어 있지 않습니다.')
    }
  }

  return {
    socket: socketRef.current,
    connected,
    error,
    emit
  }
}

// 실시간 알림을 위한 토스트 훅
export function useRealtimeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: Date
    read: boolean
  }>>([])

  const addNotification = (
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [notification, ...prev.slice(0, 49)]) // 최대 50개 유지

    // 브라우저 알림 (권한이 있는 경우)
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/vite.svg' // 실제 아이콘 경로로 변경
      })
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Socket 이벤트 핸들러들
  const socketHandlers: SocketEventHandlers = {
    workOrderCreated: (data) => {
      if (user?.role === 'admin' || data.team === user?.team) {
        addNotification('info', '새 작업지시', '새로운 작업지시가 등록되었습니다.')
      }
    },

    workOrdersBulkCreated: (data) => {
      if (user?.role === 'admin' || data.some((order: any) => order.team === user?.team)) {
        addNotification('success', '일괄 업로드', `${data.length}개의 작업지시가 업로드되었습니다.`)
      }
    },

    workOrderStatusChanged: (data) => {
      if (user?.role === 'admin' || data.team === user?.team) {
        addNotification('info', '상태 변경', '작업지시 상태가 변경되었습니다.')
      }
    },

    workOrderDeleted: (data) => {
      if (user?.role === 'admin' || data.team === user?.team) {
        addNotification('warning', '작업지시 삭제', '작업지시가 삭제되었습니다.')
      }
    },

    responseNoteCreated: (data) => {
      if (user?.role === 'admin' || data.team === user?.team) {
        addNotification('info', '회신 메모', '새로운 회신 메모가 작성되었습니다.')
      }
    },

    connect: () => {
      addNotification('success', '연결됨', '서버와의 실시간 연결이 활성화되었습니다.')
    },

    disconnect: () => {
      addNotification('warning', '연결 해제', '서버와의 연결이 해제되었습니다.')
    },

    error: (error) => {
      addNotification('error', '연결 오류', '서버 연결 중 오류가 발생했습니다.')
    }
  }

  const socket = useSocket(socketHandlers)

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return {
    ...socket,
    notifications: notifications.slice(0, 10), // UI에는 최신 10개만
    unreadCount: notifications.filter(n => !n.read).length,
    addNotification,
    markAsRead,
    clearAll
  }
}