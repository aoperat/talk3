import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRooms } from './hooks/useRooms';
import { useMessages } from './hooks/useMessages';
import { useFriends } from './hooks/useFriends';
import { useFriendRequests } from './hooks/useFriendRequests';
import { useProfile } from './hooks/useProfile';
import { useMessageNotifications } from './hooks/useMessageNotifications';
import Auth from './components/Auth';
import RoomList from './components/RoomList';
import ChatView from './components/ChatView';
import PeopleTab from './components/PeopleTab';
import NavigationRail from './components/NavigationRail';
import MobileBottomNav from './components/MobileBottomNav';
import Modal from './components/Modal';
import UpdateNotification from './components/UpdateNotification';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { LogOut, Edit2, Save, X } from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus';

function App() {
  console.log('🚀 App 컴포넌트 렌더링 시작');
  
  const { user, loading: authLoading } = useAuth();
  
  // 온라인 상태 관리
  useOnlineStatus();
  const { rooms, loading: roomsLoading, createRoom, leaveRoom } = useRooms();
  
  console.log('👤 사용자 상태:', { user: user?.id, authLoading });
  console.log('🏠 방 목록 상태:', { roomsCount: rooms.length, roomsLoading });
  const { friends, loading: friendsLoading, refreshFriends } = useFriends();
  const {
    requests: friendRequests,
    loading: requestsLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
  } = useFriendRequests();
  const { profile, updateProfile } = useProfile();
  const { isSupported: isNotificationSupported, permission: notificationPermission, requestPermission: requestNotificationPermission } = useMessageNotifications();
  
  // localStorage에서 초기 상태 복원
  const [activeTab, setActiveTab] = useState<'chats' | 'people'>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved === 'chats' || saved === 'people') ? saved : 'chats';
  });

  const [activeRoomId, setActiveRoomId] = useState<number | null>(() => {
    // 친구 탭이면 대화창을 열지 않음
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab === 'people') {
      return null;
    }
    const saved = localStorage.getItem('activeRoomId');
    return saved ? parseInt(saved, 10) : null;
  });

  // activeRoomId와 activeTab 변경 시 localStorage에 저장
  useEffect(() => {
    if (activeRoomId !== null) {
      localStorage.setItem('activeRoomId', activeRoomId.toString());
    } else {
      localStorage.removeItem('activeRoomId');
    }
  }, [activeRoomId]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
    // 친구 탭으로 변경할 때는 대화창 닫기
    if (activeTab === 'people' && activeRoomId !== null) {
      setActiveRoomId(null);
    }
  }, [activeTab, activeRoomId]);

  // activeRoomId가 더 이상 존재하지 않는 방이면 null로 설정
  useEffect(() => {
    if (activeRoomId !== null && !rooms.find(r => r.id === activeRoomId)) {
      setActiveRoomId(null);
    }
  }, [activeRoomId, rooms]);

  // 초기 history 상태 설정 및 URL 파라미터 처리 (알림 클릭 등)
  useEffect(() => {
    // 기본 상태: 방 선택 없음
    if (!window.history.state || typeof window.history.state?.roomId === 'undefined') {
      window.history.replaceState({ roomId: null }, '', window.location.pathname + window.location.search);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const roomIdParam = urlParams.get('room');
    if (roomIdParam) {
      const roomId = parseInt(roomIdParam, 10);
      if (!isNaN(roomId)) {
        setActiveRoomId(roomId);
        setActiveTab('chats');
        // URL에서 파라미터 제거 (하지만 state는 유지)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('room');
        window.history.replaceState({ roomId }, '', newUrl.toString());
      }
    }
  }, []);

  // 브라우저 / PWA 뒤로가기 처리: 방 → 목록으로 이동
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { roomId?: number | null } | null;
      const roomIdFromState = state?.roomId ?? null;

      if (roomIdFromState) {
        setActiveTab('chats');
        setActiveRoomId(roomIdFromState);
      } else {
        setActiveRoomId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 방 진입/이탈 시 history 스택에 상태 기록
  useEffect(() => {
    // 첫 마운트에서 replaceState로 이미 설정했으므로, 이후 변경만 push
    const currentState = window.history.state as { roomId?: number | null } | null;
    const currentRoomIdInState = currentState?.roomId ?? null;

    if (activeRoomId === currentRoomIdInState) {
      return;
    }

    const url = new URL(window.location.href);
    if (activeRoomId) {
      url.searchParams.set('room', String(activeRoomId));
      window.history.pushState({ roomId: activeRoomId }, '', url.toString());
    } else {
      url.searchParams.delete('room');
      window.history.pushState({ roomId: null }, '', url.toString());
    }
  }, [activeRoomId]);

  // 알림 클릭 이벤트 리스너
  useEffect(() => {
    const handleNavigateToRoom = (event: CustomEvent<{ roomId: number }>) => {
      setActiveRoomId(event.detail.roomId);
      setActiveTab('chats');
    };

    window.addEventListener('navigateToRoom', handleNavigateToRoom as EventListener);

    return () => {
      window.removeEventListener('navigateToRoom', handleNavigateToRoom as EventListener);
    };
  }, []);

  // URL 파라미터에서 room ID 확인 (알림 클릭 시)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdParam = urlParams.get('room');
    if (roomIdParam) {
      const roomId = parseInt(roomIdParam, 10);
      if (!isNaN(roomId)) {
        setActiveRoomId(roomId);
        setActiveTab('chats');
        // URL에서 파라미터 제거
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // 알림 클릭 이벤트 리스너
  useEffect(() => {
    const handleNavigateToRoom = (event: CustomEvent<{ roomId: number }>) => {
      setActiveRoomId(event.detail.roomId);
      setActiveTab('chats');
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const roomId = event.data.roomId;
        if (roomId) {
          setActiveRoomId(roomId);
          setActiveTab('chats');
        }
      }
    };

    window.addEventListener('navigateToRoom', handleNavigateToRoom as EventListener);
    
    // Service Worker 메시지 리스너
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('navigateToRoom', handleNavigateToRoom as EventListener);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingStudyNote, setIsGeneratingStudyNote] = useState(false);
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [activeStudyTab, setActiveStudyTab] = useState<'script' | 'expressions' | 'vocab'>('script');
  const [studyData, setStudyData] = useState<{
    topic: string;
    script: { speaker: string; en: string; ko: string }[];
    expressions: { en: string; ko: string; tip: string }[];
    vocab: { word: string; meaning: string }[];
  } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const { messages, loading: messagesLoading, sendMessage, refreshMessages } = useMessages(activeRoomId);
  const { signOut } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-4">Supabase 설정 필요</h1>
          <p className="text-gray-600 mb-4">
            프로젝트 루트에 <code className="bg-gray-100 px-2 py-1 rounded">.env</code> 파일을 생성하고 다음 환경 변수를 설정하세요:
          </p>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-left text-sm font-mono">
            <div>VITE_SUPABASE_URL=your_url</div>
            <div>VITE_SUPABASE_ANON_KEY=your_key</div>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            설정 후 개발 서버를 재시작하세요.
          </p>
        </div>
      </div>
    );
  }

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const unreadCount = rooms.reduce((sum, r) => sum + (r.unread || 0), 0);
  const friendRequestCount = friendRequests.length;
  const canGenerateStudyNote = !!activeRoomId && messages.length > 0;

  const handleGenerateStudyNote = async () => {
    if (!activeRoomId) return;

    if (!messages || messages.length === 0) {
      alert('학습 노트를 생성할 대화가 없습니다. 먼저 친구와 대화를 나눠보세요!');
      return;
    }

    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      alert('OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 추가하세요.');
      return;
    }

    setIsGeneratingStudyNote(true);
    try {
      // 최근 50개 메시지만 사용 (토큰 절약)
      const recentMessages = messages.slice(-50);

      const chatLog = recentMessages
        .map((m) => {
          const speaker =
            m.sender === 'me'
              ? 'Me'
              : m.senderName || 'Friend';
          const ko = m.text || '';
          const en = m.textEn || '';
          return `- [${speaker}] KO: ${ko}${en ? `\n  EN: ${en}` : ''}`;
        })
        .join('\n');

      const prompt = `You are an AI English tutor.
You will receive a bilingual chat log between a Korean learner ("Me") and a friend.
Your job is to:
1) Reconstruct a clean, natural English conversation script based on the chat (not word-for-word, but natural).
2) Provide key expressions with Korean explanations and usage tips.
3) Provide a short vocabulary list.

Return ONLY a valid JSON object in the following TypeScript shape (no markdown, no extra text):
{
  "topic": string,
  "script": { "speaker": "Me" | "Friend", "en": string, "ko": string }[],
  "expressions": { "en": string, "ko": string, "tip": string }[],
  "vocab": { "word": string, "meaning": string }[]
}

Rules:
- "script.en" is the reconstructed natural English line.
- "script.ko" is a smooth natural Korean translation of that English line.
- "expressions" should be 3~6 important patterns or sentences from the script.
- "vocab" should be 5~10 important single words (no phrases).
- Do NOT include any explanations outside the JSON.

Here is the chat log:
${chatLog}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI English tutor that outputs strict JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Study Note API error:', errorText);
        alert('AI 학습 노트 생성 중 오류가 발생했습니다.');
        return;
      }

      const data = await response.json();
      const content: string | undefined = data.choices?.[0]?.message?.content;

      if (!content) {
        alert('AI 학습 노트 결과를 받지 못했습니다.');
        return;
      }

      try {
        const parsed = JSON.parse(content);
        if (!parsed || !parsed.script) {
          throw new Error('Invalid study note format');
        }
        setStudyData(parsed);
        setActiveStudyTab('script');
        setShowStudyModal(true);
      } catch (e) {
        console.error('Failed to parse study note JSON:', e, content);
        alert('AI 학습 노트 형식을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Study note generation error:', error);
      alert('AI 학습 노트 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingStudyNote(false);
    }
  };

  const handleTranslateRoom = async () => {
    if (!activeRoomId) return;

    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      alert('OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 추가하세요.');
      return;
    }

    setIsTranslating(true);
    try {
      // 1) 이 방의 전체 메시지(한/영)를 시간순으로 조회
      const { data: allMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id, content_ko, content_en, created_at')
        .eq('room_id', activeRoomId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if (!allMessages || allMessages.length === 0) {
        alert('번역할 메시지가 없습니다.');
        setIsTranslating(false);
        return;
      }

      // 번역이 아직 안 된 한국어 메시지들만 타깃으로 선택
      const targetMessages = allMessages.filter(
        (m) => !m.content_en && m.content_ko && m.content_ko.trim().length > 0
      );

      if (targetMessages.length === 0) {
        alert('새로 번역할 한국어 메시지가 없습니다.');
        setIsTranslating(false);
        return;
      }

      // 맥락을 위해, 첫 번째 타깃 메시지 이전의 최근 N개 메시지를 컨텍스트로 포함
      const firstTargetIndex = allMessages.findIndex((m) => m.id === targetMessages[0].id);
      const CONTEXT_BEFORE_COUNT = 20; // 앞에서 최대 20개 정도만 컨텍스트로 사용
      const contextStart = Math.max(0, firstTargetIndex - CONTEXT_BEFORE_COUNT);
      const contextMessages = allMessages.slice(contextStart, firstTargetIndex);

      // 2) 프롬프트용 큰 텍스트 구성
      // CONTEXT: 이미 번역된 영어/한국어 포함 (번역 대상 아님)
      const contextLines = contextMessages.map((m) => {
        const text = m.content_en || m.content_ko || '';
        return `${m.id}: ${text}`;
      });

      // TARGET: 실제로 번역해야 할 한국어만 별도로 표시
      const targetLines = targetMessages.map((m) => `TARGET ${m.id}: ${m.content_ko}`);

      const bigText =
        (contextLines.length > 0
          ? `CONTEXT (do not translate these lines, they are only for understanding):\n` +
            contextLines.join('\n') +
            '\n\n'
          : '') +
        `TARGET (translate ONLY these lines, keep the same IDs):\n` +
        targetLines.join('\n');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional translator.\n' +
                '- You will receive a chat log.\n' +
                '- First section is CONTEXT: NEVER translate or change those lines. They are only for understanding.\n' +
                '- Second section is TARGET: ONLY translate these lines.\n' +
                '- Each TARGET line starts with `TARGET <id>:`. Translate ONLY the Korean text, keep the same `<id>`.\n' +
                '- Return one line per TARGET input, in the format: `TARGET <id>: <English translation>`.\n' +
                '- Do NOT output the CONTEXT lines.\n' +
                '- Do NOT add extra commentary or explanations.',
            },
            {
              role: 'user',
              content: bigText,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        alert('번역 API 호출 중 오류가 발생했습니다.');
        return;
      }

      const data = await response.json();
      const translatedAll: string | undefined = data.choices[0]?.message?.content;

      if (!translatedAll) {
        alert('번역 결과를 받지 못했습니다.');
        return;
      }

      // 2) 번역 결과를 줄 단위로 나누고, ID별로 매핑
      const resultLines = translatedAll
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      const updatePayload: { id: string; content_en: string }[] = [];

      for (const line of resultLines) {
        // TARGET <id>: translated text
        if (!line.startsWith('TARGET ')) continue;
        const withoutPrefix = line.replace(/^TARGET\s+/, '');
        const sepIndex = withoutPrefix.indexOf(':');
        if (sepIndex === -1) continue;

        const id = withoutPrefix.slice(0, sepIndex).trim();
        const textEn = withoutPrefix.slice(sepIndex + 1).trim();

        if (!id || !textEn) continue;

        updatePayload.push({ id, content_en: textEn });
      }

      if (updatePayload.length === 0) {
        alert('번역 결과를 파싱하지 못했습니다.');
        return;
      }

      // 3) Supabase에 각 메시지별로 번역 결과 반영 (배치 업데이트)
      let translatedCount = 0;
      for (const item of updatePayload) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ content_en: item.content_en })
          .eq('id', item.id);

        if (!updateError) {
          translatedCount++;
        } else {
          console.error('Error updating message:', updateError, 'id:', item.id);
        }
      }

      if (translatedCount > 0) {
        console.log(`번역 완료: ${translatedCount}개 메시지`);
        refreshMessages();
      } else {
        alert('번역 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Translation error:', error);
      alert('번역 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
    }
  };

  const handleCreateRoom = async () => {
    const roomName = prompt('새 대화방 이름을 입력하세요:');
    if (!roomName || !roomName.trim()) {
      return;
    }

    try {
      const { data, error } = await createRoom(roomName.trim());
      if (error) {
        console.error('Error creating room:', error);
        alert('대화방 생성 중 오류가 발생했습니다.');
      } else if (data) {
        setActiveRoomId(data.id);
        setActiveTab('chats');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('대화방 생성 중 오류가 발생했습니다.');
    }
  };

  const handleAddFriend = async (email: string) => {
    const { error } = await sendRequest(email);
    if (error) {
      throw error;
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await acceptRequest(requestId);
    if (error) {
      throw error;
    }
    // 친구 요청 수락 후 친구 목록 새로고침
    await refreshFriends();
  };

  const handleDeclineRequest = async (requestId: string) => {
    const { error } = await declineRequest(requestId);
    if (error) {
      throw error;
    }
  };

  const handleCreateTopicRoom = async (friendId: string, topic: string) => {
    try {
      const { data, error } = await createRoom(topic, friendId, 'topic');
      if (error) {
        console.error('Error creating topic room:', error);
        alert('대화방 생성 중 오류가 발생했습니다.');
      } else if (data) {
        setActiveRoomId(data.id);
        setActiveTab('chats');
      }
    } catch (error) {
      console.error('Error creating topic room:', error);
      alert('대화방 생성 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
      }
    }
  };

  const handleStartEditName = () => {
    const currentName = profile?.name || user?.email?.split('@')[0] || '';
    setEditedName(currentName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    const { error } = await updateProfile({ name: editedName.trim() });
    if (error) {
      console.error('Error updating name:', error);
      alert('이름 변경 중 오류가 발생했습니다.');
    } else {
      setIsEditingName(false);
    }
  };

  const handleLeaveRoom = async (roomId: number) => {
    if (confirm('이 대화방을 나가시겠습니까?\n나가도 상대방이 메시지를 보내면 다시 대화방이 나타납니다.')) {
      const { error } = await leaveRoom(roomId);
      if (error) {
        console.error('Error leaving room:', error);
        alert('방 나가기 중 오류가 발생했습니다.');
      } else {
        // 현재 방에서 나갔다면 방 선택 해제
        if (activeRoomId === roomId) {
          setActiveRoomId(null);
        }
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="bg-gray-100 h-screen overflow-hidden">
      <UpdateNotification />
      <div className="flex h-full max-w-7xl mx-auto bg-white shadow-none md:shadow-2xl md:my-4 md:rounded-[30px] md:h-[calc(100vh-2rem)] overflow-hidden relative">
        {/* Navigation Rail (PC) */}
        <NavigationRail
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSettingsClick={() => setShowSettingsModal(true)}
          unreadCount={unreadCount}
          friendRequestCount={friendRequestCount}
        />

        {/* Sidebar */}
        <aside
          className={`w-full md:w-[380px] bg-white flex flex-col border-r border-gray-100 absolute md:relative z-10 h-full transition-transform duration-300 ${
            activeRoomId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
          }`}
        >
          {activeTab === 'chats' ? (
            <RoomList
              rooms={rooms}
              activeRoomId={activeRoomId}
              onSelectRoom={setActiveRoomId}
              onCreateRoom={handleCreateRoom}
              onLeaveRoom={handleLeaveRoom}
            />
          ) : (
            <PeopleTab
              friends={friends}
              rooms={rooms}
              friendRequests={friendRequests}
              onAddFriend={handleAddFriend}
              onSelectRoom={(roomId) => {
                setActiveRoomId(roomId);
                setActiveTab('chats');
              }}
              onCreateTopicRoom={handleCreateTopicRoom}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
              loading={friendsLoading || requestsLoading}
            />
          )}
        </aside>

        {/* Chat View */}
        <ChatView
          roomId={activeRoomId}
          roomName={activeRoom?.name || ''}
          roomType={activeRoom?.type}
          messages={messages}
          onBack={() => setActiveRoomId(null)}
          onSendMessage={handleSendMessage}
          onTranslate={handleTranslateRoom}
          isTranslating={isTranslating}
          disabled={messagesLoading || roomsLoading}
          onLeaveRoom={activeRoomId ? () => handleLeaveRoom(activeRoomId) : undefined}
          onGenerateStudyNote={handleGenerateStudyNote}
          isGeneratingStudyNote={isGeneratingStudyNote}
          canGenerateStudyNote={canGenerateStudyNote}
        />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSettingsClick={() => setShowSettingsModal(true)}
          unreadCount={unreadCount}
          friendRequestCount={friendRequestCount}
          show={!activeRoomId}
        />

        {/* Settings Modal */}
        <Modal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setIsEditingName(false);
          }}
          title="설정"
        >
          <div className="space-y-4">
            <div className="pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <span className="text-lg font-bold">
                    {((profile?.name || user?.email?.split('@')[0]) || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  {isEditingName ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="이름 입력"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName();
                          } else if (e.key === 'Escape') {
                            handleCancelEditName();
                          }
                        }}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveName}
                          className="flex-1 flex items-center justify-center space-x-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>저장</span>
                        </button>
                        <button
                          onClick={handleCancelEditName}
                          className="flex-1 flex items-center justify-center space-x-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>취소</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-base text-gray-900">
                          {profile?.name || user?.email?.split('@')[0] || 'User'}
                        </h4>
                        <button
                          onClick={handleStartEditName}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="이름 수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{user?.email || '이메일 없음'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 알림 설정 */}
            {isNotificationSupported && (
              <div className="pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 mb-1">푸시 알림</h4>
                    <p className="text-xs text-gray-500">
                      {notificationPermission === 'granted' 
                        ? '알림이 활성화되어 있습니다' 
                        : notificationPermission === 'denied'
                        ? '알림이 차단되어 있습니다'
                        : '새 메시지를 받을 때 알림을 받습니다'}
                    </p>
                  </div>
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={async () => {
                        const granted = await requestNotificationPermission();
                        if (granted) {
                          alert('알림이 활성화되었습니다!');
                        } else {
                          alert('알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.');
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {notificationPermission === 'denied' ? '설정 열기' : '알림 활성화'}
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors border border-red-200"
            >
              <LogOut className="w-5 h-5" />
              <span>로그아웃</span>
            </button>
          </div>
        </Modal>

        {/* AI 학습 노트 모달 */}
        <Modal
          isOpen={showStudyModal && !!studyData}
          onClose={() => setShowStudyModal(false)}
          title="AI 학습 노트"
        >
          {studyData && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {studyData.topic || (activeRoom?.name ? `${activeRoom.name}와의 대화` : 'Reconstructed Conversation')}
                </h3>
                <p className="text-xs text-gray-500">
                  실제 대화를 바탕으로 AI가 재구성한 영어 회화 스크립트와 학습 포인트입니다.
                </p>
              </div>

              {/* 탭 */}
              <div className="flex border-b border-gray-100 text-xs font-bold">
                <button
                  className={`flex-1 py-2 border-b-2 ${
                    activeStudyTab === 'script'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400'
                  }`}
                  onClick={() => setActiveStudyTab('script')}
                >
                  스크립트
                </button>
                <button
                  className={`flex-1 py-2 border-b-2 ${
                    activeStudyTab === 'expressions'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400'
                  }`}
                  onClick={() => setActiveStudyTab('expressions')}
                >
                  핵심 표현
                </button>
                <button
                  className={`flex-1 py-2 border-b-2 ${
                    activeStudyTab === 'vocab'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400'
                  }`}
                  onClick={() => setActiveStudyTab('vocab')}
                >
                  단어
                </button>
              </div>

              {/* 내용 */}
              <div className="max-h-[420px] overflow-y-auto space-y-4">
                {activeStudyTab === 'script' && (
                  <div className="space-y-3">
                    {studyData.script?.map((line, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            line.speaker === 'Me'
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {line.speaker}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="text-sm font-medium text-gray-900 leading-relaxed">
                            {line.en}
                          </div>
                          <div className="text-xs text-gray-500">{line.ko}</div>
                        </div>
                      </div>
                    ))}
                    {(!studyData.script || studyData.script.length === 0) && (
                      <p className="text-xs text-gray-400">스크립트가 비어 있습니다.</p>
                    )}
                  </div>
                )}

                {activeStudyTab === 'expressions' && (
                  <div className="space-y-3">
                    {studyData.expressions?.map((expr, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm"
                      >
                        <div className="text-xs font-bold text-gray-900 mb-1">
                          {expr.en}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{expr.ko}</div>
                        <div className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 leading-relaxed">
                          <span className="font-bold text-indigo-600 mr-1">Tip</span>
                          {expr.tip}
                        </div>
                      </div>
                    ))}
                    {(!studyData.expressions || studyData.expressions.length === 0) && (
                      <p className="text-xs text-gray-400">핵심 표현이 없습니다.</p>
                    )}
                  </div>
                )}

                {activeStudyTab === 'vocab' && (
                  <div className="space-y-2">
                    {studyData.vocab?.map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="font-mono font-bold text-gray-800">{v.word}</span>
                        <span className="text-gray-500">{v.meaning}</span>
                      </div>
                    ))}
                    {(!studyData.vocab || studyData.vocab.length === 0) && (
                      <p className="text-xs text-gray-400">단어 목록이 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default App;
