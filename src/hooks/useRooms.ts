import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Room, RoomWithMetadata } from '../lib/types';
import { useAuth } from './useAuth';

export function useRooms() {
  const [rooms, setRooms] = useState<RoomWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadRooms = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 현재 사용자가 참여한 방만 조회
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', user.id);

      if (participantError) {
        // 테이블이 없을 경우 빈 배열 반환
        if (participantError.code === 'PGRST205') {
          console.warn('room_participants table not found. Please run the SQL schema.');
          setRooms([]);
          setLoading(false);
          return;
        }
        console.error('Error loading room participants:', participantError);
        setRooms([]);
        setLoading(false);
        return;
      }

      const roomIds = participantData?.map((p) => p.room_id) || [];

      if (roomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .in('id', roomIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading rooms:', error);
        setRooms([]);
        setLoading(false);
        return;
      }

      if (data) {
        // 각 방의 참여자와 마지막 메시지 가져오기
        const roomsWithMetadata = await Promise.all(
          data.map(async (room: Room) => {
            // 방의 참여자 가져오기
            const { data: participants } = await supabase
              .from('room_participants')
              .select('user_id')
              .eq('room_id', room.id);
            
            const participantIds = participants?.map((p) => p.user_id) || [];

            const { data: lastMessages } = await supabase
              .from('messages')
              .select('content_ko, created_at')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;

            const now = new Date();
            const messageTime = lastMessage?.created_at
              ? new Date(lastMessage.created_at)
              : null;
            let timeStr = '';

            if (messageTime) {
              const diffMs = now.getTime() - messageTime.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);

              if (diffMins < 1) {
                timeStr = '방금';
              } else if (diffMins < 60) {
                timeStr = `${diffMins}분 전`;
              } else if (diffHours < 24) {
                timeStr = `${diffHours}시간 전`;
              } else if (diffDays === 1) {
                timeStr = '어제';
              } else if (diffDays < 7) {
                timeStr = `${diffDays}일 전`;
              } else {
                timeStr = messageTime.toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                });
              }
            }

            return {
              ...room,
              lastMsg: lastMessage?.content_ko || undefined,
              time: timeStr || undefined,
              unread: 0, // TODO: 읽지 않은 메시지 수 계산
              participantIds,
            } as RoomWithMetadata;
          })
        );

        setRooms(roomsWithMetadata);
      }
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error loading rooms:', err);
      setRooms([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('🔍 useRooms useEffect 실행:', { isSupabaseConfigured, userId: user?.id });
    
    if (!isSupabaseConfigured || !user) {
      console.log('⚠️ 방 목록 Realtime 구독 스킵: isSupabaseConfigured=', isSupabaseConfigured, 'user=', user?.id);
      return;
    }

    console.log('🚀 방 목록 Realtime 구독 시작');
    loadRooms();

    // Realtime 구독: 새 메시지가 오면 방 목록 업데이트
    console.log('🔌 방 목록 Realtime 채널 생성 시작...');
    
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 null입니다!');
      return;
    }

    // 채널 이름을 더 안정적으로 생성 (타임스탬프 제거)
    const channelName = `rooms_updates_${user.id}`;
    console.log('📺 방 목록 채널 이름:', channelName);
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('📨 [Realtime] 방 목록 - 새 메시지 이벤트 수신:', payload);
          // 새 메시지가 추가되면 해당 방만 업데이트하고 최상단으로 이동
          const newMessage = payload.new as { room_id: number; content_ko: string; created_at: string; user_id: string };
          setRooms((prevRooms) => {
            const roomExists = prevRooms.some((room) => room.id === newMessage.room_id);
            if (!roomExists) {
              // 방이 목록에 없으면 전체 다시 로드
          setTimeout(() => loadRooms(), 100);
              return prevRooms;
            }
            // 방 목록을 업데이트하고 최신 메시지가 있는 방을 맨 위로 이동
            const updatedRooms = prevRooms.map((room) => {
              if (room.id === newMessage.room_id) {
                return {
                  ...room,
                  lastMsg: newMessage.content_ko || undefined,
                  time: '방금',
                };
              }
              return room;
            });
            // 최신 메시지가 있는 방을 맨 위로 이동
            return updatedRooms.sort((a, b) => {
              if (a.id === newMessage.room_id) return -1;
              if (b.id === newMessage.room_id) return 1;
              return 0;
            });
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rooms',
        },
        () => {
          // 새 방 생성 시 목록 다시 로드
          loadRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
        },
        (payload) => {
          // 새 참여자 추가 시 (나간 사용자가 다시 들어온 경우)
          const newParticipant = payload.new as { room_id: number; user_id: string };
          if (newParticipant.user_id === user.id) {
            // 내가 다시 참여한 경우만 목록 업데이트
            loadRooms();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_participants',
        },
        (payload) => {
          // 참여자가 나간 경우
          const deletedParticipant = payload.old as { room_id: number; user_id: string };
          if (deletedParticipant.user_id === user.id) {
            // 내가 나간 경우 목록에서 제거
            setRooms((prevRooms) => prevRooms.filter((room) => room.id !== deletedParticipant.room_id));
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 [Realtime] 방 목록 채널 구독 상태:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] 방 목록 구독 성공!');
          // Realtime이 연결되면 폴링 비활성화
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('✅ [Rooms] Realtime 연결됨 - 폴링 비활성화');
          }
          // 연결 체크 타임아웃도 취소 (구독 성공했으므로)
          clearTimeout(connectionCheckTimeout);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Realtime] 방 목록 구독 오류!', err);
          startPollingIfNeeded();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [Realtime] 방 목록 구독 타임아웃!');
          startPollingIfNeeded();
        } else if (status === 'CLOSED') {
          console.warn('🔴 [Realtime] 방 목록 구독 닫힘');
          startPollingIfNeeded();
        } else {
          console.warn('⚠️ [Realtime] 방 목록 알 수 없는 상태:', status);
        }
      });
    
    console.log('🔌 방 목록 Realtime 채널 구독 요청 완료');

    // Realtime이 작동하지 않을 경우를 대비한 최소한의 폴링
    // 입력 중이 아닐 때만 실행, 변경된 부분만 업데이트
    let pollInterval: NodeJS.Timeout | null = null;
    
    const startPollingIfNeeded = () => {
      // 이미 폴링 중이면 스킵
      if (pollInterval) return;
      
      // 입력 필드에 포커스가 있으면 폴링 시작 안 함
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // 입력 중이면 나중에 다시 시도 (5초 후)
        setTimeout(startPollingIfNeeded, 5000);
        return;
      }
      
      pollInterval = setInterval(() => {
        // 입력 필드에 포커스가 있으면 이번 폴링 완전히 스킵 (키보드가 올라와 있을 때)
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          console.log('⌨️ [Rooms Polling] 입력 중 - 폴링 스킵');
          return;
        }
        
        // 입력 필드가 포커스를 잃었는지 확인 (더블 체크)
        const isInputFocused = document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (isInputFocused) {
          console.log('⌨️ [Rooms Polling] 입력 중 - 폴링 스킵');
          return;
        }
        
        // 부분 업데이트: 변경된 방만 업데이트 (전체 새로고침 없이)
        loadRooms();
      }, 30000); // 30초마다 폴링 (Realtime이 작동하지 않을 때만)
      
      console.log('🔄 [Rooms] 폴링 시작 (Realtime 연결 실패)');
    };
    
    // Realtime 연결 실패 감지를 위한 타임아웃 (10초 후)
    const connectionCheckTimeout = setTimeout(() => {
      // Realtime이 연결되지 않았으면 폴링 시작
      if (!pollInterval) {
        startPollingIfNeeded();
      }
    }, 10000);

    return () => {
      console.log('🧹 [Realtime] 방 목록 채널 정리:', channelName);
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      clearTimeout(connectionCheckTimeout);
      // 채널 제거 (즉시 제거)
      supabase.removeChannel(channel);
    };
  }, [loadRooms, user, isSupabaseConfigured]);

  const createRoom = async (name: string, friendId?: string, type: 'private' | 'topic' = 'topic') => {
    if (!isSupabaseConfigured || !user || !name.trim()) {
      return { error: new Error('Room name is required') };
    }

    try {
      // 방 생성
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ 
          name: name.trim(),
          type: type,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError || !room) {
        return { error: roomError || new Error('Failed to create room') };
      }

      // 현재 사용자를 참여자로 추가 (RPC 함수 사용)
      const { error: participantError1 } = await (supabase as any)
        .rpc('add_room_participant', { 
          p_room_id: room.id, 
          p_user_id: user.id.toString() // UUID를 text로 변환
        });

      if (participantError1) {
        console.error('❌ [RPC] Error adding self to room:', participantError1);
        console.error('❌ [RPC] Error details:', {
          code: participantError1.code,
          message: participantError1.message,
          details: participantError1.details,
          hint: participantError1.hint,
          roomId: room.id,
          userId: user.id.toString()
        });
        // RPC 함수가 없으면 직접 삽입 시도
        if (participantError1.code === 'PGRST202' || participantError1.code === '42883' || participantError1.code === '42809') {
          console.log('🔄 [RPC] Fallback: 직접 삽입 시도');
          const { error: fallbackError } = await supabase
            .from('room_participants')
            .insert({ room_id: room.id, user_id: user.id });
          if (fallbackError) {
            console.error('❌ [RPC] Fallback insert failed:', fallbackError);
          } else {
            console.log('✅ [RPC] Fallback insert 성공');
          }
        }
      } else {
        console.log('✅ [RPC] add_room_participant 성공 (self)');
      }

      // 친구도 참여자로 추가 (친구 ID가 제공된 경우)
      if (friendId) {
        const { error: participantError2 } = await (supabase as any)
          .rpc('add_room_participant', { 
            p_room_id: room.id, 
            p_user_id: friendId.toString() // UUID를 text로 변환
          });

        if (participantError2) {
          console.error('❌ [RPC] Error adding friend to room:', participantError2);
          console.error('❌ [RPC] Error details:', {
            code: participantError2.code,
            message: participantError2.message,
            details: participantError2.details,
            hint: participantError2.hint,
            roomId: room.id,
            friendId: friendId.toString()
          });
          // RPC 함수가 없으면 직접 삽입 시도
          if (participantError2.code === 'PGRST202' || participantError2.code === '42883' || participantError2.code === '42809') {
            console.log('🔄 [RPC] Fallback: 직접 삽입 시도');
            const { error: fallbackError } = await supabase
              .from('room_participants')
              .insert({ room_id: room.id, user_id: friendId });
            if (fallbackError) {
              console.error('Fallback insert for friend failed:', fallbackError);
            }
          }
        }
      }

      // 방 목록 다시 로드
      await loadRooms();

      return { data: room, error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unexpected error') };
    }
  };

  const leaveRoom = async (roomId: number) => {
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // room_participants에서 현재 사용자 삭제 (방 나가기)
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving room:', error);
        return { error };
      }

      // 방 목록 다시 로드
      await loadRooms();

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unexpected error') };
    }
  };

  return { rooms, loading, createRoom, leaveRoom };
}
