# GitHub Pages 배포 - 단계별 가이드

## ✅ 완료된 작업
- ✅ `vite.config.ts`에 base 경로 설정 (`/ms2-messenger/`)
- ✅ GitHub Actions 워크플로우 파일 생성 (`.github/workflows/deploy.yml`)

---

## 📝 다음 단계

### 1단계: 변경사항 확인

```bash
git status
```

다음 파일들이 변경되었는지 확인:
- `vite.config.ts`
- `.github/workflows/deploy.yml` (새 파일)

---

### 2단계: 변경사항 커밋 및 푸시

```bash
# 모든 변경사항 추가
git add .

# 커밋
git commit -m "Add GitHub Pages deployment configuration"

# 푸시
git push origin main
```

---

### 3단계: GitHub 저장소에서 Pages 설정

1. **GitHub 저장소 페이지 접속**
   - https://github.com/aoperat/talk3 접속

2. **Settings 메뉴 클릭**
   - 저장소 상단의 "Settings" 탭 클릭

3. **Pages 설정 찾기**
   - 왼쪽 사이드바에서 "Pages" 클릭
   - 또는 직접: https://github.com/aoperat/talk3/settings/pages

4. **Build and deployment 설정**
   - **Source**: "GitHub Actions" 선택
   - 저장 (Save 버튼 클릭)

---

### 4단계: GitHub Actions 워크플로우 확인

1. **Actions 탭 클릭**
   - 저장소 상단의 "Actions" 탭 클릭
   - 또는: https://github.com/aoperat/talk3/actions

2. **워크플로우 실행 확인**
   - "Deploy to GitHub Pages" 워크플로우가 실행되는지 확인
   - 노란 점(진행 중) 또는 초록 체크(완료) 아이콘 확인

3. **배포 완료 대기**
   - 약 2-3분 소요
   - 모든 단계가 초록색 체크로 바뀌면 완료!

---

### 5단계: 배포 완료 확인

1. **Pages 설정에서 URL 확인**
   - Settings → Pages
   - "Your site is live at" 아래 URL 확인
   - 예: `https://aoperat.github.io/talk3/`

2. **브라우저에서 접속**
   - 위 URL을 브라우저에서 열기
   - 애플리케이션이 정상적으로 로드되는지 확인

---

## 🔧 문제 해결

### 문제: GitHub Actions가 실행되지 않음

**해결:**
- Settings → Actions → General
- "Workflow permissions"에서 "Read and write permissions" 선택
- 저장 후 다시 푸시

### 문제: 404 에러 발생

**해결:**
- `vite.config.ts`의 `base` 경로가 `/talk3/`로 설정되어 있는지 확인
- 저장소 이름과 정확히 일치해야 함

### 문제: 빌드 실패

**해결:**
- Actions 탭에서 실패한 워크플로우 클릭
- 로그 확인하여 오류 원인 파악
- 대부분은 환경 변수 또는 의존성 문제

---

## 🌐 최종 URL

배포 완료 후:
- **프로덕션 URL**: `https://aoperat.github.io/talk3/`
- **저장소 URL**: `https://github.com/aoperat/talk3`

---

## 🔄 이후 업데이트

코드를 수정하고 업데이트할 때마다:

```bash
git add .
git commit -m "Update: 변경 내용 설명"
git push origin main
```

자동으로 GitHub Actions가 실행되어 재배포됩니다!

---

## ⚠️ 중요 참고사항

### 환경 변수 (.env 파일)

GitHub Pages는 정적 호스팅이므로:
- **`.env` 파일은 배포에 포함되지 않음**
- 환경 변수는 빌드 시점에 포함되어야 함
- GitHub Secrets 사용 또는 환경 변수를 코드에 포함 (보안 주의!)

### Supabase 환경 변수

현재 프로젝트는 Supabase를 사용하므로:
- `.env` 파일의 환경 변수가 GitHub Pages에서 작동하지 않을 수 있음
- Vite의 환경 변수는 `VITE_` 접두사 필요
- GitHub Secrets를 사용하여 빌드 시 주입하거나, 다른 호스팅 서비스(Vercel, Netlify) 고려

---

## 📚 추가 리소스

- [GitHub Pages 문서](https://docs.github.com/en/pages)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html#github-pages)

