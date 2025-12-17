# Git 인증 문제 해결 방법

## 문제
- 현재 `idinosol1-web` 계정으로 인증되어 있음
- `aoperat` 저장소에 접근 권한이 없어 403 오류 발생

## 해결 방법

### 방법 1: Windows 자격 증명 관리자에서 삭제 (가장 쉬움)

1. **Windows 자격 증명 관리자 열기**
   - `Win + R` 키 누르기
   - `control /name Microsoft.CredentialManager` 입력
   - 또는: 설정 → 계정 → 자격 증명 관리자

2. **Windows 자격 증명 탭 클릭**

3. **GitHub 관련 자격 증명 찾기**
   - `git:https://github.com` 검색
   - 관련 항목들 모두 삭제

4. **다시 push 시도**
   ```bash
   git push -u origin main
   ```
   - 사용자 이름: `aoperat` 또는 GitHub 이메일
   - 비밀번호: Personal Access Token (아래 참조)

### 방법 2: Personal Access Token 생성 및 사용

1. **토큰 생성**
   - https://github.com/settings/tokens 접속
   - "Generate new token (classic)" 클릭
   - Note: `ms2-messenger-deploy` 입력
   - Expiration: 원하는 기간 선택
   - 권한: `repo` 전체 체크
   - "Generate token" 클릭
   - **토큰 복사** (다시 볼 수 없음!)

2. **Git Credential Manager로 저장**
   ```bash
   git config --global credential.helper manager-core
   ```

3. **push 시도**
   ```bash
   git push -u origin main
   ```
   - 사용자 이름: `aoperat`
   - 비밀번호: 생성한 토큰 입력

### 방법 3: URL에 토큰 직접 포함 (임시 방법)

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/aoperat/ms2-messenger.git
```

주의: 토큰이 히스토리에 남을 수 있으므로 추천하지 않음.

### 방법 4: PowerShell에서 자격 증명 삭제

PowerShell 관리자 권한으로 실행:
```powershell
cmdkey /list | Select-String "git"
cmdkey /delete:LegacyGeneric:target=git:https://github.com
```

