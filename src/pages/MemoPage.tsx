import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MemoForm from '@/components/MemoForm';

export default function MemoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(true);

  const workOrderId = id ? parseInt(id) : null;

  if (!workOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 접근</h1>
          <p className="text-gray-600 mb-4">유효하지 않은 작업지시 ID입니다.</p>
          <button
            onClick={() => navigate('/workboard')}
            className="btn btn-primary"
          >
            작업게시판으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    setShowForm(false);
    navigate('/workboard');
  };

  const handleSuccess = () => {
    setShowForm(false);
    navigate('/board'); // 회신 메모 목록으로 이동
  };

  if (!showForm) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/workboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              작업게시판으로 돌아가기
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              현장 회신 메모 작성
            </h1>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <MemoForm
          workOrderId={workOrderId}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}