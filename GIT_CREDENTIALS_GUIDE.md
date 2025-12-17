# Git 자격 증명 제거 및 재설정 가이드

## 🔍 1단계: 현재 저장된 자격 증명 확인

PowerShell에서 실행:
```powershell
cmdkey /list | Select-String -Pattern "git|github" -CaseSensitive:$false
```

또는 모든 자격 증명 확인:
```powershell
cmdkey /list
```

---

## 🗑️ 2단계: 기존 자격 증명 제거

### 방법 A: PowerShell 명령어로 삭제 (빠른 방법)

다음 명령어들을 순서대로 실행:

```powershell
# GitHub 일반 자격 증명 삭제
cmdkey /delete:"LegacyGeneric:target=https://github.com/"

# idinosol1-web 계정 자격 증명 삭제
cmdkey /delete:"LegacyGeneric:target=git:https://idinosol1-web@github.com"

# Visual Studio 관련 자격 증명 삭제 (있는 경우)
cmdkey /delete:"LegacyGeneric:target=GitHub for Visual Studio - https://idinosol1-web@github.com/"
```

### 방법 B: Windows 자격 증명 관리자에서 수동 삭제 (확실한 방법)

1. **자격 증명 관리자 열기**
   - `Win + R` 키 누르기
   - `control /name Microsoft.CredentialManager` 입력 후 Enter
   - 또는: 설정 → 계정 → 자격 증명 관리자 → Windows 자격 증명

2. **GitHub 관련 자격 증명 찾기**
   - 목록에서 다음 항목들 찾기:
     - `git:https://github.com`
     - `https://github.com/`
     - `GitHub for Visual Studio - https://idinosol1-web@github.com/`
     - `git:https://idinosol1-web@github.com`

3. **자격 증명 삭제**
   - 각 항목 클릭 → "제거" 또는 "편집" → "제거" 클릭

---

## ✅ 3단계: 자격 증명 제거 확인

다시 확인해서 GitHub 관련 자격 증명이 없어졌는지 확인:

```powershell
cmdkey /list | Select-String -Pattern "git|github" -CaseSensitive:$false
```

아무것도 나오지 않으면 성공!

---

## 🔐 4단계: GitHub Personal Access Token 생성

1. **GitHub 토큰 페이지 접속**
   - https://github.com/settings/tokens 접속
   - 로그인 필요 (`aoperat` 계정으로)

2. **토큰 생성**
   - "Generate new token (classic)" 클릭
   - 또는: "Tokens (classic)" → "Generate new token" → "Generate new token (classic)"

3. **토큰 설정**
   - **Note**: `ms2-messenger-deploy` (설명)
   - **Expiration**: 원하는 기간 선택 (예: 90 days, 1 year)
   - **권한 선택**: `repo` 섹션 전체 체크
     - repo
     - repo:status
     - repo_deployment
     - public_repo
     - repo:invite
     - security_events

4. **토큰 생성**
   - 페이지 하단 "Generate token" 클릭
   - **⚠️ 중요**: 생성된 토큰을 **반드시 복사** (다시 볼 수 없음!)
   - 안전한 곳에 저장 (예: 메모장, 비밀번호 관리자)

---

## 🔄 5단계: Git Credential Manager 설정

```powershell
# Credential Manager 활성화 (이미 되어있을 수 있음)
git config --global credential.helper manager-core

# 확인
git config --global credential.helper
```

---

## 🚀 6단계: 저장소로 push (자동 저장)

첫 push 시 자격 증명 입력 창이 뜹니다:

```powershell
git push -u origin main
```

**입력할 정보:**
- **사용자 이름**: `aoperat` (GitHub 사용자명)
- **비밀번호**: 생성한 Personal Access Token (토큰 복사본 붙여넣기)

⚠️ 비밀번호는 일반 비밀번호가 **아니라** Personal Access Token입니다!

입력하면 자격 증명이 자동으로 저장되어 다음부터는 자동으로 사용됩니다.

---

## ✅ 7단계: 배포 확인

```powershell
# Push 성공 확인
git push -u origin main

# 원격 저장소 확인
git remote -v

# 연결 테스트
git ls-remote origin
```

성공 메시지 예시:
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
...
To https://github.com/aoperat/ms2-messenger.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## 🔧 문제 해결

### 문제: 여전히 idinosol1-web 계정으로 시도함

**해결:**
```powershell
# 모든 자격 증명 다시 확인
cmdkey /list

# 남아있는 것들 수동 삭제
cmdkey /delete:"항목이름"
```

### 문제: 자격 증명 입력 창이 안 뜸

**해결:**
```powershell
# Credential helper 초기화
git config --global --unset credential.helper
git config --global credential.helper manager-core

# 또는 URL에 사용자명 명시
git remote set-url origin https://aoperat@github.com/aoperat/ms2-messenger.git
```

### 문제: 토큰을 잃어버림

**해결:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. 기존 토큰 삭제
3. 새 토큰 생성 (4단계 반복)

---

## 📝 요약

1. ✅ 기존 자격 증명 확인 및 제거
2. ✅ GitHub Personal Access Token 생성
3. ✅ Git Credential Manager 설정
4. ✅ `git push` 실행하여 새 자격 증명 입력
5. ✅ 자동 저장 확인

