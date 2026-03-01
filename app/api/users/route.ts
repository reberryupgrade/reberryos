import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, role, branch_id, created_at, last_login')
      .order('created_at');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, id, username, password, name, role, branchId } = await req.json();

    if (action === 'create') {
      // Use Supabase's crypt function via RPC
      const { data, error } = await supabase.rpc('create_user_with_password', {
        p_username: username,
        p_password: password,
        p_name: name,
        p_role: role || 'manager',
        p_branch_id: branchId || null,
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, user: data });
    }

    if (action === 'update') {
      const updates: any = {};
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (branchId !== undefined) updates.branch_id = branchId || null;

      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'resetPassword') {
      const { error } = await supabase.rpc('update_user_password', {
        p_user_id: id,
        p_password: password,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
