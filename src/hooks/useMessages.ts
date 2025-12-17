import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Message, MessageWithSender } from '../lib/types';
import { useAuth } from './useAuth';

export function useMessages(roomId: number | null) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // 메시지 로드 함수 (외부에서 호출 가능하도록)
  const loadMessages = async (targetRoomId: number | null = roomId) => {
    if (!isSupabaseConfigured || !targetRoomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', targetRoomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
      return;
    }

    if (data) {
      // 모든 발신자 ID 수집
      const senderIds = [...new Set(data.map((msg: Message) => msg.user_id).filter(Boolean))] as string[];
      
      // 발신자 프로필 정보 가져오기
      let profileMap = new Map<string, { name?: string; email?: string }>();
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', senderIds);
        
        if (profiles) {
          profileMap = new Map(profiles.map((p) => [p.id, { 
            name: p.name ?? undefined, 
            email: p.email ?? undefined 
          }]));
        }
      }
      
      const formattedMessages: MessageWithSender[] = data.map((msg: Message) => {
        const senderProfile = msg.user_id ? profileMap.get(msg.user_id) : null;
        const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'User';
        
        return {
          ...msg,
          sender: msg.user_id === user?.id ? 'me' : 'friend',
          text: msg.content_ko || '',
          textEn: msg.content_en,
          time: new Date(msg.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          senderName: msg.user_id === user?.id ? undefined : senderName,
          senderId: msg.user_id || undefined,
        };
      });
      setMessages(formattedMessages);
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('🔍 useMessages useEffect 실행:', { isSupabaseConfigured, roomId, userId: user?.id });
    
    // roomId가 변경되면 즉시 메시지 초기화
    setMessages([]);
    setLoading(true);
    
    if (!isSupabaseConfigured || !roomId) {
      console.log('⚠️ Realtime 구독 스킵: isSupabaseConfigured=', isSupabaseConfigured, 'roomId=', roomId);
      setMessages([]);
      setLoading(false);
      return;
    }

    console.log(`🚀 Realtime 구독 시작 - roomId: ${roomId}`);

    // 현재 roomId를 캡처하여 클로저 문제 방지
    const currentRoomId = roomId;

    // 초기 메시지 로드
    loadMessages(currentRoomId);

    loadMessages();

    // Realtime 구독 설정
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 null입니다!');
      return;
    }

    const channelName = `messages:${currentRoomId}:${Date.now()}`;
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
          // 필터 제거 - 모든 메시지를 받고 클라이언트에서 필터링
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          // 현재 방의 메시지만 처리 (클로저 문제 방지)
          if (newMessage.room_id !== currentRoomId) {
            return;
          }
          console.log('📨 [Realtime] 메시지 수신 (roomId:', currentRoomId, '):', newMessage);
          
          // 발신자 프로필 정보 가져오기
          let senderName: string | undefined = undefined;
          if (newMessage.user_id && newMessage.user_id !== user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, name, email')
              .eq('id', newMessage.user_id)
              .single();
            
            if (profile) {
              senderName = profile.name || profile.email?.split('@')[0] || 'User';
            }
          }
          
          setMessages((prev) => {
            // 현재 방의 메시지만 유지 (roomId 변경 시 이전 방 메시지 제거)
            const filteredPrev = prev.filter((msg) => msg.room_id === currentRoomId);
            
            // 중복 체크: 이미 있는 메시지면 추가하지 않음
            if (filteredPrev.some((msg) => msg.id === newMessage.id)) {
              return filteredPrev;
            }
            console.log('✅ [Realtime] 새 메시지 추가:', newMessage.content_ko);
            const formattedMessage: MessageWithSender = {
              ...newMessage,
              sender: newMessage.user_id === user?.id ? 'me' : 'friend',
              text: newMessage.content_ko || '',
              textEn: newMessage.content_en,
              time: new Date(newMessage.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              senderName,
              senderId: newMessage.user_id || undefined,
            };
            return [...filteredPrev, formattedMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          // 필터 제거
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          // 현재 방의 메시지만 처리
          if (updatedMessage.room_id !== currentRoomId) {
            return;
          }
          console.log('🔄 [Realtime] 메시지 업데이트 (roomId:', currentRoomId, '):', updatedMessage);
          setMessages((prev) => {
            // 현재 방의 메시지만 유지
            const filteredPrev = prev.filter((msg) => msg.room_id === currentRoomId);
            return filteredPrev.map((msg) =>
              msg.id === updatedMessage.id
                ? {
                    ...msg,
                    content_en: updatedMessage.content_en,
                    textEn: updatedMessage.content_en,
                  }
                : msg
            );
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] 메시지 구독 성공! (roomId:', currentRoomId, ')');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Realtime] 구독 오류!', err);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [Realtime] 구독 타임아웃!');
        } else if (status === 'CLOSED') {
          console.warn('🔴 [Realtime] 구독 닫힘');
        }
      });
    
    // Realtime이 작동하지 않을 경우를 대비한 polling 폴백
    const pollInterval = setInterval(async () => {
      if (!isSupabaseConfigured || !currentRoomId) return;
      
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: true });
      
      if (data && data.length > 0) {
        // 발신자 ID 수집
        const senderIds = [...new Set(data.map((msg: Message) => msg.user_id).filter(Boolean))] as string[];
        
        // 발신자 프로필 정보 가져오기
        let profileMap = new Map<string, { name?: string; email?: string }>();
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', senderIds);
          
          if (profiles) {
            profileMap = new Map(profiles.map((p) => [p.id, { 
              name: p.name ?? undefined, 
              email: p.email ?? undefined 
            }]));
          }
        }
        
        setMessages((prev) => {
          // 현재 방의 메시지만 유지
          const filteredPrev = prev.filter((msg) => msg.room_id === currentRoomId);
          const prevIds = new Set(filteredPrev.map((m) => m.id));
          
          const newMessages = data
            .filter((msg) => !prevIds.has(msg.id))
            .map((msg: Message) => {
              const senderProfile = msg.user_id ? profileMap.get(msg.user_id) : null;
              const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'User';
              
              const formattedMessage: MessageWithSender = {
                ...msg,
                sender: (msg.user_id === user?.id ? 'me' : 'friend') as 'me' | 'friend',
                text: msg.content_ko || '',
                textEn: msg.content_en,
                time: new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                senderName: msg.user_id === user?.id ? undefined : senderName,
                senderId: msg.user_id || undefined,
              };
              return formattedMessage;
            });
          
          if (newMessages.length > 0) {
            console.log('📨 [Polling] 새 메시지 발견 (roomId:', currentRoomId, '):', newMessages.length);
            return [...filteredPrev, ...newMessages];
          }
          return filteredPrev;
        });
      }
    }, 2000); // 2초마다 폴링

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.id]);

  const sendMessage = async (content: string) => {
    if (!roomId || !user) return;

    try {
      // 메시지 전송 전에 해당 방의 모든 참여자를 다시 추가
      // (나간 사용자도 메시지를 받을 수 있도록)
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, created_by')
        .eq('id', roomId)
        .single();

      if (roomData) {
        // 방의 모든 참여자 가져오기 (메시지에서 user_id 추출)
        const { data: messagesData } = await supabase
          .from('messages')
          .select('user_id')
          .eq('room_id', roomId);

        if (messagesData) {
          // 메시지를 보낸 모든 사용자 ID 수집 (중복 제거)
          const userIds = new Set<string>();
          messagesData.forEach((msg) => {
            if (msg.user_id) {
              userIds.add(msg.user_id);
            }
          });

          // 현재 사용자도 추가
          userIds.add(user.id);

          // 각 사용자를 참여자로 추가 (이미 있으면 무시됨)
          for (const userId of userIds) {
            try {
              await (supabase as any).rpc('add_room_participant', {
                p_room_id: roomId,
                p_user_id: userId,
              });
            } catch (err) {
              // RPC 함수가 없으면 직접 삽입 시도
              if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST202') {
                try {
                  await supabase
                    .from('room_participants')
                    .insert({ room_id: roomId, user_id: userId });
                } catch {
                  // 이미 존재하면 에러 무시
                }
              }
            }
          }
        }
      }

      // 메시지 전송
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content_ko: content,
          content_en: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // 메시지 전송 후 즉시 로컬 상태 업데이트 (Realtime보다 빠른 UI 반응)
      if (newMessage) {
        const formattedMessage: MessageWithSender = {
          ...newMessage,
          sender: 'me',
          text: newMessage.content_ko || '',
          textEn: newMessage.content_en,
          time: new Date(newMessage.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => {
          // 현재 방의 메시지만 유지하고 새 메시지 추가
          const filteredPrev = prev.filter((msg) => msg.room_id === roomId);
          // 중복 체크
          if (filteredPrev.some((msg) => msg.id === formattedMessage.id)) {
            return filteredPrev;
          }
          return [...filteredPrev, formattedMessage];
        });
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  };

  return { messages, loading, sendMessage, refreshMessages: () => loadMessages() };
}

