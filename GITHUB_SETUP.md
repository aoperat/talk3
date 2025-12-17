# GitHub 저장소 생성 및 배포 가이드

## ✅ 완료된 작업
- 원격 저장소 URL 변경: `https://github.com/aoperat/ms2-messenger.git`
- 현재 브랜치: `main`

## 📝 다음 단계

### 1. GitHub에서 저장소 생성

1. **저장소 생성 페이지 접속**
   - https://github.com/new

2. **저장소 정보 입력**
   - **Repository name**: `ms2-messenger` (이미 설정됨)
   - **Description**: 선택사항 (예: "English Buddy Messenger - 실시간 다국어 메신저")
   - **Visibility**: Public 또는 Private 선택
   - ⚠️ **중요**: "Initialize this repository with a README" 체크박스는 **체크하지 않기** (이미 로컬에 코드가 있음)
   - ⚠️ **중요**: "Add .gitignore" 및 "Choose a license"도 선택하지 않기

3. **"Create repository" 버튼 클릭**

### 2. 첫 배포 실행

GitHub에서 저장소를 생성한 후, 아래 명령어 실행:

```bash
git push -u origin main
```

### 3. 인증 (필요한 경우)

만약 인증 오류가 발생하면:

#### Personal Access Token 생성:
1. https://github.com/settings/tokens 접속
2. "Generate new token (classic)" 클릭
3. Note: `ms2-messenger-deploy` 입력
4. Expiration: 원하는 기간 선택
5. 권한: `repo` 전체 체크
6. "Generate token" 클릭
7. **토큰을 복사** (다시 볼 수 없음!)

#### 토큰 사용:
```bash
# push 시 사용자 이름: GitHub 사용자명 또는 이메일
# 비밀번호: 생성한 Personal Access Token
git push -u origin main
```

### 4. 배포 확인

배포 성공 후:
- https://github.com/aoperat/ms2-messenger 에서 코드 확인

---

## 🔄 다음부터는

저장소가 설정되면 이후 업데이트는:

```bash
git add .
git commit -m "커밋 메시지"
git push
```

으로 간단하게 배포할 수 있습니다!

