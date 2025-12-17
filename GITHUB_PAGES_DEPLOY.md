# GitHub Pages 배포 가이드

## 📋 준비 사항
- 저장소 이름: `ms2-messenger`
- GitHub Pages URL: `https://aoperat.github.io/ms2-messenger/`

---

## 🚀 방법 1: GitHub Actions 사용 (권장 - 자동 배포)

### 1단계: Vite 설정 수정

`vite.config.ts` 파일에 base 경로 추가:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ms2-messenger/',  // 저장소 이름과 동일하게
})
```

### 2단계: GitHub Actions 워크플로우 생성

`.github/workflows/deploy.yml` 파일 생성

### 3단계: GitHub 저장소 설정

1. GitHub 저장소 페이지 접속: https://github.com/aoperat/ms2-messenger
2. Settings → Pages
3. Source: "GitHub Actions" 선택
4. 저장

### 4단계: 코드 푸시

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

자동으로 배포가 시작됩니다!

---

## 🛠️ 방법 2: gh-pages 브랜치 사용 (수동 배포)

### 1단계: Vite 설정 수정 (동일)

### 2단계: 배포 스크립트 추가

`package.json`에 스크립트 추가 (gh-pages 패키지 설치 필요)

### 3단계: 빌드 및 배포

```bash
npm run build
# gh-pages 브랜치에 배포
```

---

## 📝 상세 설정은 아래 단계를 따라하세요!

