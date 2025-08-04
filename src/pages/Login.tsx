import { useState } from 'react'
import { Users, Lock, LogIn } from 'lucide-react'
import { OperationTeam } from '@/types'

const OPERATION_TEAMS: OperationTeam[] = [
  '울산T',
  '동부산T', 
  '중부산T',
  '서부산T',
  '김해T',
  '창원T',
  '진주T',
  '통영T',
  '지하철T'
]

interface LoginProps {
  onLogin: (team: OperationTeam, userType: 'admin' | 'field') => void
}

export default function Login({ onLogin }: LoginProps) {
  const [selectedTeam, setSelectedTeam] = useState<OperationTeam>('중부산T')
  const [userType, setUserType] = useState<'admin' | 'field'>('field')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 간단한 비밀번호 체크
    if (userType === 'admin' && password !== 'admin123') {
      alert('관리자 비밀번호가 올바르지 않습니다.')
      return
    }
    
    if (userType === 'field' && password !== 'field123') {
      alert('현장팀 비밀번호가 올바르지 않습니다.')
      return
    }
    
    onLogin(selectedTeam, userType)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              5G 작업관리 시스템
            </h1>
            <p className="text-gray-600">
              팀을 선택하고 로그인하세요
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* 사용자 타입 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                사용자 구분
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('field')}
                  className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                    userType === 'field'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-4 h-4 mx-auto mb-1" />
                  현장팀
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('admin')}
                  className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                    userType === 'admin'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-4 h-4 mx-auto mb-1" />
                  관리자
                </button>
              </div>
            </div>

            {/* 팀 선택 (현장팀만) */}
            {userType === 'field' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  소속 팀
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value as OperationTeam)}
                  className="input w-full"
                  required
                >
                  {OPERATION_TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder={userType === 'admin' ? '관리자 비밀번호' : '현장팀 비밀번호'}
                required
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              className="w-full btn btn-primary flex items-center justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </button>
          </form>

          {/* 도움말 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <strong>현장팀:</strong> 소속팀 작업만 조회/수정<br />
              <strong>관리자:</strong> 전체 시스템 관리
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}