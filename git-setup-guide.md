# Git 원격 저장소 설정 가이드

## 현재 상황
- 원격 저장소: `https://github.com/aoperat/ms2.git`
- 오류: Repository not found

## 해결 방법

### 1. GitHub 저장소 확인
1. https://github.com/aoperat/ms2 에 접속하여 저장소가 존재하는지 확인
2. 저장소가 없다면 생성 필요

### 2. GitHub 저장소 생성 (없는 경우)
1. https://github.com/new 접속
2. Repository name: `ms2` 입력
3. Public 또는 Private 선택
4. "Create repository" 클릭
5. 저장소 생성 후 아래 명령 실행

### 3. Personal Access Token 설정 (인증 문제인 경우)

#### 토큰 생성:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. Note: `ms2-deploy` 입력
4. Expiration: 원하는 기간 선택
5. 권한 선택: `repo` (전체 체크)
6. "Generate token" 클릭
7. **토큰을 복사해 안전한 곳에 보관** (다시 볼 수 없음)

#### Git에 토큰 설정:
```bash
# 원격 저장소 URL에 토큰 포함 (한 번만 실행)
git remote set-url origin https://YOUR_TOKEN@github.com/aoperat/ms2.git

# 또는 Git Credential Manager 사용
git config --global credential.helper manager-core
```

### 4. SSH 방식으로 변경 (권장)

#### SSH 키 생성 (없는 경우):
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Enter를 눌러 기본 위치에 저장
```

#### SSH 키를 GitHub에 추가:
1. 생성된 키 내용 확인:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. GitHub → Settings → SSH and GPG keys → New SSH key
3. 복사한 키 붙여넣기

#### 원격 저장소 URL을 SSH로 변경:
```bash
git remote set-url origin git@github.com:aoperat/ms2.git
```

### 5. 저장소가 다른 이름인 경우
```bash
# 올바른 저장소 이름으로 변경
git remote set-url origin https://github.com/aoperat/올바른저장소이름.git
```

## 확인
```bash
# 원격 저장소 확인
git remote -v

# 연결 테스트
git ls-remote origin
```

