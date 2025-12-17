import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Friend, User } from '../lib/types';
import { useAuth } from './useAuth';

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setLoading(false);
      return;
    }

    const loadFriends = async () => {
      setLoading(true);
      try {
        // 내가 친구로 추가한 사람들
        const { data: myFriends, error: error1 } = await supabase
          .from('friendships')
          .select(`
            id,
            friend_id,
            created_at
          `)
          .eq('user_id', user.id);

        if (error1) {
          if (error1.code === 'PGRST205') {
            console.warn('friendships table not found. Please run the SQL schema.');
            setFriends([]);
            setLoading(false);
            return;
          }
          console.error('Error loading my friends:', error1);
        }

        // 나를 친구로 추가한 사람들
        const { data: friendsOfMe, error: error2 } = await supabase
          .from('friendships')
          .select(`
            id,
            user_id,
            created_at
          `)
          .eq('friend_id', user.id);

        if (error2) {
          if (error2.code === 'PGRST205') {
            console.warn('friendships table not found. Please run the SQL schema.');
            setFriends([]);
            setLoading(false);
            return;
          }
          console.error('Error loading friends of me:', error2);
        }

        if (error1 || error2) {
          setFriends([]);
          setLoading(false);
          return;
        }

      // 친구 ID 수집
      const friendIds = new Set<string>();
      if (myFriends) {
        myFriends.forEach((f) => friendIds.add(f.friend_id));
      }
      if (friendsOfMe) {
        friendsOfMe.forEach((f) => friendIds.add(f.user_id));
      }

      // 프로필 정보 가져오기
      if (friendIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, name, avatar_url')
          .in('id', Array.from(friendIds));

        if (profileError) {
          console.error('Error loading profiles:', profileError);
        }

        // 친구 목록 구성
        const allFriends: Friend[] = [];
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        if (myFriends) {
          myFriends.forEach((f) => {
            const profile = profileMap.get(f.friend_id);
            if (profile) {
              allFriends.push({
                id: f.id,
                user_id: user.id,
                friend_id: f.friend_id,
                friend: profile as User,
                created_at: f.created_at,
              });
            }
          });
        }

        if (friendsOfMe) {
          friendsOfMe.forEach((f) => {
            if (!allFriends.find((af) => af.friend_id === f.user_id)) {
              const profile = profileMap.get(f.user_id);
              if (profile) {
                allFriends.push({
                  id: f.id,
                  user_id: f.user_id,
                  friend_id: user.id,
                  friend: profile as User,
                  created_at: f.created_at,
                });
              }
            }
          });
        }

        setFriends(allFriends);
        } else {
          setFriends([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error loading friends:', err);
        setFriends([]);
        setLoading(false);
      }
    };

    loadFriends();

    // Realtime 구독
    const channel = supabase
      .channel('friendships_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          loadFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          // 친구 요청이 수락되면 친구 목록 다시 로드
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const addFriend = async (friendEmail: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // 이메일로 프로필 찾기
      const { data: friendProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', friendEmail)
        .single();

      if (findError || !friendProfile) {
        if (findError?.code === 'PGRST116') {
          // 프로필이 없는 경우
          return { error: new Error('해당 이메일의 사용자를 찾을 수 없습니다. 사용자가 앱에 가입했는지 확인해주세요.') };
        }
        if (findError?.code === 'PGRST205') {
          return { error: new Error('데이터베이스 테이블이 설정되지 않았습니다. SQL 스키마를 실행해주세요.') };
        }
        return { error: new Error('해당 이메일의 사용자를 찾을 수 없습니다. 사용자가 앱에 가입했는지 확인해주세요.') };
      }

      if (friendProfile.id === user.id) {
        return { error: new Error('자기 자신을 친구로 추가할 수 없습니다.') };
      }

      // 이미 친구인지 확인
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_id', friendProfile.id)
        .single();

      if (existing) {
        return { error: new Error('이미 친구로 추가된 사용자입니다.') };
      }

      // 친구 추가
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendProfile.id,
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

  return { friends, loading, addFriend };
}

