# Supabase RPC 함수 400 에러 해결 가이드

## 문제: `add_room_participant` 함수 호출 시 400 Bad Request

### 1. 함수 존재 확인

Supabase SQL Editor에서 다음 쿼리 실행:

```sql
SELECT 
  routine_name,
  routine_schema,
  routine_type,
  data_type as return_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'add_room_participant';
```

**결과가 없으면**: 함수가 생성되지 않은 것입니다. 아래 SQL을 실행하세요.

### 2. 함수 생성/재생성

```sql
-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.add_room_participant(bigint, text);

-- 함수 생성
CREATE OR REPLACE FUNCTION public.add_room_participant(
  p_room_id bigint,
  p_user_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_by text;
BEGIN
  -- RLS를 비활성화하여 방 생성자 확인
  SET LOCAL row_security = off;
  
  -- 방 생성자 확인
  SELECT created_by::text INTO v_created_by 
  FROM rooms 
  WHERE id = p_room_id;

  -- 방이 존재하지 않으면 에러
  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- 방 생성자이거나 자기 자신을 추가하는 경우만 허용
  IF v_created_by = auth.uid()::text OR p_user_id = auth.uid()::text THEN
    -- RLS를 비활성화한 상태에서 직접 삽입 (정책 우회)
    INSERT INTO room_participants (room_id, user_id)
    VALUES (p_room_id, p_user_id::uuid)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Not authorized to add participants to this room';
  END IF;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.add_room_participant(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_room_participant(bigint, text) TO anon;
```

### 3. 함수 테스트

```sql
-- 테스트 (실제 room_id와 user_id로 변경)
SELECT public.add_room_participant(27, 'd842aeb6-9f7c-433f-9405-7f34ed43da12');
```

### 4. 스키마 확인

함수가 `public` 스키마에 있는지 확인:

```sql
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_name = 'add_room_participant';
```

**결과**: `routine_schema`가 `public`이어야 합니다.

### 5. 권한 확인

```sql
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'add_room_participant';
```

**결과**: `authenticated`와 `anon`이 `EXECUTE` 권한을 가져야 합니다.

### 6. 브라우저 콘솔 확인

에러 발생 시 콘솔에 다음 정보가 출력됩니다:
- `❌ [RPC] Error details`: 에러 코드, 메시지, 상세 정보

**에러 코드별 의미**:
- `PGRST202`: 함수를 찾을 수 없음
- `42883`: 함수가 존재하지 않거나 시그니처가 맞지 않음
- `42809`: 함수 파라미터 타입 불일치
- `42501`: 권한 없음

### 7. 일반적인 해결 방법

1. **함수 재생성**: 위의 SQL을 다시 실행
2. **권한 재부여**: `GRANT EXECUTE` 명령 다시 실행
3. **스키마 확인**: 함수가 `public` 스키마에 있는지 확인
4. **파라미터 타입 확인**: `p_room_id`는 `bigint`, `p_user_id`는 `text`여야 함

