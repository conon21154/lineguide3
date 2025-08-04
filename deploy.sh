#!/bin/bash

# GitHub Pages 배포 스크립트
echo "🚀 LineGuide 5G 시스템 배포 시작..."

# 빌드
echo "📦 프로젝트 빌드 중..."
npm run build

# gh-pages 브랜치로 배포
echo "🌐 GitHub Pages로 배포 중..."
git add dist -f
git commit -m "배포: GitHub Pages용 빌드 파일 추가"

# dist 폴더를 gh-pages 브랜치로 푸시
git subtree push --prefix dist origin gh-pages

echo "✅ 배포 완료!"
echo "🔗 사이트 URL: https://[사용자명].github.io/lineguide-5g/"