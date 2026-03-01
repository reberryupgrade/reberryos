'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBranchData } from '@/lib/useBranchData';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, YAxis } from 'recharts';

// ── Helpers ──
const today = () => new Date().toISOString().slice(0, 10);
const fmtW = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + '만원' : n >= 1000 ? (n / 1000).toFixed(0) + '천원' : n + '원';
const num = (v: any) => parseInt(String(v).replace(/[^0-9]/g, '')) || 0;

// ── Constants ──
const TABS = [
  { id: 'overview', label: '📊 전체 현황' },
  { id: 'performance', label: '📈 성과 추이' },
  { id: 'budget', label: '💰 예산/ROI' },
  { id: 'keywords', label: '🔍 키워드' },
  { id: 'maps', label: '🗺️ 지도 순위' },
  { id: 'experience', label: '✍️ 체험단' },
  { id: 'cafes', label: '☕ 카페' },
  { id: 'youtube', label: '▶️ 유튜브' },
  { id: 'shortform', label: '📱 숏폼' },
  { id: 'autocomplete', label: '🔤 자동완성' },
  { id: 'seo', label: '🌐 홈페이지 SEO' },
  { id: 'calendar', label: '📅 캘린더/할일' },
  { id: 'community', label: '당근/커뮤니티' },
  { id: 'inhouse', label: '🏠 원내 마케팅' },
  { id: 'offline', label: '📍 오프라인' },
];

const EVENT_TYPES = [
  { v: 'content', l: '📝 콘텐츠', c: '#6366f1' },
  { v: 'deadline', l: '⏰ 마감/종료', c: '#ef4444' },
  { v: 'report', l: '📊 보고서', c: '#f59e0b' },
  { v: 'task', l: '✅ 업무', c: '#10b981' },
  { v: 'meeting', l: '🤝 미팅', c: '#8b5cf6' },
];

const PRIORITY_OPTS = [
  { v: 'high', l: '🔴 긴급', c: '#ef4444' },
  { v: 'medium', l: '🟡 보통', c: '#f59e0b' },
  { v: 'low', l: '🟢 여유', c: '#10b981' },
];

const RANK_FIELDS = [
  { key: 'myBlogRank', label: '📝블로그', color: '#10b981' },
  { key: 'myPlaceRank', label: '📍플레이스', color: '#6366f1' },
  { key: 'rankCafe', label: '☕카페', color: '#f59e0b' },
  { key: 'rankKnowledge', label: '❓지식인', color: '#06b6d4' },
  { key: 'rankNews', label: '📰뉴스', color: '#64748b' },
  { key: 'rankPowerlink', label: '💎파워링크', color: '#22c55e' },
  { key: 'rankNaverMap', label: '🗺️N맵', color: '#ef4444' },
  { key: 'rankGoogle', label: '🌐G맵', color: '#3b82f6' },
  { key: 'rankKakao', label: '🟡K맵', color: '#eab308' },
];

// ── UI Components ──
function Btn({ children, onClick, color, style }: any) {
  return <button onClick={onClick} style={{ background: color || 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, ...style }}>{children}</button>;
}
function Inp({ value, onChange, type, placeholder, style }: any) {
  return <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '7px 11px', color: '#f1f5f9', fontSize: 13, width: '100%', boxSizing: 'border-box' as const, ...style }} />;
}
function FF({ label, children }: any) {
  return <div style={{ marginBottom: 12 }}><div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>{label}</div>{children}</div>;
}
function DelBtn({ onClick }: any) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>×</button>;
}
function Modal({ title, onClose, children, wide }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px', width: wide ? 600 : 420, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', border: '1px solid #334155' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function getDday(dateStr: string) {
  const t = new Date(dateStr); const n = new Date();
  t.setHours(0, 0, 0, 0); n.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - n.getTime()) / (1000 * 60 * 60 * 24));
}
function DdayBadge({ dateStr }: { dateStr: string }) {
  const d = getDday(dateStr);
  const color = d < 0 ? '#475569' : d === 0 ? '#ef4444' : d <= 3 ? '#ef4444' : d <= 7 ? '#f59e0b' : '#10b981';
  const bg = d < 0 ? '#1e293b' : d <= 3 ? '#2d0f0f' : d <= 7 ? '#422006' : '#022c22';
  const label = d < 0 ? `D+${Math.abs(d)}` : d === 0 ? 'D-Day' : `D-${d}`;
  return <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{label}</span>;
}

function RankBadge({ rank, color }: { rank: string; color: string }) {
  const n = num(rank);
  if (!n || rank === '-') return <span style={{ color: '#334155', fontSize: 11 }}>-</span>;
  const bg = n === 1 ? '#10b981' : n <= 3 ? color : n <= 5 ? '#f59e0b' : n <= 10 ? '#f97316' : '#ef4444';
  return <span style={{ background: bg + '22', color: bg, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{rank}</span>;
}

// ── Form Components (proper components, not inline hooks) ──
function KwForm({ initial, onSave }: any) {
  const [f, setF] = useState({
    keyword: initial?.keyword || '', monthlySearch: initial?.monthlySearch || '',
    myBlogRank: initial?.myBlogRank || '', myPlaceRank: initial?.myPlaceRank || '',
    rankCafe: initial?.rankCafe || '', rankKnowledge: initial?.rankKnowledge || '',
    rankNews: initial?.rankNews || '', rankPowerlink: initial?.rankPowerlink || '',
    rankNaverMap: initial?.rankNaverMap || '', rankGoogle: initial?.rankGoogle || '', rankKakao: initial?.rankKakao || '',
    status: initial?.status || 'warn',
  });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FF label="키워드"><Inp value={f.keyword} onChange={(v: string) => u('keyword', v)} placeholder="강남 피부과" /></FF>
        <FF label="월간 검색량"><Inp value={f.monthlySearch} onChange={(v: string) => u('monthlySearch', v)} placeholder="12000" /></FF>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>플랫폼별 순위</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {RANK_FIELDS.map(rf => (
          <div key={rf.key}>
            <div style={{ color: rf.color, fontSize: 11, marginBottom: 2 }}>{rf.label}</div>
            <Inp value={(f as any)[rf.key]} onChange={(v: string) => u(rf.key, v)} placeholder="-" />
          </div>
        ))}
      </div>
      <FF label="상태">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['good', '양호'], ['warn', '주의'], ['bad', '위험']].map(([v, l]) => (
            <button key={v} onClick={() => u('status', v)} style={{ flex: 1, background: f.status === v ? (v === 'good' ? '#10b981' : v === 'warn' ? '#f59e0b' : '#ef4444') : '#0f172a', color: f.status === v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{l}</button>
          ))}
        </div>
      </FF>
      <Btn onClick={() => onSave({ ...f, monthlySearch: num(f.monthlySearch) })} style={{ width: '100%', marginTop: 4 }}>저장</Btn>
    </div>
  );
}

function EventForm({ onSave }: any) {
  const [f, setF] = useState({ title: '', date: today(), type: 'content', channel: '전체' });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <FF label="일정 제목"><Inp value={f.title} onChange={(v: string) => u('title', v)} placeholder="블로그 포스팅 3건" /></FF>
      <FF label="날짜"><Inp type="date" value={f.date} onChange={(v: string) => u('date', v)} /></FF>
      <FF label="유형">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {EVENT_TYPES.map(t => (
            <button key={t.v} onClick={() => u('type', t.v)} style={{ background: f.type === t.v ? t.c : '#0f172a', color: f.type === t.v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t.l}</button>
          ))}
        </div>
      </FF>
      <Btn onClick={() => onSave(f)} style={{ width: '100%', marginTop: 4 }}>저장</Btn>
    </div>
  );
}

function TodoForm({ onSave }: any) {
  const [f, setF] = useState({ text: '', dueDate: today(), priority: 'medium', channel: '전체' });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <FF label="할 일"><Inp value={f.text} onChange={(v: string) => u('text', v)} placeholder="블로그 포스팅 3건 발행" /></FF>
      <FF label="마감일"><Inp type="date" value={f.dueDate} onChange={(v: string) => u('dueDate', v)} /></FF>
      <FF label="우선순위">
        <div style={{ display: 'flex', gap: 8 }}>
          {PRIORITY_OPTS.map(p => (
            <button key={p.v} onClick={() => u('priority', p.v)} style={{ flex: 1, background: f.priority === p.v ? p.c : '#0f172a', color: f.priority === p.v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{p.l}</button>
          ))}
        </div>
      </FF>
      <Btn onClick={() => onSave(f)} style={{ width: '100%', marginTop: 4 }}>저장</Btn>
    </div>
  );
}

function MapForm({ initial, onSave }: any) {
  const [f, setF] = useState({ keyword: initial?.keyword || '', naverPlace: initial?.naverPlace || '', google: initial?.google || '', kakao: initial?.kakao || '', status: initial?.status || 'warn' });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <FF label="키워드"><Inp value={f.keyword} onChange={(v: string) => u('keyword', v)} placeholder="강남 피부과" /></FF>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <FF label="네이버 플레이스"><Inp value={f.naverPlace} onChange={(v: string) => u('naverPlace', v)} placeholder="1위" /></FF>
        <FF label="구글 지도"><Inp value={f.google} onChange={(v: string) => u('google', v)} placeholder="3위" /></FF>
        <FF label="카카오 지도"><Inp value={f.kakao} onChange={(v: string) => u('kakao', v)} placeholder="2위" /></FF>
      </div>
      <Btn onClick={() => onSave(f)} style={{ width: '100%', marginTop: 4 }}>저장</Btn>
    </div>
  );
}

function ExpForm({ initial, onSave }: any) {
  const [f, setF] = useState({ blogger: initial?.blogger || '', title: initial?.title || '', url: initial?.url || '', date: initial?.date || today(), views: initial?.views || 0, status: initial?.status || 'wait' });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <FF label="블로거명"><Inp value={f.blogger} onChange={(v: string) => u('blogger', v)} placeholder="뷰티블로거A" /></FF>
      <FF label="제목"><Inp value={f.title} onChange={(v: string) => u('title', v)} placeholder="강남 피부과 방문 후기" /></FF>
      <FF label="URL"><Inp value={f.url} onChange={(v: string) => u('url', v)} placeholder="https://..." /></FF>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <FF label="발행일"><Inp type="date" value={f.date} onChange={(v: string) => u('date', v)} /></FF>
        <FF label="조회수"><Inp value={f.views} onChange={(v: string) => u('views', num(v))} /></FF>
        <FF label="상태">
          <div style={{ display: 'flex', gap: 4 }}>
            {[['wait', '대기'], ['done', '발행'], ['issue', '이슈']].map(([v, l]) => (
              <button key={v} onClick={() => u('status', v)} style={{ flex: 1, background: f.status === v ? '#6366f1' : '#0f172a', color: f.status === v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '5px', cursor: 'pointer', fontSize: 11 }}>{l}</button>
            ))}
          </div>
        </FF>
      </div>
      <Btn onClick={() => onSave(f)} style={{ width: '100%', marginTop: 4 }}>저장</Btn>
    </div>
  );
}

// ── Main Branch Page ──
export default function BranchPage() {
  const params = useParams();
  const branchId = params.id as string;
  const router = useRouter();
  const { data, upd, loading } = useBranchData(branchId);

  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState('overview');
  const [sidebar, setSidebar] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [calTab, setCalTab] = useState('calendar');
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });

  useEffect(() => {
    fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }) })
      .then(r => r.json()).then(d => { if (!d.user) router.push('/login'); else setUser(d.user); });
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('branches').select('*').eq('id', branchId).single().then(({ data: b }) => setBranchInfo(b));
    });
  }, [branchId, router]);

  const logout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    router.push('/login');
  };

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#6366f1', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>REBERRYOS</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>데이터 로딩 중...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar */}
      <div style={{ width: sidebar ? 200 : 56, background: '#1e293b', borderRight: '1px solid #334155', transition: 'width 0.2s', flexShrink: 0, display: 'flex', flexDirection: 'column' as const }}>
        <div style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #334155' }}>
          <button onClick={() => setSidebar(!sidebar)} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontWeight: 900, fontSize: 14 }}>R</button>
          {sidebar && <span style={{ fontWeight: 800, fontSize: 15, color: '#6366f1', whiteSpace: 'nowrap' as const }}>REBERRYOS</span>}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 6px' }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setTab(t.id)} style={{
              padding: sidebar ? '8px 10px' : '8px 6px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              background: tab === t.id ? '#6366f122' : 'transparent', color: tab === t.id ? '#6366f1' : '#94a3b8',
              fontWeight: tab === t.id ? 700 : 400, fontSize: sidebar ? 13 : 16, whiteSpace: 'nowrap' as const, overflow: 'hidden',
              textAlign: sidebar ? 'left' as const : 'center' as const,
            }}>
              {sidebar ? t.label : t.label.slice(0, 2)}
            </div>
          ))}
        </div>
        <div style={{ padding: 8, borderTop: '1px solid #334155' }}>
          {user?.role === 'admin' && (
            <div onClick={() => router.push('/dashboard')} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', color: '#64748b', fontSize: 12, textAlign: 'center' as const }}>
              {sidebar ? '← 지점 목록' : '←'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, zIndex: 100 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{branchInfo?.name || '지점'}</span>
            <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>{branchInfo?.clinic_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>👤 {user?.name}</span>
            <button onClick={logout} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>로그아웃</button>
          </div>
        </div>

        <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 12, marginBottom: 24 }}>
                {[
                  { title: '키워드', value: data.keywords.length + '개', color: '#6366f1' },
                  { title: '지도 키워드', value: data.maps.length + '개', color: '#10b981' },
                  { title: '체험단', value: data.experiences.length + '건', color: '#f59e0b' },
                  { title: 'SEO 페이지', value: data.seoPages.length + '개', color: '#ef4444' },
                  { title: '할 일', value: (data.todos.filter((t: any) => !t.done).length) + '건 남음', color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '15px 18px', flex: '1 1 110px' }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
                {TABS.slice(3).map((t, i) => (
                  <div key={i} onClick={() => setTab(t.id)} style={{ background: '#1e293b', borderRadius: 12, padding: '13px 15px', cursor: 'pointer', border: '1px solid #334155' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{t.label}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>클릭하여 이동</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KEYWORDS */}
          {tab === 'keywords' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>키워드 관리 ({data.keywords.length})</div>
                <Btn onClick={() => setModal('addKw')}>+ 키워드</Btn>
              </div>
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={{ textAlign: 'left' as const, padding: '8px', color: '#94a3b8' }}>키워드</th>
                      <th style={{ padding: '8px', color: '#94a3b8' }}>검색량</th>
                      {RANK_FIELDS.map(rf => <th key={rf.key} style={{ padding: '4px', color: rf.color, fontSize: 10 }}>{rf.label}</th>)}
                      <th style={{ padding: '8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keywords.map((kw: any) => (
                      <tr key={kw.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{kw.keyword}</td>
                        <td style={{ padding: '8px', textAlign: 'center' as const, color: '#64748b' }}>{kw.monthlySearch?.toLocaleString()}</td>
                        {RANK_FIELDS.map(rf => <td key={rf.key} style={{ textAlign: 'center' as const }}><RankBadge rank={(kw as any)[rf.key] || '-'} color={rf.color} /></td>)}
                        <td><DelBtn onClick={() => upd('keywords', data.keywords.filter((k: any) => k.id !== kw.id))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.keywords.length && <div style={{ textAlign: 'center' as const, padding: 40, color: '#475569' }}>키워드를 추가해주세요</div>}
              {modal === 'addKw' && <Modal title="🔍 키워드 추가" onClose={() => setModal(null)} wide><KwForm onSave={(f: any) => { upd('keywords', [...data.keywords, { ...f, id: crypto.randomUUID() }]); setModal(null); }} /></Modal>}
            </div>
          )}

          {/* MAPS */}
          {tab === 'maps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>지도 순위 ({data.maps.length})</div>
                <Btn onClick={() => setModal('addMap')}>+ 지도 키워드</Btn>
              </div>
              {data.maps.map((m: any) => (
                <div key={m.id} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontWeight: 700, flex: 1 }}>{m.keyword}</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ textAlign: 'center' as const }}><div style={{ color: '#6366f1', fontSize: 10 }}>네이버</div><RankBadge rank={m.naverPlace} color="#6366f1" /></div>
                    <div style={{ textAlign: 'center' as const }}><div style={{ color: '#3b82f6', fontSize: 10 }}>구글</div><RankBadge rank={m.google} color="#3b82f6" /></div>
                    <div style={{ textAlign: 'center' as const }}><div style={{ color: '#eab308', fontSize: 10 }}>카카오</div><RankBadge rank={m.kakao} color="#eab308" /></div>
                  </div>
                  <DelBtn onClick={() => upd('maps', data.maps.filter((x: any) => x.id !== m.id))} />
                </div>
              ))}
              {!data.maps.length && <div style={{ textAlign: 'center' as const, padding: 40, color: '#475569' }}>지도 키워드를 추가해주세요</div>}
              {modal === 'addMap' && <Modal title="🗺️ 지도 키워드 추가" onClose={() => setModal(null)}><MapForm onSave={(f: any) => { upd('maps', [...data.maps, { ...f, id: crypto.randomUUID() }]); setModal(null); }} /></Modal>}
            </div>
          )}

          {/* EXPERIENCE */}
          {tab === 'experience' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>체험단 ({data.experiences.length})</div>
                <Btn onClick={() => setModal('addExp')}>+ 체험단</Btn>
              </div>
              {data.experiences.map((e: any) => (
                <div key={e.id} style={{ background: '#1e293b', borderRadius: 10, padding: '12px 16px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${e.status === 'done' ? '#10b981' : e.status === 'issue' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title || '(제목 없음)'}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{e.blogger} · {e.date} · 조회 {e.views}</div>
                  </div>
                  <DelBtn onClick={() => upd('experiences', data.experiences.filter((x: any) => x.id !== e.id))} />
                </div>
              ))}
              {!data.experiences.length && <div style={{ textAlign: 'center' as const, padding: 40, color: '#475569' }}>체험단 데이터를 추가해주세요</div>}
              {modal === 'addExp' && <Modal title="✍️ 체험단 추가" onClose={() => setModal(null)}><ExpForm onSave={(f: any) => { upd('experiences', [...data.experiences, { ...f, id: crypto.randomUUID() }]); setModal(null); }} /></Modal>}
            </div>
          )}

          {/* CALENDAR */}
          {tab === 'calendar' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button onClick={() => setCalTab('calendar')} style={{ background: calTab === 'calendar' ? '#6366f1' : '#1e293b', color: calTab === 'calendar' ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>📅 캘린더</button>
                <button onClick={() => setCalTab('todos')} style={{ background: calTab === 'todos' ? '#6366f1' : '#1e293b', color: calTab === 'todos' ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>✅ 할 일</button>
              </div>

              {calTab === 'calendar' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <button onClick={() => setCalMonth(p => { let m = p.m - 1, y = p.y; if (m < 0) { m = 11; y--; } return { y, m }; })} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 16 }}>‹</button>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{calMonth.y}년 {calMonth.m + 1}월</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn onClick={() => setModal('addEvent')} style={{ padding: '6px 12px', fontSize: 12 }}>+ 일정</Btn>
                      <Btn onClick={() => setModal('addTodo')} color="#f59e0b" style={{ padding: '6px 12px', fontSize: 12 }}>+ 할 일</Btn>
                      <button onClick={() => setCalMonth(p => { let m = p.m + 1, y = p.y; if (m > 11) { m = 0; y++; } return { y, m }; })} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 16 }}>›</button>
                    </div>
                  </div>
                  {/* Calendar Grid */}
                  {(() => {
                    const firstDay = new Date(calMonth.y, calMonth.m, 1).getDay();
                    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
                    const todayStr = today();
                    const cells: (number | null)[] = [];
                    for (let i = 0; i < firstDay; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    const events = data.calendarEvents || [];
                    const todos = data.todos || [];
                    return (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                            <div key={i} style={{ textAlign: 'center' as const, padding: '6px', color: i === 0 ? '#ef4444' : i === 6 ? '#6366f1' : '#64748b', fontSize: 12, fontWeight: 700 }}>{d}</div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                          {cells.map((d, i) => {
                            if (!d) return <div key={i} style={{ background: '#0a0f1e', borderRadius: 6, minHeight: 80 }} />;
                            const dateStr = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const dayEvents = events.filter((e: any) => e.date === dateStr);
                            const dayTodos = todos.filter((t: any) => t.dueDate === dateStr);
                            const isToday = dateStr === todayStr;
                            const dow = new Date(calMonth.y, calMonth.m, d).getDay();
                            return (
                              <div key={i} style={{ background: isToday ? '#1e1b4b' : '#0f172a', borderRadius: 6, minHeight: 80, padding: '4px 6px', border: isToday ? '1px solid #6366f1' : '1px solid #1e293b' }}>
                                <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? '#6366f1' : dow === 0 ? '#ef4444' : dow === 6 ? '#818cf8' : '#94a3b8', marginBottom: 2 }}>{d}</div>
                                {dayEvents.slice(0, 2).map((ev: any) => {
                                  const et = EVENT_TYPES.find(t => t.v === ev.type);
                                  return <div key={ev.id} style={{ background: (et?.c || '#6366f1') + '22', borderLeft: `2px solid ${et?.c || '#6366f1'}`, borderRadius: 3, padding: '1px 5px', marginBottom: 2, fontSize: 10, color: ev.done ? '#475569' : et?.c, textDecoration: ev.done ? 'line-through' : 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} onClick={() => upd('calendarEvents', events.map((e: any) => e.id === ev.id ? { ...e, done: !e.done } : e))}>{ev.title}</div>;
                                })}
                                {dayTodos.slice(0, 2).map((t: any) => {
                                  const pr = PRIORITY_OPTS.find(p => p.v === t.priority);
                                  return <div key={t.id} style={{ background: (pr?.c || '#f59e0b') + '15', borderLeft: `2px solid ${pr?.c || '#f59e0b'}`, borderRadius: 3, padding: '1px 5px', marginBottom: 2, fontSize: 10, color: t.done ? '#475569' : pr?.c, textDecoration: t.done ? 'line-through' : 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} onClick={() => upd('todos', todos.map((x: any) => x.id === t.id ? { ...x, done: !x.done } : x))}>✓ {t.text}</div>;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  {modal === 'addEvent' && <Modal title="📅 일정 추가" onClose={() => setModal(null)}><EventForm onSave={(f: any) => { upd('calendarEvents', [...(data.calendarEvents || []), { ...f, id: crypto.randomUUID(), done: false }]); setModal(null); }} /></Modal>}
                  {modal === 'addTodo' && <Modal title="✅ 할 일 추가" onClose={() => setModal(null)}><TodoForm onSave={(f: any) => { upd('todos', [...(data.todos || []), { ...f, id: crypto.randomUUID(), done: false }]); setModal(null); }} /></Modal>}
                </div>
              )}

              {calTab === 'todos' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div><span style={{ fontWeight: 800, fontSize: 16 }}>할 일</span><span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>{data.todos.filter((t: any) => !t.done).length}건 남음</span></div>
                    <Btn onClick={() => setModal('addTodo2')}>+ 할 일</Btn>
                  </div>
                  {data.todos.filter((t: any) => !t.done).sort((a: any, b: any) => { const po: any = { high: 0, medium: 1, low: 2 }; return (po[a.priority] || 1) - (po[b.priority] || 1); }).map((todo: any) => {
                    const pr = PRIORITY_OPTS.find(p => p.v === todo.priority);
                    return (
                      <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0f172a', borderRadius: 10, marginBottom: 6, borderLeft: `3px solid ${pr?.c || '#f59e0b'}` }}>
                        <button onClick={() => upd('todos', data.todos.map((t: any) => t.id === todo.id ? { ...t, done: true } : t))} style={{ background: 'none', border: `2px solid ${pr?.c || '#64748b'}`, borderRadius: 6, width: 22, height: 22, cursor: 'pointer', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{todo.text}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <span style={{ background: (pr?.c || '#f59e0b') + '22', color: pr?.c, borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{pr?.l}</span>
                            <span style={{ color: '#475569', fontSize: 11 }}>마감 {todo.dueDate?.slice(5)}</span>
                          </div>
                        </div>
                        <DdayBadge dateStr={todo.dueDate} />
                        <DelBtn onClick={() => upd('todos', data.todos.filter((t: any) => t.id !== todo.id))} />
                      </div>
                    );
                  })}
                  {data.todos.filter((t: any) => t.done).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ color: '#475569', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>✅ 완료</div>
                      {data.todos.filter((t: any) => t.done).map((t: any) => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#0f172a', borderRadius: 8, marginBottom: 4, opacity: 0.5 }}>
                          <button onClick={() => upd('todos', data.todos.map((x: any) => x.id === t.id ? { ...x, done: false } : x))} style={{ background: '#10b981', border: 'none', borderRadius: 6, width: 20, height: 20, cursor: 'pointer', color: '#fff', fontSize: 11 }}>✓</button>
                          <span style={{ textDecoration: 'line-through', color: '#475569', fontSize: 13, flex: 1 }}>{t.text}</span>
                          <DelBtn onClick={() => upd('todos', data.todos.filter((x: any) => x.id !== t.id))} />
                        </div>
                      ))}
                    </div>
                  )}
                  {modal === 'addTodo2' && <Modal title="✅ 할 일 추가" onClose={() => setModal(null)}><TodoForm onSave={(f: any) => { upd('todos', [...data.todos, { ...f, id: crypto.randomUUID(), done: false }]); setModal(null); }} /></Modal>}
                </div>
              )}
            </div>
          )}

          {/* Placeholder for other tabs */}
          {['performance', 'budget', 'cafes', 'youtube', 'shortform', 'autocomplete', 'seo', 'community', 'inhouse', 'offline'].includes(tab) && (
            <div style={{ textAlign: 'center' as const, padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{TABS.find(t => t.id === tab)?.label.slice(0, 2)}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{TABS.find(t => t.id === tab)?.label}</div>
              <div style={{ color: '#64748b', fontSize: 14 }}>이 탭은 다음 업데이트에서 추가됩니다</div>
              <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>현재 기능: 키워드, 지도 순위, 체험단, 캘린더/할일</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
