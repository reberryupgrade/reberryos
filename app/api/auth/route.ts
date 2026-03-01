import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken, hashPassword, comparePassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { action, username, password, name, role, branchId } = await req.json();

    if (action === 'login') {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !user) {
        return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
      }

      // Check password
      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
      }

      // Update last login
      await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

      // Sign JWT
      const token = signToken({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branchId: user.branch_id,
      });

      const res = NextResponse.json({
        user: { id: user.id, username: user.username, name: user.name, role: user.role, branchId: user.branch_id },
      });

      res.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return res;
    }

    if (action === 'register') {
      const hash = await hashPassword(password);
      const { data, error } = await supabase
        .from('users')
        .insert({ username, password_hash: hash, name, role: role || 'manager', branch_id: branchId || null })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ user: data });
    }

    if (action === 'logout') {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete('token');
      return res;
    }

    if (action === 'me') {
      const token = req.cookies.get('token')?.value;
      if (!token) return NextResponse.json({ user: null });
      
      const { verifyToken } = await import('@/lib/auth');
      const payload = verifyToken(token);
      if (!payload) return NextResponse.json({ user: null });
      return NextResponse.json({ user: payload });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
