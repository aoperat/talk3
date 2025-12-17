import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { FriendRequest, User } from '../lib/types';
import { useAuth } from './useAuth';

export function useFriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setLoading(false);
      return;
    }

    const loadRequests = async () => {
      setLoading(true);
      try {
        // 받은 친구 요청만 조회 (pending 상태)
        const { data, error } = await supabase
          .from('friend_requests')
          .select(`
            id,
            from_user_id,
            to_user_id,
            status,
            created_at,
            updated_at
          `)
          .eq('to_user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('friend_requests table not found. Please run the SQL schema.');
            setRequests([]);
            setLoading(false);
            return;
          }
          console.error('Error loading friend requests:', error);
          setRequests([]);
          setLoading(false);
          return;
        }

      if (data && data.length > 0) {
        // 요청한 사용자의 프로필 가져오기
        const fromUserIds = data.map((r) => r.from_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, name, avatar_url')
          .in('id', fromUserIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        const requestsWithUsers: FriendRequest[] = data.map((r) => ({
          ...r,
          from_user: profileMap.get(r.from_user_id) as User | undefined,
        }));

        setRequests(requestsWithUsers);
        } else {
          setRequests([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error loading friend requests:', err);
        setRequests([]);
        setLoading(false);
      }
    };

    loadRequests();

    // Realtime 구독
    const channel = supabase
      .channel('friend_requests_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const sendRequest = async (toUserEmail: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // 이메일로 프로필 찾기
      let { data: toUserProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', toUserEmail)
        .single();

      // 프로필이 없으면 생성 시도 (사용자가 가입했지만 프로필이 없는 경우)
      if (findError && findError.code === 'PGRST116') {
        // auth.users에서 사용자 찾기 (직접 쿼리는 안 되므로, 프로필 생성 시도)
        // 대신 사용자에게 프로필을 먼저 생성하도록 안내하거나
        // 또는 이메일로 직접 프로필을 생성할 수 없으므로
        // 사용자에게 해당 이메일의 사용자가 앱에 가입하지 않았거나 프로필이 없다고 안내
        return { error: new Error('해당 이메일의 사용자를 찾을 수 없습니다. 사용자가 앱에 가입했는지 확인해주세요.') };
      }

      if (findError || !toUserProfile) {
        if (findError?.code === 'PGRST205') {
          return { error: new Error('데이터베이스 테이블이 설정되지 않았습니다. SQL 스키마를 실행해주세요.') };
        }
        return { error: new Error('해당 이메일의 사용자를 찾을 수 없습니다. 사용자가 앱에 가입했는지 확인해주세요.') };
      }

      if (toUserProfile.id === user.id) {
        return { error: new Error('자기 자신에게 친구 요청을 보낼 수 없습니다.') };
      }

      // 이미 친구인지 확인
      const { data: existingFriend } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${toUserProfile.id}),and(user_id.eq.${toUserProfile.id},friend_id.eq.${user.id})`)
        .single();

      if (existingFriend) {
        return { error: new Error('이미 친구로 추가된 사용자입니다.') };
      }

      // 이미 요청이 있는지 확인
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('from_user_id', user.id)
        .eq('to_user_id', toUserProfile.id)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return { error: new Error('이미 친구 요청을 보냈습니다.') };
        }
      }

      // 친구 요청 생성
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserProfile.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error && error.code === 'PGRST205') {
        return { error: new Error('데이터베이스 테이블이 설정되지 않았습니다. SQL 스키마를 실행해주세요.') };
      }

      return { data, error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unexpected error') };
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // 요청 정보 가져오기
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .single();

      if (fetchError || !request) {
        if (fetchError?.code === 'PGRST205') {
          return { error: new Error('데이터베이스 테이블이 설정되지 않았습니다. SQL 스키마를 실행해주세요.') };
        }
        return { error: new Error('친구 요청을 찾을 수 없습니다.') };
      }

      // 친구 관계 생성 (양방향)
      const { error: friendError1 } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: request.from_user_id,
      });

      if (friendError1) {
        if (friendError1.code === 'PGRST205') {
          return { error: new Error('데이터베이스 테이블이 설정되지 않았습니다. SQL 스키마를 실행해주세요.') };
        }
        return { error: friendError1 };
      }

      // 반대 방향도 추가 (상호 친구 관계)
      const { error: friendError2 } = await supabase.from('friendships').insert({
        user_id: request.from_user_id,
        friend_id: user.id,
      });

      if (friendError2 && friendError2.code !== 'PGRST205') {
        console.warn('Error creating reverse friendship:', friendError2);
      }

      // 요청 상태 업데이트
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError && updateError.code !== 'PGRST205') {
        return { error: updateError };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unexpected error') };
    }
  };

  const declineRequest = async (requestId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('to_user_id', user.id);

      if (error && error.code === 'PGRST205') {
        return { error: new Error('데이터베이스 테이블이 설정되지 않았습니다. SQL 스키마를 실행해주세요.') };
      }

      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unexpected error') };
    }
  };

  return {
    requests,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
  };
}

