import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRooms } from './hooks/useRooms';
import { useMessages } from './hooks/useMessages';
import { useFriends } from './hooks/useFriends';
import { useFriendRequests } from './hooks/useFriendRequests';
import { useProfile } from './hooks/useProfile';
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

function App() {
  console.log('🚀 App 컴포넌트 렌더링 시작');
  
  const { user, loading: authLoading } = useAuth();
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
  const [isTranslating, setIsTranslating] = useState(false);
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

  const handleTranslateRoom = async () => {
    if (!activeRoomId) return;

    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      alert('OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 추가하세요.');
      return;
    }

    setIsTranslating(true);
    try {
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('id, content_ko')
        .eq('room_id', activeRoomId)
        .is('content_en', null)
        .not('content_ko', 'is', null)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if (!messages || messages.length === 0) {
        alert('번역할 메시지가 없습니다.');
        setIsTranslating(false);
        return;
      }

      let translatedCount = 0;
      for (const msg of messages) {
        if (!msg.content_ko) continue;

        try {
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
                    'You are a professional translator. Translate the following Korean text to English. Only return the translation, no explanations.',
                },
                {
                  role: 'user',
                  content: msg.content_ko,
                },
              ],
              temperature: 0.3,
              max_tokens: 500,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenAI API error:', errorData);
            continue;
          }

          const data = await response.json();
          const translatedText = data.choices[0]?.message?.content?.trim();

          if (translatedText) {
            const { error: updateError } = await supabase
              .from('messages')
              .update({ content_en: translatedText })
              .eq('id', msg.id);

            if (!updateError) {
              translatedCount++;
            } else {
              console.error('Error updating message:', updateError);
            }
          }
        } catch (error) {
          console.error('Error translating message:', error);
          continue;
        }
      }

      if (translatedCount > 0) {
        console.log(`번역 완료: ${translatedCount}개 메시지`);
        // 번역 완료 후 즉시 메시지 새로고침
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
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors border border-red-200"
            >
              <LogOut className="w-5 h-5" />
              <span>로그아웃</span>
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default App;
