'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

// Match the same data shape as the artifact version
export interface BranchData {
  keywords: any[];
  maps: any[];
  experiences: any[];
  cafes: any[];
  youtube: any[];
  shortforms: any[];
  autocomplete: any[];
  seoPages: any[];
  calendarEvents: any[];
  todos: any[];
  community: any[];
  inhouse: any;
  offline: any;
  performance: any[];
  conversions: any;
  avgRevenuePerPatient: number;
  costs: any;
  portalSettings: any;
  keywordCosts: any;
  [key: string]: any;
}

const DEFAULT_DATA: BranchData = {
  keywords: [],
  maps: [],
  experiences: [],
  cafes: [],
  youtube: [],
  shortforms: [],
  autocomplete: [],
  seoPages: [],
  calendarEvents: [],
  todos: [],
  community: [],
  inhouse: { messages: [], reviews: [], photos: [], videos: [], messagesCost: 0, reviewsCost: 0, photosCost: 0, videosCost: 0 },
  offline: { elevator: [], subway: [], other: [] },
  performance: [],
  conversions: {},
  avgRevenuePerPatient: 0,
  costs: {},
  portalSettings: { keywords: true, maps: true, youtube: true, shortform: true, reviews: true, cafes: true, budget: true },
  keywordCosts: {},
};

export function useBranchData(branchId: string | null) {
  const [data, setData] = useState<BranchData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load all data for this branch
  const loadData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [
        keywords, maps, experiences, cafes, youtube, shortforms,
        autocomplete, seoPages, calendarEvents, todos, community,
        inhouseMessages, inhouseReviews, inhousePhotos, inhouseVideos,
        offlineAds, performance, conversions, costs, portalSettings,
      ] = await Promise.all([
        supabase.from('keywords').select('*').eq('branch_id', branchId),
        supabase.from('maps').select('*').eq('branch_id', branchId),
        supabase.from('experiences').select('*').eq('branch_id', branchId),
        supabase.from('cafes').select('*, cafe_posts(*)').eq('branch_id', branchId),
        supabase.from('youtube_videos').select('*').eq('branch_id', branchId),
        supabase.from('shortforms').select('*').eq('branch_id', branchId),
        supabase.from('autocomplete').select('*').eq('branch_id', branchId),
        supabase.from('seo_pages').select('*').eq('branch_id', branchId),
        supabase.from('calendar_events').select('*').eq('branch_id', branchId),
        supabase.from('todos').select('*').eq('branch_id', branchId),
        supabase.from('community_items').select('*').eq('branch_id', branchId),
        supabase.from('inhouse_messages').select('*').eq('branch_id', branchId),
        supabase.from('inhouse_reviews').select('*').eq('branch_id', branchId),
        supabase.from('inhouse_photos').select('*').eq('branch_id', branchId),
        supabase.from('inhouse_videos').select('*').eq('branch_id', branchId),
        supabase.from('offline_ads').select('*').eq('branch_id', branchId),
        supabase.from('performance_logs').select('*').eq('branch_id', branchId).order('month'),
        supabase.from('conversions').select('*').eq('branch_id', branchId).single(),
        supabase.from('keyword_costs').select('*').eq('branch_id', branchId).single(),
        supabase.from('portal_settings').select('*').eq('branch_id', branchId).single(),
      ]);

      // Transform cafes to match artifact structure (nested posts)
      const cafesData = (cafes.data || []).map((c: any) => ({
        id: c.id,
        name: c.cafe_name,
        cost: c.cost,
        posts: (c.cafe_posts || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          url: p.url,
          views: p.views,
          date: p.post_date,
        })),
      }));

      // Transform offline to categorized structure
      const offlineData = {
        elevator: (offlineAds.data || []).filter((a: any) => a.category === 'elevator').map((a: any) => ({
          id: a.id, complex: a.location_name, units: a.detail, startDate: a.start_date, endDate: a.end_date, cost: a.cost, status: a.status,
        })),
        subway: (offlineAds.data || []).filter((a: any) => a.category === 'subway').map((a: any) => ({
          id: a.id, station: a.location_name, exit: a.detail, startDate: a.start_date, endDate: a.end_date, cost: a.cost, status: a.status,
        })),
        other: (offlineAds.data || []).filter((a: any) => a.category === 'other').map((a: any) => ({
          id: a.id, type: a.location_name, location: a.detail, startDate: a.start_date, endDate: a.end_date, cost: a.cost, status: a.status,
        })),
      };

      // Map DB fields to artifact field names
      const mapKeyword = (k: any) => ({
        id: k.id, keyword: k.keyword, monthlySearch: k.monthly_search,
        tabOrder: k.tab_order, myBlogRank: k.rank_blog, myPlaceRank: k.rank_place,
        rankCafe: k.rank_cafe, rankKnowledge: k.rank_knowledge, rankNews: k.rank_news,
        rankPowerlink: k.rank_powerlink, rankNaverMap: k.rank_naver_map,
        rankGoogle: k.rank_google, rankKakao: k.rank_kakao,
        trend: k.trend, status: k.status,
      });

      const mapEvent = (e: any) => ({
        id: e.id, title: e.title, date: e.event_date, type: e.type, channel: e.channel, done: e.done,
      });

      const mapTodo = (t: any) => ({
        id: t.id, text: t.text, channel: t.channel, priority: t.priority, dueDate: t.due_date, done: t.done,
      });

      setData({
        keywords: (keywords.data || []).map(mapKeyword),
        maps: (maps.data || []).map((m: any) => ({
          id: m.id, keyword: m.keyword, naverPlace: m.naver_place, google: m.google, kakao: m.kakao, status: m.status,
        })),
        experiences: (experiences.data || []).map((e: any) => ({
          id: e.id, blogger: e.blogger, title: e.title, url: e.url, date: e.publish_date, views: e.views, status: e.status,
        })),
        cafes: cafesData,
        youtube: (youtube.data || []).map((v: any) => ({
          id: v.id, title: v.title, url: v.url, views: v.views, likes: v.likes, date: v.upload_date,
        })),
        shortforms: (shortforms.data || []).map((s: any) => ({
          id: s.id, title: s.title, platform: s.platform, url: s.url, views: s.views, likes: s.likes, date: s.upload_date,
        })),
        autocomplete: (autocomplete.data || []).map((a: any) => ({
          id: a.id, keyword: a.keyword, naver: a.naver, instagram: a.instagram,
        })),
        seoPages: (seoPages.data || []).map((s: any) => ({
          id: s.id, targetKeyword: s.target_keyword, pageUrl: s.page_url, pageTitle: s.page_title,
          metaTitle: s.meta_title, metaDesc: s.meta_desc, h1Tag: s.h1_tag,
          currentRank: s.current_rank, targetRank: s.target_rank, status: s.status,
          seoChecklist: s.seo_checklist, notes: s.notes, lastUpdated: s.updated_at,
        })),
        calendarEvents: (calendarEvents.data || []).map(mapEvent),
        todos: (todos.data || []).map(mapTodo),
        community: (community.data || []).map((c: any) => ({
          id: c.id, platform: c.platform, cost: c.cost, title: c.title, url: c.url, views: c.views, lastUpdated: c.last_updated,
        })),
        inhouse: {
          messages: inhouseMessages.data || [],
          reviews: inhouseReviews.data || [],
          photos: inhousePhotos.data || [],
          videos: inhouseVideos.data || [],
          messagesCost: 0, reviewsCost: 0, photosCost: 0, videosCost: 0,
        },
        offline: offlineData,
        performance: (performance.data || []).map((p: any) => ({
          id: p.id, month: p.month, blogVisits: p.blog_visits, placeViews: p.place_views, calls: p.calls, reservations: p.reservations,
        })),
        conversions: conversions.data?.data || {},
        avgRevenuePerPatient: conversions.data?.avg_revenue_per_patient || 0,
        costs: costs.data?.costs || {},
        portalSettings: portalSettings.data?.visible_sections || DEFAULT_DATA.portalSettings,
        keywordCosts: costs.data?.costs || {},
      });
    } catch (err) {
      console.error('Failed to load branch data:', err);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save specific table data back to Supabase
  const saveToSupabase = useCallback(async (field: string, value: any) => {
    if (!branchId) return;
    
    try {
      switch (field) {
        case 'keywords':
          // Sync keywords - delete all and re-insert
          await supabase.from('keywords').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('keywords').insert(value.map((k: any) => ({
              id: k.id, branch_id: branchId, keyword: k.keyword, monthly_search: k.monthlySearch || 0,
              tab_order: k.tabOrder, rank_blog: k.myBlogRank, rank_place: k.myPlaceRank,
              rank_cafe: k.rankCafe, rank_knowledge: k.rankKnowledge, rank_news: k.rankNews,
              rank_powerlink: k.rankPowerlink, rank_naver_map: k.rankNaverMap,
              rank_google: k.rankGoogle, rank_kakao: k.rankKakao,
              trend: k.trend, status: k.status,
            })));
          }
          break;

        case 'maps':
          await supabase.from('maps').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('maps').insert(value.map((m: any) => ({
              id: m.id, branch_id: branchId, keyword: m.keyword, naver_place: m.naverPlace, google: m.google, kakao: m.kakao, status: m.status,
            })));
          }
          break;

        case 'experiences':
          await supabase.from('experiences').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('experiences').insert(value.map((e: any) => ({
              id: e.id, branch_id: branchId, blogger: e.blogger, title: e.title, url: e.url, publish_date: e.date, views: e.views, status: e.status,
            })));
          }
          break;

        case 'youtube':
          await supabase.from('youtube_videos').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('youtube_videos').insert(value.map((v: any) => ({
              id: v.id, branch_id: branchId, title: v.title, url: v.url, views: v.views, likes: v.likes, upload_date: v.date,
            })));
          }
          break;

        case 'shortforms':
          await supabase.from('shortforms').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('shortforms').insert(value.map((s: any) => ({
              id: s.id, branch_id: branchId, title: s.title, platform: s.platform, url: s.url, views: s.views, likes: s.likes, upload_date: s.date,
            })));
          }
          break;

        case 'seoPages':
          await supabase.from('seo_pages').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('seo_pages').insert(value.map((s: any) => ({
              id: s.id, branch_id: branchId, target_keyword: s.targetKeyword, page_url: s.pageUrl,
              page_title: s.pageTitle, meta_title: s.metaTitle, meta_desc: s.metaDesc, h1_tag: s.h1Tag,
              current_rank: s.currentRank, target_rank: s.targetRank, status: s.status,
              seo_checklist: s.seoChecklist, notes: s.notes,
            })));
          }
          break;

        case 'calendarEvents':
          await supabase.from('calendar_events').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('calendar_events').insert(value.map((e: any) => ({
              id: e.id, branch_id: branchId, title: e.title, event_date: e.date, type: e.type, channel: e.channel, done: e.done,
            })));
          }
          break;

        case 'todos':
          await supabase.from('todos').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('todos').insert(value.map((t: any) => ({
              id: t.id, branch_id: branchId, text: t.text, channel: t.channel, priority: t.priority, due_date: t.dueDate, done: t.done,
            })));
          }
          break;

        case 'community':
          await supabase.from('community_items').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('community_items').insert(value.map((c: any) => ({
              id: c.id, branch_id: branchId, platform: c.platform, cost: c.cost, title: c.title, url: c.url, views: c.views, last_updated: c.lastUpdated,
            })));
          }
          break;

        case 'performance':
          await supabase.from('performance_logs').delete().eq('branch_id', branchId);
          if (value.length > 0) {
            await supabase.from('performance_logs').insert(value.map((p: any) => ({
              id: p.id, branch_id: branchId, month: p.month, blog_visits: p.blogVisits, place_views: p.placeViews, calls: p.calls, reservations: p.reservations,
            })));
          }
          break;

        case 'conversions':
        case 'avgRevenuePerPatient':
          await supabase.from('conversions').upsert({
            branch_id: branchId,
            data: field === 'conversions' ? value : data.conversions,
            avg_revenue_per_patient: field === 'avgRevenuePerPatient' ? value : data.avgRevenuePerPatient,
          }, { onConflict: 'branch_id' });
          break;

        default:
          console.log('Unhandled save for field:', field);
      }
    } catch (err) {
      console.error('Save error:', field, err);
    }
  }, [branchId, data]);

  // Update function matching artifact's upd() interface
  const upd = useCallback((field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Debounced save to Supabase
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToSupabase(field, value);
    }, 900);
  }, [saveToSupabase]);

  return { data, upd, loading, reload: loadData };
}
