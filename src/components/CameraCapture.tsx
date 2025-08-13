import React, { useState, useRef, useCallback } from 'react';
import { FieldPhoto } from '../types';

interface CameraCaptureProps {
  onPhotoCaptured: (photo: FieldPhoto) => void;
  maxPhotos?: number;
  currentPhotos?: FieldPhoto[];
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoCaptured,
  maxPhotos = 4,
  currentPhotos = []
}) => {
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setIsActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('카메라 접근 실패:', error);
      alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // 캔버스 크기를 비디오 크기로 설정
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 비디오 프레임을 캔버스에 그리기
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 이미지 압축 및 변환
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const photoId = Date.now().toString();
        const filename = `field_photo_${photoId}.jpg`;
        
        // 파일 객체 생성
        const file = new File([blob], filename, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        // URL 생성 (미리보기용)
        const url = URL.createObjectURL(blob);

        const photo: FieldPhoto = {
          id: photoId,
          filename,
          originalName: filename,
          size: blob.size,
          mimeType: 'image/jpeg',
          url,
          capturedAt: new Date().toISOString()
        };

        onPhotoCaptured(photo);
        stopCamera();
      },
      'image/jpeg',
      0.8 // 압축 품질 (0.8 = 80%)
    );
  }, [onPhotoCaptured, stopCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isActive) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isActive, startCamera, stopCamera]);

  const canTakeMorePhotos = currentPhotos.length < maxPhotos;

  if (!isActive) {
    return (
      <div className="text-center">
        <button
          onClick={startCamera}
          disabled={!canTakeMorePhotos}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            canTakeMorePhotos
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          📷 카메라 시작 ({currentPhotos.length}/{maxPhotos})
        </button>
        {!canTakeMorePhotos && (
          <p className="text-sm text-gray-500 mt-2">
            최대 {maxPhotos}장까지 촬영 가능합니다
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 카메라 헤더 */}
      <div className="bg-black bg-opacity-50 text-white p-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">현장 사진 촬영</h3>
        <div className="text-sm">
          {currentPhotos.length + 1}/{maxPhotos}
        </div>
      </div>

      {/* 카메라 뷰 */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        {/* 가이드 라인 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full border-2 border-white border-opacity-30 relative">
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white bg-opacity-30"></div>
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white bg-opacity-30"></div>
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white bg-opacity-30"></div>
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white bg-opacity-30"></div>
          </div>
        </div>

        {/* 촬영 힌트 */}
        <div className="absolute top-4 left-4 right-4 text-white text-center">
          <p className="text-sm bg-black bg-opacity-50 rounded px-3 py-1">
            작업 현장을 명확하게 촬영해주세요
          </p>
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="bg-black bg-opacity-50 p-4 flex justify-between items-center">
        <button
          onClick={stopCamera}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg"
        >
          취소
        </button>

        <div className="flex items-center space-x-4">
          <button
            onClick={switchCamera}
            className="p-3 bg-gray-600 text-white rounded-full"
            title="카메라 전환"
          >
            🔄
          </button>
          
          <button
            onClick={capturePhoto}
            className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center"
          >
            <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
          </button>
        </div>

        <div className="w-16"></div>
      </div>

      {/* 숨겨진 캔버스 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;