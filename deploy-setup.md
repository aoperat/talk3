# 새로운 Git 저장소 설정 가이드

## 현재 상태
- 프로젝트 이름: `ms2-messenger` (package.json 기준)
- 현재 원격 저장소: `https://github.com/aoperat/ms2.git`

## 새 저장소로 변경하기

### 1. GitHub에서 새 저장소 생성
1. https://github.com/new 접속
2. Repository name: 원하는 이름 입력 (예: `ms2-messenger`)
3. Public 또는 Private 선택
4. **주의:** "Initialize this repository with a README" 체크하지 않기
5. "Create repository" 클릭

### 2. 로컬 Git 원격 저장소 URL 변경

#### 저장소 이름이 `ms2-messenger`인 경우:
```bash
git remote set-url origin https://github.com/aoperat/ms2-messenger.git
```

#### 다른 이름을 사용하는 경우:
```bash
git remote set-url origin https://github.com/aoperat/새로운저장소이름.git
```

### 3. 원격 저장소 확인
```bash
git remote -v
```

### 4. 첫 배포
```bash
# 브랜치 확인
git branch

# 메인 브랜치로 푸시
git push -u origin main

# 또는 다른 브랜치 이름인 경우
git push -u origin master
```

### 5. 인증 설정 (필요한 경우)
Personal Access Token 생성:
1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. `repo` 권한 체크
4. 토큰 생성 후 복사
5. push 시 비밀번호 대신 토큰 입력

## 저장소 이름 변경 예시

### 예시 1: ms2-messenger
```bash
git remote set-url origin https://github.com/aoperat/ms2-messenger.git
git push -u origin main
```

### 예시 2: english-buddy
```bash
git remote set-url origin https://github.com/aoperat/english-buddy.git
git push -u origin main
```

### 예시 3: private-messenger
```bash
git remote set-url origin https://github.com/aoperat/private-messenger.git
git push -u origin main
```

