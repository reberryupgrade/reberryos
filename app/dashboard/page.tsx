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

interface DBUser {
  id: string;
  username: string;
  name: string;
  role: string;
  branch_id: string | null;
  created_at: string;
  last_login: string | null;
}

interface Branch {
  id: string;
  name: string;
  clinic_name: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: '통합관리자', color: '#6366f1' },
  manager: { label: '지점관리자', color: '#10b981' },
  client: { label: '클라이언트', color: '#f59e0b' },
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'branches' | 'users'>('branches');

  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', clinic_name: '' });

  const [showAddUser, setShowAddUser] = useState(false);
  const [showResetPw, setShowResetPw] = useState<string | null>(null);
  const [showEditUser, setShowEditUser] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', role: '', branchId: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'manager', branchId: '' });
  const [resetPw, setResetPw] = useState('');
  const [msg, setMsg] = useState('');

  const router = useRouter();

  useEffect(() => {
    loadUser();
    loadBranches();
    loadUsers();
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

  const loadUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.users || []);
  };

  const addBranch = async () => {
    if (!newBranch.name) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('branches').insert(newBranch);
    setNewBranch({ name: '', clinic_name: '' });
    setShowAddBranch(false);
    loadBranches();
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('이 지점을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.')) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('branches').delete().eq('id', id);
    loadBranches();
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      setMsg('모든 필드를 입력하세요.'); return;
    }
    setMsg('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...newUser }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || '생성 실패'); return; }
    setNewUser({ username: '', password: '', name: '', role: 'manager', branchId: '' });
    setShowAddUser(false);
    setMsg('');
    loadUsers();
  };

  const deleteUser = async (id: string, username: string) => {
    if (username === 'admin') { alert('관리자 계정은 삭제할 수 없습니다.'); return; }
    if (!confirm(`${username} 계정을 삭제하시겠습니까?`)) return;
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    loadUsers();
  };

  const openEditUser = (u: DBUser) => {
    setEditData({ name: u.name, role: u.role, branchId: u.branch_id || '' });
    setShowEditUser(u.id);
    setMsg('');
  };

  const updateUser = async () => {
    if (!showEditUser || !editData.name) { setMsg('이름을 입력하세요.'); return; }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: showEditUser, name: editData.name, role: editData.role, branchId: editData.branchId || null }),
    });
    if (res.ok) {
      setShowEditUser(null);
      setMsg('');
      loadUsers();
    } else {
      const data = await res.json();
      setMsg(data.error || '수정 실패');
    }
  };

  const resetPassword = async (id: string) => {
    if (!resetPw || resetPw.length < 4) { setMsg('비밀번호를 4자 이상 입력하세요.'); return; }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetPassword', id, password: resetPw }),
    });
    if (res.ok) {
      setShowResetPw(null);
      setResetPw('');
      setMsg('');
      alert('비밀번호가 변경되었습니다.');
    } else {
      setMsg('변경 실패');
    }
  };

  const logout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return '-';
    return branches.find(b => b.id === branchId)?.name || '-';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
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
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>R</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>REBERRYOS</span>
          <span style={{ color: '#475569', fontSize: 13 }}>통합 관리</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>👤 {user?.name}</span>
          <button onClick={logout} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>로그아웃</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['branches', 'users'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? '#6366f1' : '#1e293b',
              color: activeTab === t ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: 10, padding: '10px 24px',
              cursor: 'pointer', fontWeight: 700, fontSize: 15,
            }}>{t === 'branches' ? '🏥 지점 관리' : '👤 유저 관리'}</button>
          ))}
        </div>

        {/* ── BRANCHES ── */}
        {activeTab === 'branches' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>지점 관리</h2>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>총 {branches.length}개 지점</p>
              </div>
              <button onClick={() => setShowAddBranch(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+ 지점 추가</button>
            </div>

            {showAddBranch && (
              <div style={{ background: '#1e293b', borderRadius: 14, padding: '20px', marginBottom: 20, border: '1px solid #334155' }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>새 지점 추가</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <input value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} placeholder="지점명 (예: 강남점)" style={{ ...inputStyle, flex: 1, minWidth: 200 }} autoFocus />
                  <input value={newBranch.clinic_name} onChange={e => setNewBranch({ ...newBranch, clinic_name: e.target.value })} placeholder="병원명 (예: OO피부과)" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                  <button onClick={addBranch} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>추가</button>
                  <button onClick={() => setShowAddBranch(false)} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>취소</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {branches.map(branch => (
                <div key={branch.id} style={{ background: '#1e293b', borderRadius: 14, padding: '24px', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => router.push(`/branch/${branch.id}`)}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{branch.name}</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{branch.clinic_name || '-'}</div>
                    </div>
                    <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f122, #818cf822)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏥</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <span style={{ color: '#6366f1', fontSize: 13, fontWeight: 600 }}>관리 →</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteBranch(branch.id); }} style={{ background: '#334155', border: 'none', color: '#64748b', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>유저 관리</h2>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>총 {users.length}명</p>
              </div>
              <button onClick={() => { setShowAddUser(true); setMsg(''); }} style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+ 유저 추가</button>
            </div>

            {showAddUser && (
              <div style={{ background: '#1e293b', borderRadius: 14, padding: '24px', marginBottom: 20, border: '1px solid #334155' }}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>새 유저 추가</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>아이디 *</div>
                    <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="login_id" style={inputStyle} autoFocus />
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>비밀번호 *</div>
                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="1234" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>이름 *</div>
                    <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="홍길동" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>권한</div>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={inputStyle}>
                      <option value="admin">통합관리자</option>
                      <option value="manager">지점관리자</option>
                      <option value="client">클라이언트</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>소속 지점</div>
                    <select value={newUser.branchId} onChange={e => setNewUser({ ...newUser, branchId: e.target.value })} style={inputStyle}>
                      <option value="">없음 (통합관리자)</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name} - {b.clinic_name}</option>)}
                    </select>
                  </div>
                </div>
                {msg && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{msg}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={addUser} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>생성</button>
                  <button onClick={() => { setShowAddUser(false); setMsg(''); }} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}>취소</button>
                </div>
              </div>
            )}

            {/* User List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => {
                const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: '#64748b' };
                return (
                  <div key={u.id} style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${roleInfo.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {u.role === 'admin' ? '👑' : u.role === 'manager' ? '👤' : '🏷️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9' }}>{u.name}</span>
                        <span style={{ background: `${roleInfo.color}22`, color: roleInfo.color, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{roleInfo.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: 12, flexWrap: 'wrap' }}>
                        <span>ID: {u.username}</span>
                        <span>지점: {getBranchName(u.branch_id)}</span>
                        <span>최근: {u.last_login ? new Date(u.last_login).toLocaleDateString('ko') : '없음'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEditUser(u)}
                        style={{ background: '#1e1b4b', border: '1px solid #6366f133', color: '#818cf8', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>✏️ 편집</button>
                      <button onClick={() => { setShowResetPw(u.id); setResetPw(''); setMsg(''); }}
                        style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>🔑 비밀번호</button>
                      {u.username !== 'admin' && (
                        <button onClick={() => deleteUser(u.id, u.username)}
                          style={{ background: '#1e0f0f', border: '1px solid #ef444433', color: '#ef4444', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>삭제</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reset Password Modal */}
            {showResetPw && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowResetPw(null)}>
                <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px', width: 380, border: '1px solid #334155' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>🔑 비밀번호 변경</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
                    {users.find(u => u.id === showResetPw)?.name} ({users.find(u => u.id === showResetPw)?.username})
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>새 비밀번호</div>
                  <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="새 비밀번호 (4자 이상)" style={inputStyle} autoFocus />
                  {msg && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{msg}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button onClick={() => resetPassword(showResetPw)} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14, flex: 1 }}>변경</button>
                    <button onClick={() => setShowResetPw(null)} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>취소</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit User Modal */}
            {showEditUser && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowEditUser(null)}>
                <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px', width: 420, border: '1px solid #334155' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>✏️ 유저 편집</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                    {users.find(u => u.id === showEditUser)?.username}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>이름</div>
                      <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>권한</div>
                      <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} style={inputStyle}>
                        <option value="admin">통합관리자</option>
                        <option value="manager">지점관리자</option>
                        <option value="client">클라이언트</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>소속 지점</div>
                      <select value={editData.branchId} onChange={e => setEditData({ ...editData, branchId: e.target.value })} style={inputStyle}>
                        <option value="">없음</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name} - {b.clinic_name}</option>)}
                      </select>
                    </div>
                  </div>
                  {msg && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{msg}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button onClick={updateUser} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14, flex: 1 }}>저장</button>
                    <button onClick={() => setShowEditUser(null)} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>취소</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
