import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        log_level: 'info' as any, // debug에서 info로 변경 (너무 많은 로그 방지)
        // 모바일 환경에서 연결 안정성 향상
        heartbeatIntervalMs: 30000, // 30초마다 heartbeat
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000), // 재연결 시도 간격
      },
    })
  : (null as unknown as SupabaseClient<Database>);

// Supabase 초기화 확인 (즉시 실행)
console.log('🔧 Supabase 초기화 시도...');
console.log('📍 isSupabaseConfigured:', isSupabaseConfigured);
console.log('📍 supabaseUrl:', supabaseUrl ? '설정됨' : '미설정');
console.log('📍 supabaseAnonKey:', supabaseAnonKey ? '설정됨' : '미설정');

if (isSupabaseConfigured && supabase) {
  console.log('✅ Supabase 클라이언트 초기화 완료');
  console.log('📍 Supabase URL:', supabaseUrl);
  
  // Realtime 연결 테스트
  const testChannel = supabase.channel('test-connection');
  testChannel.subscribe((status) => {
    console.log('🧪 Realtime 연결 테스트:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime 연결 성공!');
      supabase.removeChannel(testChannel);
    }
  });
} else {
  console.error('❌ Supabase 클라이언트 초기화 실패');
  console.error('⚠️ VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다!');
}

