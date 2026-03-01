-- Supabase SQL Editor에서 실행하세요
-- 유저 생성/비밀번호 변경을 위한 함수

-- pgcrypto 확장 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 유저 생성 함수
CREATE OR REPLACE FUNCTION create_user_with_password(
  p_username TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'manager',
  p_branch_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user RECORD;
BEGIN
  INSERT INTO users (username, password_hash, name, role, branch_id)
  VALUES (p_username, crypt(p_password, gen_salt('bf', 10)), p_name, p_role, p_branch_id)
  RETURNING id, username, name, role, branch_id INTO v_user;
  
  RETURN json_build_object('id', v_user.id, 'username', v_user.username, 'name', v_user.name, 'role', v_user.role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 비밀번호 변경 함수
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_password TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users SET password_hash = crypt(p_password, gen_salt('bf', 10)) WHERE id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'REBERRYOS 유저 관리 함수 생성 완료! ✅' AS result;
