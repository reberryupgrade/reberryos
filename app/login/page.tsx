'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push(`/branch/${data.user.branchId}`);
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 20,
        padding: '48px 40px',
        width: 400,
        maxWidth: '90vw',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        border: '1px solid #334155',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            borderRadius: 16,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>R</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#6366f1' }}>REBERRYOS</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>마케팅 관리 시스템</div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 입력"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 10,
                color: '#f1f5f9',
                fontSize: 15,
                outline: 'none',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 10,
                color: '#f1f5f9',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#2d0f0f',
              border: '1px solid #ef4444',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              color: '#ef4444',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#475569' : 'linear-gradient(135deg, #6366f1, #818cf8)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#334155', fontSize: 12 }}>
          REBERRYOS v0.3
        </div>
      </div>
    </div>
  );
}
