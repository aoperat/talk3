import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * 사용자 온라인 상태 관리
 * - 로그인 시: last_seen_at 업데이트
 * - 앱 종료/로그아웃 시: 오프라인 처리
 */
export function useOnlineStatus() {
  const { user } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      return;
    }

    // 주기적으로 last_seen_at 업데이트 (5분마다)
    const updateInterval = setInterval(async () => {
      try {
        await supabase
          .from('profiles')
          .update({ 
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('[OnlineStatus] Error updating last_seen_at:', error);
      }
    }, 5 * 60 * 1000); // 5분마다

    // 초기 업데이트
    supabase
      .from('profiles')
      .update({ 
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) {
          console.error('[OnlineStatus] Error updating initial last_seen_at:', error);
        } else {
          console.log('[OnlineStatus] Initial last_seen_at updated');
        }
      });

    // 페이지 언로드 시 오프라인 처리
    const handleBeforeUnload = async () => {
      // Supabase REST API를 직접 호출 (fetch는 페이지 종료 시 취소될 수 있음)
      // 하지만 sendBeacon은 POST만 지원하므로, 여기서는 마지막 업데이트만 수행
      try {
        // 마지막 업데이트
        await supabase
          .from('profiles')
          .update({ 
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('[OnlineStatus] Error in beforeunload:', error);
      }
    };

    // visibilitychange 이벤트: 탭이 숨겨질 때
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // 탭이 숨겨질 때 마지막 접속 시간 업데이트
        try {
          await supabase
            .from('profiles')
            .update({ 
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        } catch (error) {
          console.error('[OnlineStatus] Error updating on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(updateInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // cleanup 시 마지막 업데이트
      supabase
        .from('profiles')
        .update({ 
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('[OnlineStatus] Error in cleanup:', error);
          }
        });
    };
  }, [user?.id]);
}

