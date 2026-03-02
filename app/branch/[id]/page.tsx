'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBranchData } from '@/lib/useBranchData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

// ===== CONSTANTS =====
const TAB_TYPES = ["블로그","지식인","카페","플레이스","뉴스","파워링크"];
const COMM_PLATFORMS = ["당근마켓","에브리타임","맘카페","지역카페"];
const TABS = [
  {id:"overview",label:"전체 현황",icon:"📊"},
  {id:"performance",label:"성과 추이",icon:"📈"},
  {id:"portal",label:"클라이언트 포털",icon:"🔗"},
  {id:"budget",label:"마케팅 비용",icon:"💰"},
  {id:"keywords",label:"네이버 키워드",icon:"🔍"},
  {id:"maps",label:"지도 노출",icon:"📍"},
  {id:"experience",label:"체험단",icon:"✍️"},
  {id:"cafes",label:"카페 바이럴",icon:"☕"},
  {id:"youtube",label:"유튜브",icon:"▶️"},
  {id:"shortform",label:"숏폼",icon:"📱"},
  {id:"autocomplete",label:"자동완성",icon:"🔤"},
  {id:"seo",label:"홈페이지 SEO",icon:"🌐"},
  {id:"calendar",label:"캘린더/할일",icon:"📅"},
  {id:"community",label:"당근/커뮤니티",icon:"🥕"},
  {id:"inhouse",label:"원내 마케팅",icon:"🏠"},
  {id:"offline",label:"오프라인 광고",icon:"📍"},
];
const EVENT_TYPES=[{v:"content",l:"📝 콘텐츠",c:"#6366f1"},{v:"deadline",l:"⏰ 마감",c:"#ef4444"},{v:"report",l:"📊 보고서",c:"#f59e0b"},{v:"task",l:"✅ 업무",c:"#10b981"},{v:"meeting",l:"🤝 미팅",c:"#8b5cf6"}];
const EVENT_CHANNELS=["전체","키워드","지도","체험단","카페","유튜브","숏폼","자동완성","SEO","커뮤니티","원내","오프라인"];
const PRIORITY_OPTS=[{v:"high",l:"🔴 긴급",c:"#ef4444"},{v:"medium",l:"🟡 보통",c:"#f59e0b"},{v:"low",l:"🟢 여유",c:"#10b981"}];
const RANK_FIELDS=[
  {key:"myBlogRank",label:"블로그",icon:"📝",color:"#6366f1"},
  {key:"myPlaceRank",label:"플레이스",icon:"📍",color:"#06b6d4"},
  {key:"rankCafe",label:"카페",icon:"☕",color:"#ec4899"},
  {key:"rankKnowledge",label:"지식인",icon:"❓",color:"#f59e0b"},
  {key:"rankNews",label:"뉴스",icon:"📰",color:"#94a3b8"},
  {key:"rankPowerlink",label:"파워링크",icon:"💎",color:"#10b981"},
  {key:"rankNaverMap",label:"네이버맵",icon:"🗺️",color:"#22d3ee"},
  {key:"rankGoogle",label:"구글맵",icon:"🌐",color:"#f97316"},
  {key:"rankKakao",label:"카카오맵",icon:"🟡",color:"#fbbf24"},
];
const SC:Record<string,string>={good:"#10b981",warn:"#f59e0b",danger:"#ef4444"};
const SL:Record<string,string>={good:"정상",warn:"주의",danger:"점검필요"};

// ===== HELPERS =====
const fmt=(n:number)=>(n||0).toLocaleString();
const fmtW=(n:number)=>"₩"+(n||0).toLocaleString();
const today=()=>new Date().toISOString().slice(0,10);
const getDday=(dateStr:string)=>{const t=new Date(dateStr);const n=new Date();t.setHours(0,0,0,0);n.setHours(0,0,0,0);return Math.ceil((t.getTime()-n.getTime())/(1000*60*60*24));};
const rankColor=(v:string)=>{if(!v||v==="-")return"#475569";const n=parseInt(v);return n===1?"#10b981":n<=3?"#6366f1":n<=5?"#f59e0b":"#ef4444";};

// ===== SHARED UI =====
const Badge=({status}:{status:string})=><span style={{background:SC[status]||"#475569",color:"#fff",borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700}}>{SL[status]||status}</span>;
const Th=({c,style={}}:{c:string,style?:React.CSSProperties})=><th style={{padding:"10px 14px",color:"#94a3b8",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",background:"#1e293b",...style}}>{c}</th>;
const Td=({children,style={}}:{children:React.ReactNode,style?:React.CSSProperties})=><td style={{padding:"10px 14px",color:"#e2e8f0",...style}}>{children}</td>;
const Inp=({value,onChange,placeholder,type="text",style={}}:{value:string,onChange:(v:string)=>void,placeholder?:string,type?:string,style?:React.CSSProperties})=><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"7px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",...style}}/>;
const FF=({label,children}:{label:any,children:React.ReactNode})=><div style={{marginBottom:14}}><div style={{color:"#94a3b8",fontSize:12,marginBottom:5}}>{label}</div>{children}</div>;
const Btn=({onClick,children,color="#10b981",style={}}:{onClick:()=>void,children:React.ReactNode,color?:string,style?:React.CSSProperties})=><button onClick={onClick} style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,...style}}>{children}</button>;
const DelBtn=({onClick}:{onClick:()=>void})=><button onClick={(e:any)=>{e.stopPropagation();onClick();}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"2px 6px",opacity:0.6}} title="삭제">✕</button>;
const LinkCell=({url,children}:{url?:string,children:React.ReactNode})=>url?<a href={url} target="_blank" rel="noreferrer" style={{color:"#6366f1",textDecoration:"underline"}}>{children}</a>:<span>{children}</span>;

const CostBox=({label,value,onChange,color="#f59e0b"}:{label:string,value:number,onChange:(v:number)=>void,color?:string})=>(
  <div style={{background:"#0f172a",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
    <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>{label}</span>
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <span style={{color:"#64748b",fontSize:12}}>₩</span>
      <input type="number" value={value||""} onChange={e=>onChange(+e.target.value||0)} placeholder="0"
        style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"5px 10px",color,fontSize:14,fontWeight:700,width:120,textAlign:"right"}}/>
      <span style={{color:"#64748b",fontSize:11}}>/월</span>
    </div>
  </div>
);

const Modal=({title,onClose,children,wide}:{title:string,onClose:()=>void,children:React.ReactNode,wide?:boolean})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={(e:any)=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#1e293b",borderRadius:16,padding:28,width:"90%",maxWidth:wide?720:520,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:17}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const DdayBadge=({dateStr}:{dateStr:string})=>{
  const d=getDday(dateStr);
  const color=d<0?"#475569":d===0?"#ef4444":d<=3?"#ef4444":d<=7?"#f59e0b":"#10b981";
  const bg=d<0?"#1e293b":d<=3?"#2d0f0f":d<=7?"#422006":"#022c22";
  const label=d<0?`D+${Math.abs(d)}`:d===0?"D-Day":`D-${d}`;
  return <span style={{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{label}</span>;
};

const RankBadge=({value,color}:{value:string,color?:string})=>{
  if(!value||value==="-")return <span style={{color:"#334155",fontSize:12}}>—</span>;
  const n=parseInt(value);
  const bg=n===1?"#10b981":n<=3?color||"#6366f1":n<=5?"#f59e0b":"#ef4444";
  return <span style={{background:bg,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:800,display:"inline-block",minWidth:28,textAlign:"center"}}>{value}</span>;
};

const ProgressBar=({value,max,color="#6366f1"}:{value:number,max:number,color?:string})=>{
  const pct=max>0?Math.min(100,Math.round(value/max*100)):0;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,background:"#0f172a",borderRadius:99,height:8,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,background:color,height:"100%",borderRadius:99}}/>
      </div>
      <span style={{color:"#94a3b8",fontSize:12,whiteSpace:"nowrap"}}>{fmt(value)}/{fmt(max)} ({pct}%)</span>
    </div>
  );
};

function SimpleForm({fields,onSave}:{fields:string[],onSave:(f:any)=>void}){
  const parsed=fields.map(f=>{const[k,r]=f.split(":");const[l,p]=(r||k).split("|");return{k,l,p};});
  const[form,setForm]=useState<any>({});
  return (
    <div>
      {parsed.map(({k,l,p})=><FF key={k} label={l}><Inp value={form[k]||""} onChange={v=>setForm({...form,[k]:v})} placeholder={p||""}/></FF>)}
      <Btn onClick={()=>onSave(form)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

const SectionWithCost=({title,costLabel,cost,onCostChange,color,children,right}:{title:string,costLabel?:string,cost:number,onCostChange:(v:number)=>void,color?:string,children:React.ReactNode,right?:React.ReactNode})=>(
  <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:15}}>{title}</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>{right}</div>
    </div>
    <div style={{marginBottom:16}}>
      <CostBox label={costLabel||`${title} 월 집행비`} value={cost} onChange={onCostChange} color={color||"#f59e0b"}/>
    </div>
    {children}
  </div>
);

// ===== FORM COMPONENTS =====
function EventForm({initial,onSave}:{initial?:any,onSave:(f:any)=>void}){
  const[f,setF]=useState({title:initial?.title||"",date:initial?.date||today(),type:initial?.type||"content",channel:initial?.channel||"전체"});
  const u=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="일정 제목"><Inp value={f.title} onChange={v=>u("title",v)} placeholder="블로그 포스팅 3건"/></FF>
      <FF label="날짜"><Inp type="date" value={f.date} onChange={v=>u("date",v)}/></FF>
      <FF label="유형">
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {EVENT_TYPES.map(t=>(<button key={t.v} onClick={()=>u("type",t.v)} style={{background:f.type===t.v?t.c:"#0f172a",color:f.type===t.v?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{t.l}</button>))}
        </div>
      </FF>
      <FF label="채널">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {EVENT_CHANNELS.map(c=>(<button key={c} onClick={()=>u("channel",c)} style={{background:f.channel===c?"#6366f1":"#0f172a",color:f.channel===c?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>{c}</button>))}
        </div>
      </FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

function TodoForm({initial,onSave}:{initial?:any,onSave:(f:any)=>void}){
  const[f,setF]=useState({text:initial?.text||"",channel:initial?.channel||"전체",priority:initial?.priority||"medium",dueDate:initial?.dueDate||today()});
  const u=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <FF label="할 일"><Inp value={f.text} onChange={v=>u("text",v)} placeholder="블로그 포스팅 3건 발행"/></FF>
      <FF label="마감일"><Inp type="date" value={f.dueDate} onChange={v=>u("dueDate",v)}/></FF>
      <FF label="우선순위">
        <div style={{display:"flex",gap:8}}>
          {PRIORITY_OPTS.map(p=>(<button key={p.v} onClick={()=>u("priority",p.v)} style={{flex:1,background:f.priority===p.v?p.c:"#0f172a",color:f.priority===p.v?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:12,fontWeight:600}}>{p.l}</button>))}
        </div>
      </FF>
      <FF label="채널">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {EVENT_CHANNELS.map(c=>(<button key={c} onClick={()=>u("channel",c)} style={{background:f.channel===c?"#6366f1":"#0f172a",color:f.channel===c?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>{c}</button>))}
        </div>
      </FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

function KwForm({initial,onSave}:{initial?:any,onSave:(f:any)=>void}){
  const[kw,setKw]=useState(initial?.keyword||"");
  const[order,setOrder]=useState(initial?.tabOrder||[...TAB_TYPES]);
  const[ranks,setRanks]=useState(()=>{const r:any={};RANK_FIELDS.forEach(f=>{r[f.key]=initial?.[f.key]||"";});return r;});
  const move=(i:number,d:number)=>{const a=[...order],n=i+d;if(n<0||n>=a.length)return;[a[i],a[n]]=[a[n],a[i]];setOrder(a);};
  return (
    <div>
      <FF label="키워드"><Inp value={kw} onChange={setKw} placeholder="예: 강남 피부과"/></FF>
      <FF label="검색탭 노출 순서">
        {order.map((tp:string,i:number)=>(<div key={tp} style={{display:"flex",alignItems:"center",gap:8,background:"#0f172a",borderRadius:6,padding:"6px 10px",marginBottom:4}}>
          <span style={{color:"#6366f1",fontWeight:700,width:20}}>{i+1}</span><span style={{flex:1,fontSize:13}}>{tp}</span>
          <button onClick={()=>move(i,-1)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:14}}>▲</button>
          <button onClick={()=>move(i,1)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:14}}>▼</button>
        </div>))}
      </FF>
      <FF label="상위노출 순위 (예: 1위, 3위, -)">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {RANK_FIELDS.map(f=>(<div key={f.key} style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
            <div style={{color:f.color,fontSize:11,fontWeight:600,marginBottom:4}}>{f.icon} {f.label}</div>
            <Inp value={ranks[f.key]} onChange={v=>setRanks((p:any)=>({...p,[f.key]:v}))} placeholder="-" style={{textAlign:"center",fontSize:14,fontWeight:700}}/>
          </div>))}
        </div>
      </FF>
      <Btn onClick={()=>onSave({keyword:kw,tabOrder:order,...ranks})} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

function MapForm({initial,onSave}:{initial?:any,onSave:(f:any)=>void}){
  const[f,setF]=useState({keyword:"",naverPlace:"-",google:"-",kakao:"-",...initial});
  const u=(k:string,v:any)=>setF((p:any)=>({...p,[k]:v}));
  return (
    <div>
      <FF label="검색 키워드"><Inp value={f.keyword} onChange={v=>u("keyword",v)} placeholder="강남 피부과"/></FF>
      <FF label="네이버 순위"><Inp value={f.naverPlace} onChange={v=>u("naverPlace",v)} placeholder="1위"/></FF>
      <FF label="구글맵 순위"><Inp value={f.google} onChange={v=>u("google",v)} placeholder="3위"/></FF>
      <FF label="카카오맵 순위"><Inp value={f.kakao} onChange={v=>u("kakao",v)} placeholder="2위"/></FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

function ACForm({initial,onSave}:{initial?:any,onSave:(f:any)=>void}){
  const[kw,setKw]=useState(initial?.keyword||"");
  const[nav,setNav]=useState((initial?.naver||[]).join("\n"));
  const[ins,setIns]=useState((initial?.instagram||[]).join("\n"));
  return (
    <div>
      <FF label="뿌리 키워드"><Inp value={kw} onChange={setKw} placeholder="강남피부과"/></FF>
      <FF label="네이버 자동완성 (한 줄에 하나)"><textarea value={nav} onChange={e=>setNav(e.target.value)} placeholder={"강남피부과 추천\n강남피부과 가격"} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/></FF>
      <FF label="인스타 해시태그"><textarea value={ins} onChange={e=>setIns(e.target.value)} placeholder={"강남피부과일상"} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/></FF>
      <Btn onClick={()=>onSave({keyword:kw,naver:nav.split("\n").map((s:string)=>s.trim()).filter(Boolean),instagram:ins.split("\n").map((s:string)=>s.trim()).filter(Boolean)})} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

function SeoForm({initial,existingKws,onSave}:{initial?:any,existingKws:string[],onSave:(f:any)=>void}){
  const[f,setF]=useState({targetKeyword:initial?.targetKeyword||"",pageUrl:initial?.pageUrl||"/",pageTitle:initial?.pageTitle||"",metaTitle:initial?.metaTitle||"",metaDesc:initial?.metaDesc||"",h1Tag:initial?.h1Tag||"",currentRank:initial?.currentRank||"-",targetRank:initial?.targetRank||"",status:initial?.status||"미설정",notes:initial?.notes||""});
  const u=(k:string,v:any)=>setF((p:any)=>({...p,[k]:v}));
  return (
    <div>
      <FF label="타겟 키워드">
        <Inp value={f.targetKeyword} onChange={v=>u("targetKeyword",v)} placeholder="강남 피부과"/>
        {existingKws.length>0&&(<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
          {existingKws.map((kw,i)=>(<button key={i} onClick={()=>u("targetKeyword",kw)} style={{background:f.targetKeyword===kw?"#6366f1":"#1e293b",color:f.targetKeyword===kw?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer"}}>{kw}</button>))}
        </div>)}
      </FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <FF label="페이지 URL"><Inp value={f.pageUrl} onChange={v=>u("pageUrl",v)} placeholder="/botox"/></FF>
        <FF label="페이지 제목"><Inp value={f.pageTitle} onChange={v=>u("pageTitle",v)} placeholder="보톡스 페이지"/></FF>
      </div>
      <FF label={<span>Meta Title <span style={{color:f.metaTitle.length>=50&&f.metaTitle.length<=60?"#10b981":"#f59e0b"}}>({f.metaTitle.length}자)</span></span>}>
        <Inp value={f.metaTitle} onChange={v=>u("metaTitle",v)} placeholder="강남 피부과 | OO피부과"/>
      </FF>
      <FF label={<span>Meta Description <span style={{color:f.metaDesc.length>=150&&f.metaDesc.length<=160?"#10b981":"#f59e0b"}}>({f.metaDesc.length}자)</span></span>}>
        <textarea value={f.metaDesc} onChange={e=>u("metaDesc",e.target.value)} placeholder="강남 피부과 전문의 직접 시술..."
          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:60,resize:"vertical"}}/>
      </FF>
      <FF label="H1 태그"><Inp value={f.h1Tag} onChange={v=>u("h1Tag",v)} placeholder="강남 피부과 전문 OO피부과"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <FF label="현재 순위"><Inp value={f.currentRank} onChange={v=>u("currentRank",v)} placeholder="5위"/></FF>
        <FF label="목표 순위"><Inp value={f.targetRank} onChange={v=>u("targetRank",v)} placeholder="1위"/></FF>
        <FF label="상태">
          <div style={{display:"flex",gap:4}}>
            {["설정완료","수정필요","미설정"].map(s=>(<button key={s} onClick={()=>u("status",s)} style={{flex:1,background:f.status===s?(s==="설정완료"?"#10b981":s==="수정필요"?"#f59e0b":"#ef4444"):"#0f172a",color:f.status===s?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"6px",cursor:"pointer",fontSize:12,fontWeight:600}}>{s}</button>))}
          </div>
        </FF>
      </div>
      <FF label="메모"><Inp value={f.notes} onChange={v=>u("notes",v)} placeholder="추가 작업 사항"/></FF>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

function PerfForm({onSave}:{onSave:(f:any)=>void}){
  const defP=`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
  const[f,setF]=useState<any>({period:defP,youtube_views:"",shortform_views:"",blog_visits:"",place_views:"",new_reviews:"",cafe_posts:"",notes:""});
  const u=(k:string,v:any)=>setF((p:any)=>({...p,[k]:v}));
  return (
    <div>
      <FF label="기간 (YYYY-MM)"><Inp value={f.period} onChange={v=>u("period",v)} placeholder="2025-03"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <FF label="유튜브 조회수"><Inp value={f.youtube_views} onChange={v=>u("youtube_views",v)} placeholder="0"/></FF>
        <FF label="숏폼 조회수"><Inp value={f.shortform_views} onChange={v=>u("shortform_views",v)} placeholder="0"/></FF>
        <FF label="블로그 방문수"><Inp value={f.blog_visits} onChange={v=>u("blog_visits",v)} placeholder="0"/></FF>
        <FF label="플레이스 조회수"><Inp value={f.place_views} onChange={v=>u("place_views",v)} placeholder="0"/></FF>
        <FF label="신규 리뷰 수"><Inp value={f.new_reviews} onChange={v=>u("new_reviews",v)} placeholder="0"/></FF>
        <FF label="카페 게시물 수"><Inp value={f.cafe_posts} onChange={v=>u("cafe_posts",v)} placeholder="0"/></FF>
      </div>
      <FF label="메모"><Inp value={f.notes} onChange={v=>u("notes",v)} placeholder="이달 특이사항"/></FF>
      <Btn onClick={()=>onSave({...f,youtube_views:+f.youtube_views||0,shortform_views:+f.shortform_views||0,blog_visits:+f.blog_visits||0,place_views:+f.place_views||0,new_reviews:+f.new_reviews||0,cafe_posts:+f.cafe_posts||0})} style={{width:"100%",marginTop:4}}>저장</Btn>
    </div>
  );
}

// ===== MAIN BRANCH PAGE =====
export default function BranchPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.id as string;
  const { data, upd, loading } = useBranchData(branchId);
  
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState<any>(null);
  const [sidebar, setSidebar] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [calTab, setCalTab] = useState("calendar");
  const [calMonth, setCalMonth] = useState({y:new Date().getFullYear(),m:new Date().getMonth()});
  const [budgetTab, setBudgetTab] = useState("cost");
  const [commTab, setCommTab] = useState("당근마켓");
  const [inhouseTab, setInhouseTab] = useState("messages");
  const fileRef = useRef<HTMLInputElement>(null);
  const [portalView, setPortalView] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any[]>([]);
  const [aiRegion, setAiRegion] = useState("");
  const [aiSpec, setAiSpec] = useState("");

  // Load branch name
  useEffect(() => {
    const loadBranch = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: b } = await supabase.from('branches').select('name, clinic_name').eq('id', branchId).single();
      if (b) setBranchName(`${b.name} ${b.clinic_name || ''}`);
    };
    if (branchId) loadBranch();
  }, [branchId]);

  // Helper functions
  const del = (field: string, id: any) => {
    upd(field, (data as any)[field].filter((x: any) => x.id !== id));
  };

  const updN = (field: string, key: string, value: any) => {
    upd(field, { ...(data as any)[field], [key]: value });
  };

  // Community helpers
  const getCommItems = (platform: string) => (data.community || []).filter((c: any) => c.platform === platform);

  // Excel import handler
  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const nk = rows.slice(1).filter((r: any) => r[0]).map((r: any, i: number) => ({
        id: Date.now() + i, keyword: r[0] || "", tabOrder: [...TAB_TYPES],
        myBlogRank: r[1] || "-", myPlaceRank: r[2] || "-", status: "warn"
      }));
      upd("keywords", [...data.keywords, ...nk]);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // AI keyword suggestion
  const callAI = async () => {
    if (!aiRegion) return alert("지역을 입력해주세요.");
    setAiLoading(true); setAiResult([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 2000,
          messages: [{ role: "user", content: `당신은 한국 로컬 마케팅 전문가입니다. ${aiRegion} 지역의 ${aiSpec || "미용 피부과/성형외과"} 병원에 방문할 잠재 고객이 네이버에서 검색할만한 키워드를 중요도 순으로 20개 제안해주세요. 월간 예상 검색량을 포함하세요. JSON 배열로만 응답:\n[{"keyword":"강남 피부과","priority":1,"monthlySearch":12000}]` }]
        })
      });
      const d = await res.json();
      setAiResult(JSON.parse((d.content?.[0]?.text || "[]").replace(/```json|```/g, "").trim()));
    } catch { setAiResult([]); }
    setAiLoading(false);
  };
  const addAIKws = () => {
    upd("keywords", [...data.keywords, ...aiResult.map((r: any, i: number) => ({
      id: Date.now() + i, keyword: r.keyword, tabOrder: [...TAB_TYPES],
      myBlogRank: "-", myPlaceRank: "-", status: "warn", monthlySearch: r.monthlySearch
    }))]);
    setModal(null); setAiResult([]); setAiRegion(""); setAiSpec("");
  };
  const getCommCost = (platform: string) => {
    const item = (data.community || []).find((c: any) => c.platform === platform && c.cost);
    return item?.cost || 0;
  };

  // Budget calculations
  const kwCostTotal = Object.values(data.keywordCosts || {}).reduce((a: number, b: any) => a + (+b || 0), 0);
  const budgetRows = [
    {label:"키워드",cost:kwCostTotal,color:"#6366f1"},
    {label:"지도",cost:data.costs?.maps||0,color:"#06b6d4"},
    {label:"체험단",cost:data.costs?.experience||0,color:"#10b981"},
    {label:"카페",cost:data.costs?.cafes||0,color:"#ec4899"},
    {label:"유튜브",cost:data.costs?.youtube||0,color:"#f97316"},
    {label:"숏폼",cost:data.costs?.shortform||0,color:"#8b5cf6"},
    {label:"자동완성",cost:data.costs?.autocomplete||0,color:"#14b8a6"},
    {label:"SEO",cost:data.costs?.seo||0,color:"#0ea5e9"},
    {label:"오프라인",cost:[...(data.offline?.elevator||[]),...(data.offline?.subway||[]),...(data.offline?.other||[])].filter((a:any)=>a.status==="집행중").reduce((a:number,x:any)=>a+(+x.cost||0),0),color:"#ef4444"},
  ];
  const budgetTotal = budgetRows.reduce((a, r) => a + r.cost, 0);

  // Overview stats
  const stats = [
    {title:"키워드",value:data.keywords?.length||0,color:"#6366f1"},
    {title:"지도",value:data.maps?.length||0,color:"#06b6d4"},
    {title:"체험단",value:data.experiences?.length||0,color:"#10b981"},
    {title:"유튜브",value:data.youtube?.length||0,color:"#f97316"},
    {title:"숏폼",value:data.shortforms?.length||0,color:"#8b5cf6"},
    {title:"카페",value:data.cafes?.length||0,color:"#ec4899"},
    {title:"월예산",value:fmtW(budgetTotal),color:"#f59e0b"},
  ];

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#6366f1",fontSize:18,fontWeight:700}}>데이터 로딩 중...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"'Apple SD Gothic Neo',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#1e293b",borderBottom:"1px solid #334155",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>router.push('/dashboard')} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13}}>← 목록</button>
          <div style={{width:32,height:32,background:"linear-gradient(135deg,#6366f1,#818cf8)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize:14}}>R</div>
          <span style={{fontWeight:800,fontSize:16,color:"#6366f1"}}>{branchName}</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setSidebar(!sidebar)} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>{sidebar?"◁ 접기":"▷ 메뉴"}</button>
        </div>
      </div>

      <div style={{display:"flex"}}>
        {/* Sidebar */}
        {sidebar && (
          <div style={{width:200,background:"#1e293b",borderRight:"1px solid #334155",padding:"12px 0",minHeight:"calc(100vh - 56px)",position:"sticky",top:56,overflowY:"auto",flexShrink:0}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                width:"100%",textAlign:"left",background:tab===t.id?"#6366f122":"transparent",color:tab===t.id?"#6366f1":"#94a3b8",
                border:"none",padding:"10px 16px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:400,
                borderLeft:tab===t.id?"3px solid #6366f1":"3px solid transparent",display:"flex",gap:8,alignItems:"center"
              }}><span>{t.icon}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.label}</span></button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{flex:1,padding:"24px",maxWidth:1100}}>

          {/* ══ OVERVIEW ══ */}
          {tab==="overview"&&(
            <div>
              <div style={{fontWeight:800,fontSize:20,marginBottom:20}}>📊 전체 현황</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:24}}>
                {stats.map((s,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"15px 18px",flex:"1 1 110px",cursor:"pointer"}} onClick={()=>setTab(TABS[i+3]?.id||"keywords")}>
                    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{s.title}</div>
                    <div style={{color:s.color,fontSize:22,fontWeight:800}}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Todo progress mini */}
              {(()=>{
                const todos=data.todos||[];const pending=todos.filter((t:any)=>!t.done);
                if(!pending.length)return null;
                const done=todos.filter((t:any)=>t.done).length;const pct=todos.length>0?Math.round(done/todos.length*100):0;
                return (
                  <div style={{background:"#1e293b",borderRadius:12,padding:"12px 16px",marginBottom:16,cursor:"pointer"}} onClick={()=>{setTab("calendar");setCalTab("todos");}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>✅ 할 일 진행 ({done}/{todos.length})</span>
                      <span style={{color:pct>=80?"#10b981":"#f59e0b",fontWeight:800,fontSize:13}}>{pct}%</span>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:99,height:6,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,background:pct>=80?"#10b981":"#f59e0b",height:"100%",borderRadius:99}}/>
                    </div>
                  </div>
                );
              })()}

              {/* Budget mini chart */}
              {budgetRows.some(r=>r.cost>0)&&(
                <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16,cursor:"pointer"}} onClick={()=>setTab("budget")}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={{fontWeight:700,fontSize:15}}>월간 마케팅 비용</div>
                    <span style={{color:"#6366f1",fontSize:13,fontWeight:600}}>자세히 →</span>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={budgetRows.filter(r=>r.cost>0)} margin={{top:0,right:10,left:0,bottom:0}}>
                      <XAxis dataKey="label" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={(v:any)=>[fmtW(v),"비용"]} contentStyle={{background:"#0f172a",border:"none",fontSize:11}}/>
                      <Bar dataKey="cost" radius={[4,4,0,0]}>
                        {budgetRows.filter(r=>r.cost>0).map((r,i)=><Cell key={i} fill={r.color}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
                {TABS.slice(1).map((t,i)=>(
                  <div key={i} onClick={()=>setTab(t.id)} style={{background:"#1e293b",borderRadius:12,padding:"13px 15px",cursor:"pointer",border:"1px solid #334155",transition:"border 0.2s"}}
                    onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor="#6366f1";}}
                    onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor="#334155";}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{t.icon} {t.label}</div>
                    <div style={{color:"#64748b",fontSize:11}}>클릭하여 이동</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PERFORMANCE ══ */}
          {tab==="performance"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{fontWeight:800,fontSize:16}}>📈 성과 추이 분석</div>
                <Btn color="#334155" style={{color:"#94a3b8"}} onClick={()=>setModal("addPerf")}>+ 데이터 입력</Btn>
              </div>

              {/* 콘텐츠 조회수 차트 */}
              {(data.performance||[]).length>0&&(
                <>
                <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📺 콘텐츠 조회수 추이 <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>(유튜브 + 숏폼)</span></div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.performance||[]} margin={{top:10,right:20,left:10,bottom:0}}>
                      <defs>
                        <linearGradient id="ytG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                        <linearGradient id="sfG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                      <XAxis dataKey="period" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`} width={40}/>
                      <Tooltip formatter={(v:any,n:string)=>[fmt(v)+"회",n==="youtube_views"?"유튜브":"숏폼"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                      <Legend formatter={(n:string)=>n==="youtube_views"?"유튜브":"숏폼"} wrapperStyle={{fontSize:12}}/>
                      <Area type="monotone" dataKey="youtube_views" stroke="#f97316" fill="url(#ytG)" strokeWidth={2} dot={{fill:"#f97316",r:3}}/>
                      <Area type="monotone" dataKey="shortform_views" stroke="#8b5cf6" fill="url(#sfG)" strokeWidth={2} dot={{fill:"#8b5cf6",r:3}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 블로그+플레이스 차트 */}
                <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📝 검색 유입 추이 <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>(블로그 + 플레이스)</span></div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data.performance||[]} margin={{top:10,right:20,left:10,bottom:0}}>
                      <defs>
                        <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                        <linearGradient id="pvG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                      <XAxis dataKey="period" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`} width={40}/>
                      <Tooltip formatter={(v:any,n:string)=>[fmt(v)+"회",n==="blog_visits"?"블로그":"플레이스"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                      <Legend formatter={(n:string)=>n==="blog_visits"?"블로그 방문":"플레이스 조회"} wrapperStyle={{fontSize:12}}/>
                      <Area type="monotone" dataKey="blog_visits" stroke="#6366f1" fill="url(#bgG)" strokeWidth={2} dot={{fill:"#6366f1",r:3}}/>
                      <Area type="monotone" dataKey="place_views" stroke="#06b6d4" fill="url(#pvG)" strokeWidth={2} dot={{fill:"#06b6d4",r:3}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 리뷰 + 카페 차트 */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>⭐ 신규 리뷰 추이</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={data.performance||[]} margin={{top:4,right:4,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                        <XAxis dataKey="period" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} width={26}/>
                        <Tooltip formatter={(v:any)=>[v+"건","리뷰"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/>
                        <Bar dataKey="new_reviews" fill="#10b981" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>☕ 카페 게시물 추이</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={data.performance||[]} margin={{top:4,right:4,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                        <XAxis dataKey="period" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} width={26}/>
                        <Tooltip formatter={(v:any)=>[v+"건","게시물"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/>
                        <Bar dataKey="cafe_posts" fill="#ec4899" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                </>
              )}

              <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📋 월별 상세</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr><Th c="기간"/><Th c="유튜브"/><Th c="숏폼"/><Th c="블로그"/><Th c="플레이스"/><Th c="리뷰"/><Th c="카페"/><Th c="메모"/><Th c=""/></tr></thead>
                    <tbody>{(data.performance||[]).map((log:any,ri:number)=>(
                      <tr key={log.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700,color:"#6366f1"}}>{log.period}</span></Td>
                        <Td><span style={{color:"#f97316"}}>{fmt(log.youtube_views)}</span></Td>
                        <Td><span style={{color:"#8b5cf6"}}>{fmt(log.shortform_views)}</span></Td>
                        <Td><span style={{color:"#6366f1"}}>{fmt(log.blog_visits)}</span></Td>
                        <Td><span style={{color:"#06b6d4"}}>{fmt(log.place_views)}</span></Td>
                        <Td><span style={{color:"#10b981"}}>{log.new_reviews}건</span></Td>
                        <Td><span style={{color:"#ec4899"}}>{log.cafe_posts}건</span></Td>
                        <Td><span style={{color:"#64748b",fontSize:11}}>{log.notes||"-"}</span></Td>
                        <Td><DelBtn onClick={()=>upd("performance",(data.performance||[]).filter((l:any)=>l.id!==log.id))}/></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              {modal==="addPerf"&&<Modal title="📊 성과 데이터 입력" onClose={()=>setModal(null)}><PerfForm onSave={f=>{upd("performance",[...(data.performance||[]),{...f,id:Date.now()}]);setModal(null);}}/></Modal>}
            </div>
          )}

          {/* ══ PORTAL ══ */}
          {tab==="portal"&&(
            <div>
              {!portalView ? (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:16}}>🔗 클라이언트 포털 설정</div>
                      <div style={{color:"#64748b",fontSize:12,marginTop:2}}>고객사에게 보여줄 읽기 전용 보고서를 설정합니다</div>
                    </div>
                    <Btn onClick={()=>setPortalView(true)} color="#6366f1">👁 포털 미리보기</Btn>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>기본 정보</div>
                      <FF label="병원/클라이언트명"><Inp value={data.portalConfig?.clinicName||""} onChange={v=>upd("portalConfig",{...data.portalConfig,clinicName:v})} placeholder="예: 강남 피부과"/></FF>
                      <FF label="보고 기간"><Inp value={data.portalConfig?.reportMonth||""} onChange={v=>upd("portalConfig",{...data.portalConfig,reportMonth:v})} placeholder="예: 2025년 3월"/></FF>
                      <FF label="담당자명"><Inp value={data.portalConfig?.managerName||""} onChange={v=>upd("portalConfig",{...data.portalConfig,managerName:v})} placeholder="예: 마케팅팀"/></FF>
                      <FF label="로고 이모지"><Inp value={data.portalConfig?.logoText||""} onChange={v=>upd("portalConfig",{...data.portalConfig,logoText:v})} placeholder="🏥"/></FF>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>공개 항목 설정</div>
                      {[
                        {key:"showKeywords",label:"네이버 키워드 순위"},
                        {key:"showMaps",label:"지도 노출 순위"},
                        {key:"showYoutube",label:"유튜브 성과"},
                        {key:"showShortform",label:"숏폼 성과"},
                        {key:"showReviews",label:"리뷰 현황"},
                        {key:"showCafes",label:"카페 바이럴"},
                        {key:"showBudget",label:"마케팅 비용 (민감정보)"},
                      ].map(item=>(
                        <div key={item.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <span style={{fontSize:13,color:"#e2e8f0"}}>{item.label}</span>
                          <button onClick={()=>upd("portalConfig",{...data.portalConfig,[item.key]:!data.portalConfig?.[item.key]})}
                            style={{background:data.portalConfig?.[item.key]?"#10b981":"#334155",border:"none",borderRadius:99,padding:"4px 16px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600}}>
                            {data.portalConfig?.[item.key]?"공개":"비공개"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                    <FF label="클라이언트에게 전달할 메모">
                      <textarea value={data.portalConfig?.memo||""} onChange={e=>upd("portalConfig",{...data.portalConfig,memo:e.target.value})}
                        placeholder="안녕하세요! 이번 달 마케팅 성과 보고서입니다..."
                        style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/>
                    </FF>
                  </div>
                </div>
              ) : (
                /* Portal Preview */
                <div style={{background:"#0a0f1e",borderRadius:16,border:"2px solid #6366f1",overflow:"hidden"}}>
                  <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",padding:"24px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{fontSize:36}}>{data.portalConfig?.logoText||"🏥"}</div>
                      <div>
                        <div style={{fontWeight:800,fontSize:20,color:"#fff"}}>{data.portalConfig?.clinicName||branchName||"클라이언트"}</div>
                        <div style={{color:"#a5b4fc",fontSize:13,marginTop:2}}>마케팅 성과 보고서 · {data.portalConfig?.reportMonth||"이번 달"}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:"#a5b4fc",fontSize:11}}>담당</div>
                        <div style={{color:"#fff",fontWeight:700,fontSize:13}}>{data.portalConfig?.managerName||"마케팅팀"}</div>
                      </div>
                      <button onClick={()=>setPortalView(false)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>← 설정으로</button>
                    </div>
                  </div>
                  <div style={{padding:"24px 28px"}}>
                    {data.portalConfig?.memo&&(
                      <div style={{background:"#1e293b",borderRadius:10,padding:"14px 18px",marginBottom:20,borderLeft:"3px solid #6366f1"}}>
                        <div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>📌 담당자 메모</div>
                        <div style={{color:"#e2e8f0",fontSize:13,lineHeight:1.6}}>{data.portalConfig.memo}</div>
                      </div>
                    )}
                    {/* KPI Cards */}
                    {(()=>{
                      const latest=(data.performance||[])[(data.performance||[]).length-1]||{};
                      const prev=(data.performance||[])[(data.performance||[]).length-2]||{};
                      const delta=(cur:number,pre:number)=>{if(!pre||!cur)return null;const d=cur-pre;return{pct:Math.round(d/pre*100),up:d>=0};};
                      const cards:any[]=[];
                      if(data.portalConfig?.showYoutube)cards.push({icon:"📺",label:"유튜브 조회수",value:fmt(latest.youtube_views||0),color:"#f97316",d:delta(latest.youtube_views,prev.youtube_views)});
                      if(data.portalConfig?.showShortform)cards.push({icon:"🎬",label:"숏폼 조회수",value:fmt(latest.shortform_views||0),color:"#8b5cf6",d:delta(latest.shortform_views,prev.shortform_views)});
                      cards.push({icon:"📝",label:"블로그 방문",value:fmt(latest.blog_visits||0),color:"#6366f1",d:delta(latest.blog_visits,prev.blog_visits)});
                      cards.push({icon:"📍",label:"플레이스 조회",value:fmt(latest.place_views||0),color:"#06b6d4",d:delta(latest.place_views,prev.place_views)});
                      if(data.portalConfig?.showBudget)cards.push({icon:"💰",label:"월 집행비",value:fmtW(budgetTotal),color:"#f59e0b",d:null});
                      return (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:20}}>
                          {cards.map((c,i)=>(
                            <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                              <div style={{fontSize:22,marginBottom:6}}>{c.icon}</div>
                              <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{c.label}</div>
                              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                                <span style={{color:c.color,fontSize:20,fontWeight:800}}>{c.value}</span>
                                {c.d&&<span style={{background:c.d.up?"#022c22":"#2d0f0f",color:c.d.up?"#10b981":"#ef4444",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>{c.d.up?"▲":"▼"}{Math.abs(c.d.pct)}%</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* 성과 추이 차트 */}
                    {(data.performance||[]).length>1&&(
                      <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:"#e2e8f0"}}>📈 성과 추이</div>
                        <ResponsiveContainer width="100%" height={180}>
                          <AreaChart data={data.performance||[]} margin={{top:10,right:10,left:0,bottom:0}}>
                            <defs>
                              <linearGradient id="pYt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                              <linearGradient id="pSf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                            <XAxis dataKey="period" tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:10,fill:"#64748b"}} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`} width={36}/>
                            <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",fontSize:11}}/>
                            <Area type="monotone" dataKey="youtube_views" stroke="#f97316" fill="url(#pYt)" strokeWidth={2} dot={false}/>
                            <Area type="monotone" dataKey="shortform_views" stroke="#8b5cf6" fill="url(#pSf)" strokeWidth={2} dot={false}/>
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* 키워드 순위 */}
                    {data.portalConfig?.showKeywords&&data.keywords?.length>0&&(
                      <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#e2e8f0"}}>🔍 네이버 키워드 순위</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                          <thead><tr><Th c="키워드"/><Th c="블로그"/><Th c="플레이스"/></tr></thead>
                          <tbody>{data.keywords.map((k:any,ri:number)=>(
                            <tr key={k.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                              <Td><span style={{fontWeight:700}}>{k.keyword}</span></Td>
                              <Td><span style={{color:rankColor(k.myBlogRank),fontWeight:700}}>{k.myBlogRank||"-"}</span></Td>
                              <Td><span style={{color:rankColor(k.myPlaceRank),fontWeight:700}}>{k.myPlaceRank||"-"}</span></Td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}

                    {/* 지도 순위 */}
                    {data.portalConfig?.showMaps&&data.maps?.length>0&&(
                      <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#e2e8f0"}}>📍 지도 노출 순위</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                          <thead><tr><Th c="키워드"/><Th c="네이버"/><Th c="구글"/><Th c="카카오"/></tr></thead>
                          <tbody>{data.maps.map((m:any,ri:number)=>(
                            <tr key={m.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                              <Td><span style={{fontWeight:700}}>{m.keyword}</span></Td>
                              <Td><span style={{color:rankColor(m.naverPlace),fontWeight:700}}>{m.naverPlace}</span></Td>
                              <Td><span style={{color:rankColor(m.google),fontWeight:700}}>{m.google}</span></Td>
                              <Td><span style={{color:rankColor(m.kakao),fontWeight:700}}>{m.kakao}</span></Td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}

                    {/* 리뷰 현황 */}
                    {data.portalConfig?.showReviews&&(data.inhouse?.reviews||[]).length>0&&(
                      <div style={{background:"#1e293b",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#e2e8f0"}}>⭐ 리뷰 달성 현황</div>
                        {data.inhouse.reviews.map((r:any)=>(
                          <div key={r.id} style={{marginBottom:12}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                              <span style={{fontSize:13,fontWeight:600}}>{r.platform}</span>
                              <span style={{color:"#94a3b8",fontSize:12}}>{r.count}건 / 목표 {r.target}건</span>
                            </div>
                            <ProgressBar value={r.count||0} max={r.target||100} color={(r.count||0)>=(r.target||100)?"#10b981":"#6366f1"}/>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{textAlign:"center",paddingTop:12,color:"#334155",fontSize:11}}>
                      REBERRYOS · 마케팅 관리 시스템 · 본 보고서는 클라이언트 전용 읽기 전용 화면입니다
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ BUDGET ══ */}
          {tab==="budget"&&(
            <div>
              <div style={{fontWeight:800,fontSize:16,marginBottom:18}}>💰 마케팅 비용</div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                <div style={{color:"#94a3b8",fontSize:13,marginBottom:6}}>월간 총 마케팅 비용</div>
                <div style={{color:"#f59e0b",fontSize:36,fontWeight:800}}>{fmtW(budgetTotal)}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
                {budgetRows.map((r,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"14px 16px",borderLeft:`3px solid ${r.color}`}}>
                    <div style={{color:"#94a3b8",fontSize:11}}>{r.label}</div>
                    <div style={{color:r.color,fontSize:20,fontWeight:800}}>{fmtW(r.cost)}</div>
                    {budgetTotal>0&&<div style={{color:"#475569",fontSize:11,marginTop:2}}>{r.cost>0?`${Math.round(r.cost/budgetTotal*100)}%`:"미입력"}</div>}
                  </div>
                ))}
              </div>

              {/* Budget Chart */}
              {budgetRows.some(r=>r.cost>0)&&(
                <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>채널별 비용 비교</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={budgetRows.filter(r=>r.cost>0)} margin={{top:0,right:10,left:10,bottom:50}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:"#94a3b8"}} angle={-35} textAnchor="end" axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={(v:number)=>`${(v/10000).toFixed(0)}만`} width={44}/>
                      <Tooltip formatter={(v:any)=>[fmtW(v),"비용"]} contentStyle={{background:"#0f172a",border:"none",fontSize:11}}/>
                      <Bar dataKey="cost" radius={[4,4,0,0]}>
                        {budgetRows.filter(r=>r.cost>0).map((r,i)=><Cell key={i} fill={r.color}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>채널별 신규 내원 수</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                  {["keywords","maps","experience","cafes","youtube","shortform","autocomplete","seo","community","inhouse","offline"].map(ch=>(
                    <div key={ch} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f172a",borderRadius:8,padding:"8px 12px"}}>
                      <span style={{fontSize:12,fontWeight:600}}>{ch}</span>
                      <input type="number" value={data.conversions?.[ch]||""} onChange={e=>upd("conversions",{...data.conversions,[ch]:+e.target.value||0})}
                        placeholder="0" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"4px 8px",color:"#06b6d4",fontSize:13,fontWeight:700,width:80,textAlign:"right"}}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ KEYWORDS ══ */}
          {tab==="keywords"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:15}}>🔍 네이버 키워드</div>
                <div style={{display:"flex",gap:8}}>
                  <Btn color="#8b5cf6" onClick={()=>setModal("aiKw")}>🤖 AI 제안</Btn>
                  <Btn color="#f59e0b" onClick={()=>fileRef.current?.click()}>📂 엑셀</Btn>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleExcel}/>
                  <Btn onClick={()=>setModal("kw")}>+ 추가</Btn>
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",marginBottom:18}}>
                <div style={{fontWeight:700,fontSize:13,color:"#94a3b8",marginBottom:12}}>📋 탭별 월 집행비</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                  {TAB_TYPES.map(tp=>(
                    <div key={tp} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f172a",borderRadius:8,padding:"8px 12px"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{tp}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:"#64748b",fontSize:11}}>₩</span>
                        <input type="number" value={data.keywordCosts?.[tp]||""} onChange={e=>upd("keywordCosts",{...data.keywordCosts,[tp]:+e.target.value||0})}
                          placeholder="0" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"4px 8px",color:"#f59e0b",fontSize:13,fontWeight:700,width:100,textAlign:"right"}}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1e293b",display:"flex",justifyContent:"flex-end"}}>
                  <span style={{color:"#94a3b8",fontSize:12,marginRight:8}}>합계</span>
                  <span style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>{fmtW(kwCostTotal)}/월</span>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr><Th c="키워드"/><Th c="📝블로그" style={{textAlign:"center",fontSize:11}}/><Th c="📍플레이스" style={{textAlign:"center",fontSize:11}}/><Th c="☕카페" style={{textAlign:"center",fontSize:11}}/><Th c="❓지식인" style={{textAlign:"center",fontSize:11}}/><Th c="📰뉴스" style={{textAlign:"center",fontSize:11}}/><Th c="💎파워링크" style={{textAlign:"center",fontSize:11}}/><Th c="🗺️N맵" style={{textAlign:"center",fontSize:11}}/><Th c="🌐G맵" style={{textAlign:"center",fontSize:11}}/><Th c="🟡K맵" style={{textAlign:"center",fontSize:11}}/><Th c=""/></tr></thead>
                  <tbody>{data.keywords.map((k:any,ri:number)=>(
                    <tr key={k.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                      <Td><span style={{fontWeight:700}}>{k.keyword}</span></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.myBlogRank} color="#6366f1"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.myPlaceRank} color="#06b6d4"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankCafe} color="#ec4899"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankKnowledge} color="#f59e0b"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankNews} color="#94a3b8"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankPowerlink} color="#10b981"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankNaverMap} color="#22d3ee"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankGoogle} color="#f97316"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankKakao} color="#fbbf24"/></Td>
                      <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editKw",item:k})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("keywords",k.id)}/></div></Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {(modal==="kw"||modal?.type==="editKw")&&(
                <Modal title={modal==="kw"?"키워드 추가":"편집"} onClose={()=>setModal(null)}>
                  <KwForm initial={modal?.item} onSave={f=>{
                    if(modal==="kw")upd("keywords",[...data.keywords,{...f,id:Date.now(),status:"warn"}]);
                    else upd("keywords",data.keywords.map((k:any)=>k.id===modal.item.id?{...k,...f}:k));setModal(null);
                  }}/>
                </Modal>
              )}
              {modal==="aiKw"&&(
                <Modal title="🤖 AI 키워드 제안" onClose={()=>{setModal(null);setAiResult([]);}} wide>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    <FF label="지역 *"><Inp value={aiRegion} onChange={setAiRegion} placeholder="예: 강남, 분당, 해운대"/></FF>
                    <FF label="진료과목"><Inp value={aiSpec} onChange={setAiSpec} placeholder="예: 피부과, 성형외과"/></FF>
                  </div>
                  <Btn onClick={callAI} color="#8b5cf6" style={{width:"100%",marginBottom:16}}>{aiLoading?"🔄 분석 중...":"🤖 AI 키워드 분석"}</Btn>
                  {aiResult.length>0&&(
                    <div>
                      <div style={{maxHeight:300,overflowY:"auto",marginBottom:12}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                          <thead><tr><Th c="#"/><Th c="키워드"/><Th c="월 검색량"/></tr></thead>
                          <tbody>{aiResult.map((r:any,i:number)=>(
                            <tr key={i} style={{borderBottom:"1px solid #1e293b",background:i%2===0?"#0f172a":"#111827"}}>
                              <Td><span style={{color:"#6366f1",fontWeight:700}}>{r.priority||i+1}</span></Td>
                              <Td><span style={{fontWeight:700}}>{r.keyword}</span></Td>
                              <Td><span style={{color:"#06b6d4"}}>{fmt(r.monthlySearch)}</span></Td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                      <Btn onClick={addAIKws} style={{width:"100%"}}>✅ {aiResult.length}개 키워드 전체 추가</Btn>
                    </div>
                  )}
                </Modal>
              )}
            </div>
          )}

          {/* ══ MAPS ══ */}
          {tab==="maps"&&(
            <SectionWithCost title="📍 지도 노출 순위" cost={data.costs?.maps||0} onCostChange={v=>upd("costs",{...data.costs,maps:v})} color="#06b6d4" right={<Btn onClick={()=>setModal("map")}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="키워드"/><Th c="네이버"/><Th c="구글"/><Th c="카카오"/><Th c="상태"/><Th c=""/></tr></thead>
                <tbody>{data.maps.map((m:any,ri:number)=>(
                  <tr key={m.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><span style={{color:"#6366f1",fontWeight:700}}>{m.keyword}</span></Td>
                    <Td><span style={{color:rankColor(m.naverPlace),fontWeight:700}}>{m.naverPlace}</span></Td>
                    <Td><span style={{color:rankColor(m.google),fontWeight:700}}>{m.google}</span></Td>
                    <Td><span style={{color:rankColor(m.kakao),fontWeight:700}}>{m.kakao}</span></Td>
                    <Td><Badge status={m.status}/></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editMap",item:m})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("maps",m.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {(modal==="map"||modal?.type==="editMap")&&(
                <Modal title={modal==="map"?"지도 추가":"편집"} onClose={()=>setModal(null)}>
                  <MapForm initial={modal?.item} onSave={f=>{if(modal==="map")upd("maps",[...data.maps,{...f,id:Date.now(),status:"warn"}]);else upd("maps",data.maps.map((m:any)=>m.id===modal.item.id?{...m,...f}:m));setModal(null);}}/>
                </Modal>
              )}
            </SectionWithCost>
          )}

          {/* ══ EXPERIENCE ══ */}
          {tab==="experience"&&(
            <SectionWithCost title="✍️ 체험단" cost={data.costs?.experience||0} onCostChange={v=>upd("costs",{...data.costs,experience:v})} color="#10b981" right={<Btn onClick={()=>setModal("exp")}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="플랫폼"/><Th c="조회수"/><Th c="갱신"/><Th c="상태"/><Th c=""/></tr></thead>
                <tbody>{(data.experiences||[]).map((e:any,ri:number)=>(
                  <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><LinkCell url={e.url}><span style={{fontWeight:700}}>{e.title}</span></LinkCell></Td>
                    <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{e.blogger||"네이버블로그"}</span></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(e.views)}</span></Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{e.date}</span></Td>
                    <Td><Badge status={e.status||"warn"}/></Td>
                    <Td><DelBtn onClick={()=>del("experiences",e.id)}/></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal==="exp"&&<Modal title="체험단 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","blogger:플랫폼|네이버블로그","url:URL","views:조회수"]} onSave={f=>{upd("experiences",[...(data.experiences||[]),{...f,id:Date.now(),views:+f.views||0,status:"warn",date:today()}]);setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* ══ CAFES ══ */}
          {tab==="cafes"&&(
            <SectionWithCost title="☕ 카페 바이럴" cost={data.costs?.cafes||0} onCostChange={v=>upd("costs",{...data.costs,cafes:v})} color="#ec4899" right={<Btn onClick={()=>setModal("cafe")}>+ 카페</Btn>}>
              {(data.cafes||[]).map((cafe:any)=>(
                <div key={cafe.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontWeight:800,fontSize:15}}>{cafe.name}</span>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <Btn onClick={()=>setModal({type:"addPost",cafeId:cafe.id})} style={{padding:"5px 12px",fontSize:12}}>+ 게시물</Btn>
                      <DelBtn onClick={()=>upd("cafes",data.cafes.filter((c:any)=>c.id!==cafe.id))}/>
                    </div>
                  </div>
                  {(cafe.posts||[]).length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead><tr><Th c="게시물"/><Th c="조회수"/><Th c=""/></tr></thead>
                      <tbody>{cafe.posts.map((post:any)=>(
                        <tr key={post.id} style={{borderBottom:"1px solid #0f172a"}}>
                          <Td><LinkCell url={post.url}><span style={{fontWeight:600}}>{post.title}</span></LinkCell></Td>
                          <Td><span style={{color:"#06b6d4"}}>{fmt(post.views)}</span></Td>
                          <Td><DelBtn onClick={()=>upd("cafes",data.cafes.map((c:any)=>c.id===cafe.id?{...c,posts:c.posts.filter((p:any)=>p.id!==post.id)}:c))}/></Td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              ))}
              {modal==="cafe"&&<Modal title="카페 추가" onClose={()=>setModal(null)}><SimpleForm fields={["name:카페명","url:카페 URL"]} onSave={f=>{upd("cafes",[...data.cafes,{...f,id:Date.now(),posts:[]}]);setModal(null);}}/></Modal>}
              {modal?.type==="addPost"&&<Modal title="게시물 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} onSave={f=>{upd("cafes",data.cafes.map((c:any)=>c.id===modal.cafeId?{...c,posts:[...c.posts,{...f,id:Date.now(),views:+f.views||0}]}:c));setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* ══ YOUTUBE ══ */}
          {tab==="youtube"&&(
            <SectionWithCost title="▶️ 유튜브" cost={data.costs?.youtube||0} onCostChange={v=>upd("costs",{...data.costs,youtube:v})} color="#f97316" right={<Btn onClick={()=>setModal("yt")}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="조회수"/><Th c="좋아요"/><Th c="갱신"/><Th c=""/></tr></thead>
                <tbody>{(data.youtube||[]).map((y:any,ri:number)=>(
                  <tr key={y.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><LinkCell url={y.url}><span style={{fontWeight:700}}>{y.title}</span></LinkCell></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(y.views)}</span></Td>
                    <Td>{y.likes}</Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{y.date}</span></Td>
                    <Td><DelBtn onClick={()=>del("youtube",y.id)}/></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal==="yt"&&<Modal title="유튜브 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수","likes:좋아요수"]} onSave={f=>{upd("youtube",[...data.youtube,{...f,id:Date.now(),views:+f.views||0,likes:+f.likes||0,date:today()}]);setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* ══ SHORTFORM ══ */}
          {tab==="shortform"&&(
            <SectionWithCost title="📱 숏폼" cost={data.costs?.shortform||0} onCostChange={v=>upd("costs",{...data.costs,shortform:v})} color="#8b5cf6" right={<Btn onClick={()=>setModal("sf")}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="플랫폼"/><Th c="제목"/><Th c="조회수"/><Th c="좋아요"/><Th c="갱신"/><Th c=""/></tr></thead>
                <tbody>{(data.shortforms||[]).map((s:any,ri:number)=>(
                  <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{s.platform}</span></Td>
                    <Td><LinkCell url={s.url}><span style={{fontWeight:700}}>{s.title}</span></LinkCell></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(s.views)}</span></Td>
                    <Td>{s.likes}</Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{s.date}</span></Td>
                    <Td><DelBtn onClick={()=>del("shortforms",s.id)}/></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal==="sf"&&<Modal title="숏폼 추가" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼|인스타그램 / 유튜브쇼츠 / 틱톡","title:제목","url:URL","views:조회수","likes:좋아요수"]} onSave={f=>{upd("shortforms",[...(data.shortforms||[]),{...f,id:Date.now(),views:+f.views||0,likes:+f.likes||0,date:today()}]);setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* ══ AUTOCOMPLETE ══ */}
          {tab==="autocomplete"&&(
            <SectionWithCost title="🔤 키워드 자동완성" cost={data.costs?.autocomplete||0} onCostChange={v=>upd("costs",{...data.costs,autocomplete:v})} color="#14b8a6" right={<Btn onClick={()=>setModal("ac")}>+ 추가</Btn>}>
              {(data.autocomplete||[]).map((a:any)=>(
                <div key={a.id} style={{background:"#0f172a",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontWeight:800,fontSize:15,color:"#14b8a6"}}>{a.keyword}</span>
                    <div style={{display:"flex",gap:6}}><button onClick={()=>setModal({type:"editAC",item:a})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("autocomplete",a.id)}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6,fontWeight:600}}>네이버</div>{(a.naver||[]).map((n:string,i:number)=><div key={i} style={{background:"#1e293b",borderRadius:6,padding:"6px 10px",marginBottom:4,fontSize:13,color:"#6366f1"}}><span style={{color:"#475569",fontSize:11,marginRight:6}}>{i+1}</span>{n}</div>)}</div>
                    <div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6,fontWeight:600}}>인스타</div>{(a.instagram||[]).map((n:string,i:number)=><div key={i} style={{background:"#1e293b",borderRadius:6,padding:"6px 10px",marginBottom:4,fontSize:13,color:"#ec4899"}}><span style={{color:"#475569",fontSize:11,marginRight:6}}>{i+1}</span>#{n}</div>)}</div>
                  </div>
                </div>
              ))}
              {modal==="ac"&&<Modal title="키워드 추가" onClose={()=>setModal(null)}><ACForm onSave={f=>{upd("autocomplete",[...(data.autocomplete||[]),{...f,id:Date.now()}]);setModal(null);}}/></Modal>}
              {modal?.type==="editAC"&&<Modal title="편집" onClose={()=>setModal(null)}><ACForm initial={modal.item} onSave={f=>{upd("autocomplete",(data.autocomplete||[]).map((a:any)=>a.id===modal.item.id?{...a,...f}:a));setModal(null);}}/></Modal>}
            </SectionWithCost>
          )}

          {/* ══ SEO ══ */}
          {tab==="seo"&&(
            <SectionWithCost title="🌐 홈페이지 SEO" costLabel="SEO 월 관리비" cost={data.costs?.seo||0} onCostChange={v=>upd("costs",{...data.costs,seo:v})} color="#0ea5e9" right={<Btn onClick={()=>setModal("addSeo")}>+ 페이지 추가</Btn>}>
              {/* Summary */}
              {(()=>{
                const pages=data.seoPages||[];
                const done=pages.filter((p:any)=>p.status==="설정완료").length;
                const need=pages.filter((p:any)=>p.status==="수정필요").length;
                const none=pages.filter((p:any)=>p.status==="미설정").length;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}><div style={{color:"#94a3b8",fontSize:11}}>전체 페이지</div><div style={{color:"#0ea5e9",fontSize:24,fontWeight:800}}>{pages.length}</div></div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}><div style={{color:"#94a3b8",fontSize:11}}>✅ 설정완료</div><div style={{color:"#10b981",fontSize:24,fontWeight:800}}>{done}</div></div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}><div style={{color:"#94a3b8",fontSize:11}}>⚠️ 수정필요</div><div style={{color:"#f59e0b",fontSize:24,fontWeight:800}}>{need}</div></div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}><div style={{color:"#94a3b8",fontSize:11}}>❌ 미설정</div><div style={{color:"#ef4444",fontSize:24,fontWeight:800}}>{none}</div></div>
                  </div>
                );
              })()}
              {/* Page Cards */}
              {(data.seoPages||[]).map((page:any)=>{
                const checkItems=[{key:"titleLen",label:"Meta Title",icon:"📌"},{key:"descLen",label:"Meta Desc",icon:"📝"},{key:"h1Has",label:"H1 키워드",icon:"🏷️"},{key:"altText",label:"Alt 텍스트",icon:"🖼️"},{key:"internalLink",label:"내부 링크",icon:"🔗"},{key:"schema",label:"Schema",icon:"📊"},{key:"mobileOpt",label:"모바일",icon:"📱"},{key:"pageSpeed",label:"속도",icon:"⚡"},{key:"ssl",label:"SSL",icon:"🔒"},{key:"sitemap",label:"사이트맵",icon:"🗺️"}];
                const passed=checkItems.filter(c=>page.seoChecklist?.[c.key]).length;
                const score=Math.round(passed/checkItems.length*100);
                const statusColor=page.status==="설정완료"?"#10b981":page.status==="수정필요"?"#f59e0b":"#ef4444";
                return (
                  <div key={page.id} style={{background:"#0f172a",borderRadius:14,marginBottom:16,overflow:"hidden",border:`1px solid ${statusColor}33`}}>
                    <div style={{background:page.status==="설정완료"?"#022c22":page.status==="수정필요"?"#422006":"#2d0f0f",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{background:statusColor,color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700}}>{page.status}</span>
                        <div><div style={{fontWeight:800,fontSize:15}}>{page.targetKeyword}</div><div style={{color:"#64748b",fontSize:12,marginTop:2}}>{page.pageTitle} · <span style={{color:"#0ea5e9"}}>{page.pageUrl}</span></div></div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <span style={{color:score>=80?"#10b981":score>=50?"#f59e0b":"#ef4444",fontWeight:800}}>{score}%</span>
                        <button onClick={()=>setModal({type:"editSeo",item:page})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12}}>편집</button>
                        <DelBtn onClick={()=>upd("seoPages",(data.seoPages||[]).filter((p:any)=>p.id!==page.id))}/>
                      </div>
                    </div>
                    <div style={{padding:"14px 20px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:6}}>
                        {checkItems.map(c=>{
                          const ok=page.seoChecklist?.[c.key];
                          return (<button key={c.key} onClick={()=>upd("seoPages",(data.seoPages||[]).map((p:any)=>p.id===page.id?{...p,seoChecklist:{...p.seoChecklist,[c.key]:!ok}}:p))}
                            style={{display:"flex",alignItems:"center",gap:6,background:ok?"#022c2288":"#1e293b",border:`1px solid ${ok?"#10b98144":"#33415544"}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",textAlign:"left"}}>
                            <span style={{fontSize:14}}>{ok?"✅":"⬜"}</span>
                            <span style={{color:ok?"#10b981":"#64748b",fontSize:12,fontWeight:ok?600:400}}>{c.icon} {c.label}</span>
                          </button>);
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(modal==="addSeo"||modal?.type==="editSeo")&&(
                <Modal title={modal==="addSeo"?"🌐 SEO 페이지 추가":"🌐 SEO 편집"} onClose={()=>setModal(null)} wide>
                  <SeoForm initial={modal?.item||{}} existingKws={(data.keywords||[]).map((k:any)=>k.keyword)} onSave={f=>{
                    const entry={...f,seoChecklist:modal?.item?.seoChecklist||{},lastUpdated:today()};
                    if(modal==="addSeo")upd("seoPages",[...(data.seoPages||[]),{...entry,id:Date.now()}]);
                    else upd("seoPages",(data.seoPages||[]).map((p:any)=>p.id===modal.item.id?{...p,...entry}:p));
                    setModal(null);
                  }}/>
                </Modal>
              )}
            </SectionWithCost>
          )}

          {/* ══ CALENDAR ══ */}
          {tab==="calendar"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                {[{id:"calendar",l:"📅 캘린더"},{id:"todos",l:"✅ 할 일"},{id:"alerts",l:"🔔 D-Day"}].map(t=>(
                  <button key={t.id} onClick={()=>setCalTab(t.id)} style={{background:calTab===t.id?"#6366f1":"#1e293b",color:calTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>{t.l}</button>
                ))}
              </div>

              {calTab==="calendar"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <button onClick={()=>setCalMonth(p=>{let m=p.m-1,y=p.y;if(m<0){m=11;y--;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>‹</button>
                    <div style={{fontWeight:800,fontSize:18}}>{calMonth.y}년 {calMonth.m+1}월</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{const n=new Date();setCalMonth({y:n.getFullYear(),m:n.getMonth()});}} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>오늘</button>
                      <Btn onClick={()=>setModal("addEvent")} style={{padding:"6px 12px",fontSize:12}}>+ 일정</Btn>
                      <Btn onClick={()=>setModal("addTodo")} color="#f59e0b" style={{padding:"6px 12px",fontSize:12}}>+ 할 일</Btn>
                      <button onClick={()=>setCalMonth(p=>{let m=p.m+1,y=p.y;if(m>11){m=0;y++;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>›</button>
                    </div>
                  </div>
                  {/* Calendar Grid */}
                  {(()=>{
                    const firstDay=new Date(calMonth.y,calMonth.m,1).getDay();
                    const daysInMonth=new Date(calMonth.y,calMonth.m+1,0).getDate();
                    const todayStr=today();
                    const cells:any[]=[];
                    for(let i=0;i<firstDay;i++)cells.push(null);
                    for(let d=1;d<=daysInMonth;d++)cells.push(d);
                    const events=data.calendarEvents||[];
                    const todos=data.todos||[];
                    return (
                      <div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                          {["일","월","화","수","목","금","토"].map((d,i)=>(<div key={i} style={{textAlign:"center",padding:"6px",color:i===0?"#ef4444":i===6?"#6366f1":"#64748b",fontSize:12,fontWeight:700}}>{d}</div>))}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                          {cells.map((d,i)=>{
                            if(!d)return <div key={i} style={{background:"#0a0f1e",borderRadius:6,minHeight:85}}/>;
                            const dateStr=`${calMonth.y}-${String(calMonth.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                            const dayEvents=events.filter((e:any)=>e.date===dateStr);
                            const dayTodos=todos.filter((t:any)=>t.dueDate===dateStr);
                            const allItems=[...dayEvents.map((e:any)=>({...e,_type:"event"})),...dayTodos.map((t:any)=>({...t,_type:"todo"}))];
                            const isToday=dateStr===todayStr;
                            const dow=new Date(calMonth.y,calMonth.m,d).getDay();
                            return (
                              <div key={i} style={{background:isToday?"#1e1b4b":"#0f172a",borderRadius:6,minHeight:85,padding:"4px 6px",border:isToday?"1px solid #6366f1":"1px solid #1e293b"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                                  <span style={{fontSize:12,fontWeight:isToday?800:600,color:isToday?"#6366f1":dow===0?"#ef4444":dow===6?"#818cf8":"#94a3b8"}}>{d}</span>
                                </div>
                                {allItems.slice(0,3).map((item:any,idx:number)=>{
                                  if(item._type==="event"){
                                    const et=EVENT_TYPES.find(t=>t.v===item.type);
                                    return (<div key={"e"+item.id} style={{background:(et?.c||"#6366f1")+"22",borderLeft:`2px solid ${et?.c||"#6366f1"}`,borderRadius:3,padding:"1px 5px",marginBottom:2,fontSize:10,color:item.done?"#475569":et?.c||"#94a3b8",textDecoration:item.done?"line-through":"none",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                                      onClick={()=>upd("calendarEvents",events.map((e:any)=>e.id===item.id?{...e,done:!e.done}:e))}>{item.title}</div>);
                                  }
                                  const pr=PRIORITY_OPTS.find(p=>p.v===item.priority);
                                  return (<div key={"t"+item.id} style={{background:"#f59e0b11",borderLeft:`2px solid ${pr?.c||"#f59e0b"}`,borderRadius:3,padding:"1px 5px",marginBottom:2,fontSize:10,color:item.done?"#475569":pr?.c||"#f59e0b",textDecoration:item.done?"line-through":"none",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                                    onClick={()=>upd("todos",todos.map((t:any)=>t.id===item.id?{...t,done:!t.done}:t))}>{item.text}</div>);
                                })}
                                {allItems.length>3&&<div style={{fontSize:9,color:"#475569",textAlign:"center"}}>+{allItems.length-3}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {calTab==="todos"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:16}}>✅ 할 일 관리</div>
                    <Btn onClick={()=>setModal("addTodo")} color="#f59e0b">+ 할 일</Btn>
                  </div>
                  {(data.todos||[]).filter((t:any)=>!t.done).sort((a:any,b:any)=>{const po:any={high:0,medium:1,low:2};return(po[a.priority]||1)-(po[b.priority]||1);}).map((todo:any)=>{
                    const pr=PRIORITY_OPTS.find(p=>p.v===todo.priority);
                    return (
                      <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#0f172a",borderRadius:10,marginBottom:6,borderLeft:`3px solid ${pr?.c||"#f59e0b"}`}}>
                        <button onClick={()=>upd("todos",(data.todos||[]).map((t:any)=>t.id===todo.id?{...t,done:true}:t))}
                          style={{background:"none",border:`2px solid ${pr?.c||"#64748b"}`,borderRadius:6,width:22,height:22,cursor:"pointer",flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{color:"#e2e8f0",fontSize:14,fontWeight:600}}>{todo.text}</div>
                          <div style={{display:"flex",gap:6,marginTop:4}}>
                            <span style={{background:(pr?.c||"#f59e0b")+"22",color:pr?.c,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{pr?.l}</span>
                            <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{todo.channel}</span>
                            <span style={{color:"#475569",fontSize:11}}>마감 {todo.dueDate?.slice(5)}</span>
                          </div>
                        </div>
                        <DdayBadge dateStr={todo.dueDate}/>
                        <DelBtn onClick={()=>upd("todos",(data.todos||[]).filter((t:any)=>t.id!==todo.id))}/>
                      </div>
                    );
                  })}
                  {(data.todos||[]).filter((t:any)=>t.done).length>0&&(
                    <div style={{marginTop:20}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#475569"}}>✅ 완료</div>
                      {(data.todos||[]).filter((t:any)=>t.done).map((todo:any)=>(
                        <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",background:"#0f172a",borderRadius:8,marginBottom:4,opacity:0.5}}>
                          <button onClick={()=>upd("todos",(data.todos||[]).map((t:any)=>t.id===todo.id?{...t,done:false}:t))}
                            style={{background:"#10b981",border:"none",borderRadius:6,width:22,height:22,cursor:"pointer",color:"#fff",fontSize:12,flexShrink:0}}>✓</button>
                          <span style={{color:"#475569",fontSize:13,textDecoration:"line-through",flex:1}}>{todo.text}</span>
                          <DelBtn onClick={()=>upd("todos",(data.todos||[]).filter((t:any)=>t.id!==todo.id))}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {calTab==="alerts"&&(
                <div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>🔔 D-Day 알림</div>
                  {(()=>{
                    const alerts:any[]=[];
                    (data.calendarEvents||[]).filter((e:any)=>e.type==="deadline"&&!e.done).forEach((e:any)=>alerts.push({title:e.title,date:e.date,channel:e.channel,source:"캘린더"}));
                    [...(data.offline?.elevator||[]),...(data.offline?.subway||[]),...(data.offline?.other||[])].filter((a:any)=>a.status==="집행중").forEach((a:any)=>{
                      const loc=a.complex||a.station||a.location||a.type;
                      alerts.push({title:`${loc} 광고 종료`,date:a.endDate,channel:"오프라인",source:"오프라인"});
                    });
                    (data.todos||[]).filter((t:any)=>!t.done).forEach((t:any)=>alerts.push({title:t.text,date:t.dueDate,channel:t.channel,source:"할 일"}));
                    alerts.sort((a,b)=>getDday(a.date)-getDday(b.date));
                    const urgent=alerts.filter(a=>{const d=getDday(a.date);return d>=0&&d<=7;});
                    const upcoming=alerts.filter(a=>{const d=getDday(a.date);return d>7&&d<=30;});
                    return (
                      <div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                          <div style={{background:"#2d0f0f",borderRadius:12,padding:"16px 18px"}}><div style={{color:"#ef4444",fontSize:12,fontWeight:600}}>🚨 긴급 (7일 이내)</div><div style={{color:"#ef4444",fontSize:28,fontWeight:800,marginTop:4}}>{urgent.length}건</div></div>
                          <div style={{background:"#422006",borderRadius:12,padding:"16px 18px"}}><div style={{color:"#f59e0b",fontSize:12,fontWeight:600}}>⏳ 예정 (30일 이내)</div><div style={{color:"#f59e0b",fontSize:28,fontWeight:800,marginTop:4}}>{upcoming.length}건</div></div>
                          <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}><div style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>전체</div><div style={{color:"#94a3b8",fontSize:28,fontWeight:800,marginTop:4}}>{alerts.length}건</div></div>
                        </div>
                        {alerts.map((a,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#0f172a",borderRadius:8,marginBottom:4}}>
                          <DdayBadge dateStr={a.date}/><span style={{color:"#e2e8f0",fontSize:13,flex:1,fontWeight:600}}>{a.title}</span>
                          <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{a.channel}</span>
                          <span style={{color:"#475569",fontSize:11}}>{a.date}</span>
                        </div>))}
                        {!alerts.length&&(<div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🎉</div><div style={{color:"#10b981",fontSize:15,fontWeight:700}}>등록된 기한이 없습니다</div></div>)}
                      </div>
                    );
                  })()}
                </div>
              )}

              {modal==="addEvent"&&<Modal title="📅 일정 추가" onClose={()=>setModal(null)}><EventForm onSave={f=>{upd("calendarEvents",[...(data.calendarEvents||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
              {modal==="addTodo"&&<Modal title="✅ 할 일 추가" onClose={()=>setModal(null)}><TodoForm onSave={f=>{upd("todos",[...(data.todos||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
            </div>
          )}

          {/* ══ COMMUNITY ══ */}
          {tab==="community"&&(
            <div>
              <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>🥕 당근/커뮤니티</div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                {COMM_PLATFORMS.map(p=>(
                  <button key={p} onClick={()=>setCommTab(p)} style={{background:commTab===p?"#6366f1":"#1e293b",color:commTab===p?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:commTab===p?700:400,fontSize:13}}>
                    {p} <span style={{opacity:0.7,fontSize:11}}>({getCommItems(p).length})</span>
                  </button>
                ))}
                <Btn onClick={()=>setModal({type:"addComm",platform:commTab})} style={{marginLeft:"auto"}}>+ 추가</Btn>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="조회수"/><Th c="갱신"/><Th c=""/></tr></thead>
                <tbody>
                  {getCommItems(commTab).map((c:any)=>(
                    <tr key={c.id} style={{borderBottom:"1px solid #1e293b"}}>
                      <Td><LinkCell url={c.url}><span style={{fontWeight:700}}>{c.title}</span></LinkCell></Td>
                      <Td><span style={{color:"#06b6d4"}}>{fmt(c.views)}</span></Td>
                      <Td><span style={{color:"#475569",fontSize:12}}>{c.lastUpdated}</span></Td>
                      <Td><DelBtn onClick={()=>upd("community",(data.community||[]).filter((r:any)=>r.id!==c.id))}/></Td>
                    </tr>
                  ))}
                  {!getCommItems(commTab).length&&<tr><td colSpan={4} style={{padding:20,textAlign:"center",color:"#475569"}}>등록된 게시물이 없습니다.</td></tr>}
                </tbody>
              </table>
              {modal?.type==="addComm"&&<Modal title={`${modal.platform} 추가`} onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} onSave={f=>{upd("community",[...(data.community||[]),{...f,id:Date.now(),platform:modal.platform,views:+f.views||0,lastUpdated:today()}]);setModal(null);}}/></Modal>}
            </div>
          )}

          {/* ══ INHOUSE ══ */}
          {tab==="inhouse"&&(
            <div>
              <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>🏠 원내 마케팅</div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {[{id:"messages",label:"정기 메시지"},{id:"reviews",label:"리뷰 관리"},{id:"photos",label:"전후 사진"},{id:"videos",label:"원내 영상"}].map(t=>(
                  <button key={t.id} onClick={()=>setInhouseTab(t.id)} style={{background:inhouseTab===t.id?"#6366f1":"#1e293b",color:inhouseTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:inhouseTab===t.id?700:400,fontSize:13}}>{t.label}</button>
                ))}
              </div>

              {inhouseTab==="messages"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Btn onClick={()=>setModal("addMsg")}>+ 추가</Btn></div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="제목"/><Th c="플랫폼"/><Th c="발송일"/><Th c="발송수"/><Th c="오픈율"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{(data.inhouse?.messages||[]).map((m:any,ri:number)=>(
                      <tr key={m.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{m.title}</span></Td>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{m.platform}</span></Td>
                        <Td>{m.sentDate||m.sent_date}</Td>
                        <Td><span style={{color:"#06b6d4"}}>{fmt(m.recipients)}명</span></Td>
                        <Td><span style={{color:"#10b981",fontWeight:700}}>{m.openRate||m.open_rate}</span></Td>
                        <Td><span style={{background:m.status==="완료"?"#10b981":"#f59e0b",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{m.status}</span></Td>
                        <Td><DelBtn onClick={()=>updN("inhouse","messages",data.inhouse.messages.filter((x:any)=>x.id!==m.id))}/></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal==="addMsg"&&<Modal title="메시지 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|카카오 / 문자","sentDate:발송일","recipients:발송수","openRate:오픈율|예: 35%","status:상태|완료 / 예정"]} onSave={f=>{updN("inhouse","messages",[...data.inhouse.messages,{...f,id:Date.now(),recipients:+f.recipients||0}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {inhouseTab==="reviews"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Btn onClick={()=>setModal("addReview")}>+ 추가</Btn></div>
                  {(data.inhouse?.reviews||[]).map((r:any)=>(
                    <div key={r.id} style={{background:"#0f172a",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontWeight:700,fontSize:14}}>{r.platform}</span>
                        <DelBtn onClick={()=>updN("inhouse","reviews",data.inhouse.reviews.filter((x:any)=>x.id!==r.id))}/>
                      </div>
                      <ProgressBar value={r.count||0} max={r.target||100} color={(r.count||0)>=(r.target||100)?"#10b981":"#6366f1"}/>
                    </div>
                  ))}
                  {modal==="addReview"&&<Modal title="리뷰 추가" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼|네이버 플레이스 / 구글맵","count:현재 수","target:목표 수"]} onSave={f=>{updN("inhouse","reviews",[...data.inhouse.reviews,{...f,id:Date.now(),count:+f.count||0,target:+f.target||100}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {inhouseTab==="photos"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Btn onClick={()=>setModal("addPhoto")}>+ 추가</Btn></div>
                  {(data.inhouse?.photos||[]).map((p:any)=>(
                    <div key={p.id} style={{background:"#0f172a",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700}}>{p.title}</span><DelBtn onClick={()=>updN("inhouse","photos",data.inhouse.photos.filter((x:any)=>x.id!==p.id))}/></div>
                      <div style={{color:"#64748b",fontSize:12,marginTop:4}}>{p.category} · {p.lastUpdated||p.last_updated}</div>
                    </div>
                  ))}
                  {modal==="addPhoto"&&<Modal title="전후사진 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","category:카테고리|쁘띠성형 / 피부시술"]} onSave={f=>{updN("inhouse","photos",[...data.inhouse.photos,{...f,id:Date.now(),lastUpdated:today(),images:[]}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {inhouseTab==="videos"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Btn onClick={()=>setModal("addVideo")}>+ 추가</Btn></div>
                  {(data.inhouse?.videos||[]).map((v:any)=>(
                    <div key={v.id} style={{background:"#0f172a",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700}}>{v.title}</span><DelBtn onClick={()=>updN("inhouse","videos",data.inhouse.videos.filter((x:any)=>x.id!==v.id))}/></div>
                      <div style={{color:"#64748b",fontSize:12,marginTop:4}}>{v.location} · {v.duration}</div>
                    </div>
                  ))}
                  {modal==="addVideo"&&<Modal title="원내 영상 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","location:설치 위치|대기실 TV / 시술실","duration:길이|3분 20초","url:URL"]} onSave={f=>{updN("inhouse","videos",[...data.inhouse.videos,{...f,id:Date.now(),lastUpdated:today()}]);setModal(null);}}/></Modal>}
                </div>
              )}
            </div>
          )}

          {/* ══ OFFLINE ══ */}
          {tab==="offline"&&(
            <div>
              <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>📍 오프라인 광고</div>
              
              {/* Elevator */}
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:14}}>🏢 엘리베이터 광고</div>
                  <Btn onClick={()=>setModal("addElev")}>+ 추가</Btn>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr><Th c="단지"/><Th c="세대"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                  <tbody>{(data.offline?.elevator||[]).map((e:any,ri:number)=>(
                    <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                      <Td><span style={{fontWeight:700}}>{e.complex}</span></Td>
                      <Td>{e.units}세대</Td>
                      <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.startDate}</span></Td>
                      <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.endDate}</span><span style={{marginLeft:6}}><DdayBadge dateStr={e.endDate}/></span></Td>
                      <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(e.cost)}</span></Td>
                      <Td><span style={{background:e.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{e.status}</span></Td>
                      <Td><DelBtn onClick={()=>updN("offline","elevator",data.offline.elevator.filter((x:any)=>x.id!==e.id))}/></Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* Subway */}
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:14}}>🚇 역사/지하철 광고</div>
                  <Btn onClick={()=>setModal("addSub")}>+ 추가</Btn>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr><Th c="역"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                  <tbody>{(data.offline?.subway||[]).map((s:any,ri:number)=>(
                    <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                      <Td><span style={{fontWeight:700}}>{s.station}</span></Td>
                      <Td>{s.exit||s.location}</Td>
                      <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.startDate}</span></Td>
                      <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.endDate}</span><span style={{marginLeft:6}}><DdayBadge dateStr={s.endDate}/></span></Td>
                      <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(s.cost)}</span></Td>
                      <Td><span style={{background:s.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{s.status}</span></Td>
                      <Td><DelBtn onClick={()=>updN("offline","subway",data.offline.subway.filter((x:any)=>x.id!==s.id))}/></Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* Other */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:14}}>📌 기타 오프라인</div>
                  <Btn onClick={()=>setModal("addOth")}>+ 추가</Btn>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr><Th c="유형"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                  <tbody>{(data.offline?.other||[]).map((o:any,ri:number)=>(
                    <tr key={o.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                      <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{o.type}</span></Td>
                      <Td><span style={{fontWeight:700}}>{o.location}</span></Td>
                      <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.startDate}</span></Td>
                      <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.endDate}</span></Td>
                      <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(o.cost)}</span></Td>
                      <Td><span style={{background:o.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{o.status}</span></Td>
                      <Td><DelBtn onClick={()=>updN("offline","other",data.offline.other.filter((x:any)=>x.id!==o.id))}/></Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* Offline Modals */}
              {modal==="addElev"&&<Modal title="엘리베이터 추가" onClose={()=>setModal(null)}><SimpleForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","cost:비용(원)","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","elevator",[...(data.offline?.elevator||[]),{...f,id:Date.now(),units:+f.units||0,cost:+f.cost||0}]);setModal(null);}}/></Modal>}
              {modal==="addSub"&&<Modal title="역사 광고 추가" onClose={()=>setModal(null)}><SimpleForm fields={["station:역명","exit:위치|2번 출구","startDate:시작일","endDate:종료일","cost:비용(원)","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","subway",[...(data.offline?.subway||[]),{...f,id:Date.now(),cost:+f.cost||0}]);setModal(null);}}/></Modal>}
              {modal==="addOth"&&<Modal title="기타 추가" onClose={()=>setModal(null)}><SimpleForm fields={["type:유형|버스정류장 / 현수막","location:위치","startDate:시작일","endDate:종료일","cost:비용(원)","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","other",[...(data.offline?.other||[]),{...f,id:Date.now(),cost:+f.cost||0}]);setModal(null);}}/></Modal>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
