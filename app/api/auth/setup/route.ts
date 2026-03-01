import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

// GET /api/auth/setup - Create initial admin user
// Visit this URL once after deployment to create the admin account
export async function GET(req: NextRequest) {
  try {
    // Check if admin already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        message: '관리자 계정이 이미 존재합니다. /login 에서 로그인하세요.',
        hint: '비밀번호를 잊으셨다면 Supabase SQL Editor에서 users 테이블을 직접 수정하세요.'
      });
    }

    // Create admin user
    const hash = await hashPassword('admin1234');
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        password_hash: hash,
        name: '관리자',
        role: 'admin',
        branch_id: null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create default branch
    const { data: branch } = await supabase
      .from('branches')
      .insert({ name: '강남점', clinic_name: 'OO피부과' })
      .select()
      .single();

    // Create manager for the branch
    const managerHash = await hashPassword('1234');
    await supabase.from('users').insert({
      username: 'manager1',
      password_hash: managerHash,
      name: '강남점장',
      role: 'manager',
      branch_id: branch?.id,
    });

    return NextResponse.json({
      message: 'REBERRYOS 초기 설정 완료! 🎉',
      accounts: [
        { username: 'admin', password: 'admin1234', role: '통합관리자' },
        { username: 'manager1', password: '1234', role: '강남점 관리자' },
      ],
      next: '/login 에서 로그인하세요. 배포 후 반드시 비밀번호를 변경하세요!',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
