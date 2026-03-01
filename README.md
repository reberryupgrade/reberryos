# REBERRYOS v0.3

마케팅 관리 시스템 - 의료/뷰티 마케팅 통합 관리 플랫폼

## 배포 방법

### 1. GitHub에 올리기

```bash
# GitHub에서 새 레포지토리 생성 (reberryos)
# 그 후:
cd reberryos
git init
git add .
git commit -m "REBERRYOS v0.3 initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reberryos.git
git push -u origin main
```

### 2. Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → "Add New Project"
2. GitHub 레포 선택 → "Import"
3. Environment Variables 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase anon key
   - `JWT_SECRET` → 아무 랜덤 문자열 (32자 이상)
4. "Deploy" 클릭

### 3. 초기 설정

배포 완료 후 브라우저에서:
```
https://your-app.vercel.app/api/auth/setup
```
→ 관리자 계정이 자동 생성됩니다.

### 4. 로그인

```
https://your-app.vercel.app/login
```
- 관리자: admin / admin1234
- 매니저: manager1 / 1234

⚠️ 배포 후 반드시 비밀번호를 변경하세요!

## 기술 스택

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth)
- Vercel (Hosting)
- TypeScript
- Recharts
