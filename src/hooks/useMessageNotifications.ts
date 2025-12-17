import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { usePushNotification } from './usePushNotification';

export function useMessageNotifications() {
  const { user } = useAuth();
  const { isSupported, permission, requestPermission, showNotification } = usePushNotification();

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !isSupported) {
      console.log('[MessageNotifications] 알림 구독 스킵:', {
        isSupabaseConfigured,
        hasUser: !!user,
        isSupported,
        permission
      });
      return;
    }

    console.log('[MessageNotifications] 알림 구독 시작:', {
      userId: user.id,
      permission,
      isSupported
    });

    // 권한 요청 (처음 한 번만)
    if (permission === 'default') {
      console.log('[MessageNotifications] 알림 권한이 default 상태입니다. 사용자가 설정에서 요청해야 합니다.');
      // 자동으로 권한 요청하지 않고, 사용자가 설정에서 요청하도록 함
      // requestPermission();
    }

    // 메시지 알림을 위한 채널
    const channel = supabase
      .channel(`notifications:${user.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            room_id: number;
            user_id: string | null;
            content_ko: string | null;
            content_en: string | null;
            created_at: string;
          };

          // 내가 보낸 메시지는 알림 표시 안 함
          if (newMessage.user_id === user.id) {
            return;
          }

          // iOS PWA 최적화: 백그라운드에서도 알림을 받을 수 있도록
          // 현재 방을 보고 있고 포커스가 있을 때만 알림 스킵
          const urlParams = new URLSearchParams(window.location.search);
          const currentRoomId = urlParams.get('room');
          const isCurrentRoom = currentRoomId && parseInt(currentRoomId) === newMessage.room_id;
          
          // 현재 방을 보고 있고 앱이 포커스되어 있으면 알림 스킵
          if (document.hasFocus() && isCurrentRoom) {
            console.log('[MessageNotifications] 현재 방의 메시지 - 알림 스킵');
            return;
          }
          
          // iOS에서는 앱이 백그라운드에 있어도 알림을 받아야 함
          console.log('[MessageNotifications] 새 메시지 알림 표시:', {
            roomId: newMessage.room_id,
            hasFocus: document.hasFocus(),
            isCurrentRoom
          });

          // 권한이 없으면 알림 표시 안 함
          if (permission !== 'granted') {
            console.log('[MessageNotifications] 알림 권한 없음 - 알림 스킵:', {
              permission,
              messageId: newMessage.id,
              roomId: newMessage.room_id
            });
            return;
          }
          
          console.log('[MessageNotifications] 알림 표시 준비:', {
            messageId: newMessage.id,
            roomId: newMessage.room_id,
            hasFocus: document.hasFocus(),
            isCurrentRoom
          });

          // 방 정보 가져오기
          const { data: room } = await supabase
            .from('rooms')
            .select('id, name, type')
            .eq('id', newMessage.room_id)
            .single();

          if (!room) {
            return;
          }

          // 발신자 정보 가져오기
          let senderName = '알 수 없음';
          if (newMessage.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, name, email')
              .eq('id', newMessage.user_id)
              .single();

            if (profile) {
              senderName = profile.name || profile.email?.split('@')[0] || '알 수 없음';
            }
          }

          // 메시지 내용
          const messageContent = newMessage.content_ko || newMessage.content_en || '메시지';
          const messagePreview = messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...' 
            : messageContent;

          // 알림 표시
          showNotification(`${senderName}`, {
            body: messagePreview,
            tag: `room-${newMessage.room_id}`, // 같은 방의 알림은 하나만 표시
            data: {
              url: `/talk3/?room=${newMessage.room_id}`,
              roomId: newMessage.room_id,
            },
          });
        }
      )
      .subscribe();

    // Service Worker에서 알림 클릭 이벤트 처리
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          const roomId = event.data.roomId;
          if (roomId) {
            // 방으로 이동 (App.tsx에서 처리하도록 이벤트 발생)
            window.dispatchEvent(new CustomEvent('navigateToRoom', { detail: { roomId } }));
          }
        }
      });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isSupported, permission, showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
  };
}

