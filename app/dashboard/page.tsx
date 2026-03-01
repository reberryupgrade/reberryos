'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  branchId: string | null;
}

interface Branch {
  id: string;
  name: string;
  clinic_name: string;
  created_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', clinic_name: '' });
  const router = useRouter();

  useEffect(() => {
    loadUser();
    loadBranches();
  }, []);

  const loadUser = async () => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me' }),
    });
    const data = await res.json();
    if (!data.user) { router.push('/login'); return; }
    if (data.user.role !== 'admin') { router.push(`/branch/${data.user.branchId}`); return; }
    setUser(data.user);
    setLoading(false);
  };

  const loadBranches = async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('branches').select('*').order('created_at');
    setBranches(data || []);
  };

  const addBranch = async () => {
    if (!newBranch.name) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('branches').insert(newBranch);
    setNewBranch({ name: '', clinic_name: '' });
    setShowAdd(false);
    loadBranches();
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('이 지점을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.')) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('branches').delete().eq('id', id);
    loadBranches();
  };

  const logout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1', fontSize: 18, fontWeight: 700 }}>REBERRYOS 로딩 중...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#fff', fontSize: 16
          }}>R</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>REBERRYOS</span>
          <span style={{ color: '#475569', fontSize: 13 }}>통합 관리</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>👤 {user?.name}</span>
          <button onClick={logout} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
            로그아웃
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>지점 관리</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>총 {branches.length}개 지점</p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            border: 'none', color: '#fff', borderRadius: 10, padding: '10px 20px',
            cursor: 'pointer', fontSize: 14, fontWeight: 700
          }}>+ 지점 추가</button>
        </div>

        {/* Add Branch Modal */}
        {showAdd && (
          <div style={{ background: '#1e293b', borderRadius: 14, padding: '20px', marginBottom: 20, border: '1px solid #334155' }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>새 지점 추가</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                value={newBranch.name}
                onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                placeholder="지점명 (예: 강남점)"
                style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14 }}
                autoFocus
              />
              <input
                value={newBranch.clinic_name}
                onChange={e => setNewBranch({ ...newBranch, clinic_name: e.target.value })}
                placeholder="병원명 (예: OO피부과)"
                style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14 }}
              />
              <button onClick={addBranch} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>추가</button>
              <button onClick={() => setShowAdd(false)} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>취소</button>
            </div>
          </div>
        )}

        {/* Branch Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {branches.map(branch => (
            <div
              key={branch.id}
              style={{
                background: '#1e293b',
                borderRadius: 14,
                padding: '24px',
                border: '1px solid #334155',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => router.push(`/branch/${branch.id}`)}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{branch.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{branch.clinic_name || '-'}</div>
                </div>
                <div style={{
                  width: 44, height: 44,
                  background: 'linear-gradient(135deg, #6366f122, #818cf822)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20
                }}>🏥</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ color: '#6366f1', fontSize: 13, fontWeight: 600 }}>관리 →</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteBranch(branch.id); }}
                  style={{ background: '#334155', border: 'none', color: '#64748b', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}
                >삭제</button>
              </div>
            </div>
          ))}
        </div>

        {branches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
            <div style={{ fontSize: 16 }}>등록된 지점이 없습니다</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>+ 지점 추가 버튼으로 시작하세요</div>
          </div>
        )}
      </div>
    </div>
  );
}
