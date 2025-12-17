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

    // 초기 메시지 로드 (중복 호출 제거)
    loadMessages(currentRoomId).catch((error) => {
      console.error('Error loading initial messages:', error);
      setLoading(false);
    });

    // Realtime 구독 설정
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 null입니다!');
      return;
    }

    // 채널 이름을 더 안정적으로 생성 (타임스탬프 제거, roomId만 사용)
    const channelName = `messages:${currentRoomId}`;
    console.log('🔌 [Realtime] 채널 생성:', channelName, 'roomId:', currentRoomId);
    
    // Realtime 구독 설정
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoomId}`, // 서버 측 필터링으로 현재 방의 메시지만 받기
        },
        async (payload) => {
          console.log('📨 [Realtime] 메시지 이벤트 수신 (원본):', JSON.stringify(payload, null, 2));
          console.log('📨 [Realtime] 메시지 이벤트 수신:', payload);
          const newMessage = payload.new as Message;
          
          // payload 구조 확인
          if (!payload.new) {
            console.error('❌ [Realtime] payload.new가 없습니다!', payload);
            return;
          }
          
          // 현재 방의 메시지인지 확인 (필터가 있지만 이중 체크)
          if (newMessage.room_id !== currentRoomId) {
            console.log('⚠️ [Realtime] 다른 방의 메시지 무시:', {
              receivedRoomId: newMessage.room_id,
              currentRoomId: currentRoomId
            });
            return;
          }
          
          console.log('📨 [Realtime] 메시지 수신 (roomId:', currentRoomId, '):', {
            id: newMessage.id,
            content: newMessage.content_ko,
            userId: newMessage.user_id,
            createdAt: newMessage.created_at
          });
          
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
              console.log('⚠️ [Realtime] 중복 메시지 무시:', newMessage.id);
              return filteredPrev;
            }
            
            console.log('✅ [Realtime] 새 메시지 추가:', {
              id: newMessage.id,
              content: newMessage.content_ko,
              prevCount: filteredPrev.length,
              newCount: filteredPrev.length + 1
            });
            
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
          filter: `room_id=eq.${currentRoomId}`, // 서버 측 필터링
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
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
        console.log('📡 [Realtime] 메시지 채널 구독 상태:', status, 'roomId:', currentRoomId);
        console.log('📡 [Realtime] 구독 상태 상세:', {
          status,
          error: err,
          channel: channelName,
          roomId: currentRoomId,
          filter: `room_id=eq.${currentRoomId}`,
          timestamp: new Date().toISOString(),
          errorDetails: err ? {
            message: err.message,
            name: err.name,
            stack: err.stack
          } : null
        });
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] 메시지 구독 성공! (roomId:', currentRoomId, ')');
          console.log('🔍 [Realtime] 채널 정보:', {
            channel: channelName,
            roomId: currentRoomId,
            filter: `room_id=eq.${currentRoomId}`,
            subscribed: true,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
          });
          // Realtime이 연결되면 폴링 비활성화
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('✅ [Messages] Realtime 연결됨 - 폴링 비활성화');
          }
          // 연결 체크 타임아웃도 클리어
          clearTimeout(connectionCheckTimeout);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Realtime] 구독 오류!', err);
          console.error('❌ [Realtime] 오류 상세:', {
            error: err,
            channel: channelName,
            roomId: currentRoomId,
            errorMessage: err?.message,
            errorStack: err?.stack
          });
          // 에러 발생 시 폴링 시작
          startPollingIfNeeded();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [Realtime] 구독 타임아웃!');
          console.error('⏱️ [Realtime] 타임아웃 상세:', {
            channel: channelName,
            roomId: currentRoomId,
            timestamp: new Date().toISOString()
          });
          // 타임아웃 시 폴링 시작
          startPollingIfNeeded();
        } else if (status === 'CLOSED') {
          // CLOSED 상태는 cleanup 함수에서 호출될 수 있으므로, 
          // 실제 에러인지 확인 필요
          const isCleanup = !pollInterval; // pollInterval이 없으면 cleanup일 가능성
          if (!isCleanup) {
            console.warn('🔴 [Realtime] 구독 닫힘 (예상치 못한 종료)');
            console.warn('🔴 [Realtime] 구독 닫힘 상세:', {
              channel: channelName,
              roomId: currentRoomId,
              timestamp: new Date().toISOString(),
              error: err,
              isMobile
            });
            // 모바일에서는 더 빠르게 폴링으로 전환
            if (isMobile) {
              console.log('📱 [Realtime] 모바일 환경 감지 - 폴링으로 즉시 전환');
              // 모바일에서는 즉시 폴링 시작
              setTimeout(() => {
                startPollingIfNeeded();
              }, 1000);
            } else {
              // 연결 종료 시 폴링 시작
              startPollingIfNeeded();
            }
          } else {
            console.log('🔴 [Realtime] 구독 닫힘 (정상 cleanup)');
          }
        } else {
          console.warn('⚠️ [Realtime] 알 수 없는 상태:', status);
        }
      });
    
    // Realtime이 작동하지 않을 경우를 대비한 최소한의 폴링
    // 입력 중이 아닐 때만 실행, 변경된 메시지만 가져옴
    let pollInterval: NodeJS.Timeout | null = null;
    let lastMessageTimestamp: string | null = null;
    
    // 모바일 환경 감지 (한 번만 선언)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const startPollingIfNeeded = () => {
      // 이미 폴링 중이면 스킵
      if (pollInterval) return;
      
      // 입력 필드에 포커스가 있으면 폴링 시작 안 함
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // 입력 중이면 나중에 다시 시도 (모바일: 3초, 데스크톱: 5초)
        setTimeout(startPollingIfNeeded, isMobile ? 3000 : 5000);
        return;
      }
      
      pollInterval = setInterval(async () => {
        // 입력 필드에 포커스가 있으면 이번 폴링 완전히 스킵 (키보드가 올라와 있을 때)
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          console.log('⌨️ [Polling] 입력 중 - 폴링 스킵');
          return;
        }
        
        // 입력 필드가 포커스를 잃었는지 확인 (더블 체크)
        const isInputFocused = document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (isInputFocused) {
          console.log('⌨️ [Polling] 입력 중 - 폴링 스킵');
          return;
        }
        
        if (!isSupabaseConfigured || !currentRoomId) return;
        
        // 마지막 메시지 이후의 새 메시지만 가져오기 (부분 업데이트만)
        const query = supabase
          .from('messages')
          .select('*')
          .eq('room_id', currentRoomId)
          .order('created_at', { ascending: true });
        
        if (lastMessageTimestamp) {
          query.gt('created_at', lastMessageTimestamp);
        } else {
          // 타임스탬프가 없으면 현재 메시지 목록의 마지막 메시지 타임스탬프 사용
          setMessages((prev) => {
            if (prev.length > 0) {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.created_at) {
                lastMessageTimestamp = lastMsg.created_at;
              }
            }
            return prev;
          });
          
          // 타임스탬프가 여전히 없으면 이번 폴링 스킵
          if (!lastMessageTimestamp) {
            return;
          }
          
          query.gt('created_at', lastMessageTimestamp);
        }
        
        const { data } = await query;
        
        if (data && data.length > 0) {
          // 마지막 메시지 타임스탬프 업데이트
          lastMessageTimestamp = data[data.length - 1].created_at;
          
          // 발신자 ID 수집 (새 메시지만)
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
          
          // 새 메시지만 추가 (전체 새로고침 없이)
          setMessages((prev) => {
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
      }, isMobile ? 15000 : 30000); // 모바일: 15초, 데스크톱: 30초 (Realtime이 작동하지 않을 때만)
      
      console.log('🔄 [Messages] 폴링 시작 (Realtime 연결 실패)');
    };
    
    // Realtime 연결 실패 감지를 위한 타임아웃
    // 모바일에서는 더 빠르게 폴링으로 전환 (5초)
    // isMobile은 위에서 이미 선언됨
    const connectionCheckTimeout = setTimeout(() => {
      // Realtime이 연결되지 않았으면 폴링 시작
      if (!pollInterval) {
        console.log(isMobile ? '📱 [Realtime] 모바일 환경 - 폴링으로 전환' : '🔄 [Realtime] 연결 실패 - 폴링으로 전환');
        startPollingIfNeeded();
      }
    }, isMobile ? 5000 : 10000); // 모바일: 5초, 데스크톱: 10초

    return () => {
      console.log('🧹 [Realtime] 메시지 채널 정리:', channelName, 'roomId:', currentRoomId);
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      clearTimeout(connectionCheckTimeout);
      // 채널 제거 (즉시 제거)
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

