import { useState } from 'react';
import { Search, UserPlus, ChevronDown, Hash, User, Plus } from 'lucide-react';
import { Friend, RoomWithMetadata, FriendRequest } from '../lib/types';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import Modal from './Modal';

interface PeopleTabProps {
  friends: Friend[];
  rooms: RoomWithMetadata[];
  friendRequests: FriendRequest[];
  onAddFriend: (email: string) => Promise<void>;
  onSelectRoom: (roomId: number) => void;
  onCreateTopicRoom: (friendId: string, topic: string) => Promise<void>;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onDeclineRequest: (requestId: string) => Promise<void>;
  loading?: boolean;
}

export default function PeopleTab({
  friends,
  rooms,
  friendRequests,
  onAddFriend,
  onSelectRoom,
  onCreateTopicRoom,
  onAcceptRequest,
  onDeclineRequest,
  loading,
}: PeopleTabProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const toggleFriendExpansion = (friendId: string) => {
    setExpandedFriendId(expandedFriendId === friendId ? null : friendId);
  };

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) return;

    setIsAdding(true);
    try {
      await onAddFriend(friendEmail.trim());
      setFriendEmail('');
      setShowAddFriendModal(false);
    } catch (error) {
      console.error('Error adding friend:', error);
      alert(error instanceof Error ? error.message : '친구 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await onAcceptRequest(requestId);
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('친구 요청 수락 중 오류가 발생했습니다.');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await onDeclineRequest(requestId);
    } catch (error) {
      console.error('Error declining request:', error);
      alert('친구 요청 거절 중 오류가 발생했습니다.');
    }
  };

  const handleCreateTopicRoom = async (friendId: string) => {
    const topic = prompt('새로운 대화 주제를 입력하세요:\n(예: 여행 계획, 프로젝트, 점심 메뉴)');
    if (!topic || !topic.trim()) return;

    try {
      await onCreateTopicRoom(friendId, topic.trim());
    } catch (error) {
      console.error('Error creating topic room:', error);
      alert('대화방 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="px-5 py-4 flex items-center justify-between bg-white sticky top-0 z-20 border-b border-gray-100" style={{ paddingTop: 'max(1rem, calc(1rem + env(safe-area-inset-top)))' }}>
        <h1 className="font-bold text-2xl text-gray-900">Friends</h1>
        <div className="flex space-x-2">
          <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowAddFriendModal(true)}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition shadow-lg shadow-gray-200"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 친구 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide pb-20 md:pb-4">
        <div className="space-y-6">
          {/* 내 프로필 */}
          {user && (
            <div className="flex items-center space-x-4 p-3 rounded-2xl bg-gray-50/50">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm border border-white">
                {((profile?.name || user.email?.split('@')[0]) || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {profile?.name || user.email?.split('@')[0] || '나'}{' '}
                  <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-1">
                    Me
                  </span>
                </h3>
                <p className="text-xs text-gray-500">{user.email || '상태메시지 없음'}</p>
              </div>
            </div>
          )}

          {/* 친구 요청 목록 */}
          {friendRequests.length > 0 && (
            <div className="animate-slideDown">
              <div className="text-xs font-bold text-indigo-500 mb-3 px-2 uppercase tracking-wider flex items-center justify-between">
                <span>받은 친구 요청 ({friendRequests.length})</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              </div>
              <div className="space-y-2 mb-6">
                {friendRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white border border-indigo-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center text-sm font-bold text-indigo-600">
                          {(request.from_user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">
                            {request.from_user?.name || request.from_user?.email || 'Unknown'}
                          </h4>
                          <p className="text-[11px] text-gray-400">함께 대화하고 싶어해요</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                      >
                        수락
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request.id)}
                        className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-[1px] bg-gray-100 mb-6 mx-2"></div>
            </div>
          )}

          {/* 친구 리스트 */}
          <div>
            <div className="text-xs font-bold text-gray-400 mb-3 px-2 uppercase tracking-wider">
              Friends ({friends.length})
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-400">로딩 중...</div>
              </div>
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <User className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">친구가 없습니다</p>
                <p className="text-gray-400 text-xs mt-1">위의 + 버튼을 눌러 친구를 추가하세요</p>
              </div>
            ) : (
              <div className="space-y-3">
            {friends.map((friend) => {
              const isExpanded = expandedFriendId === friend.friend_id;
              // 이 친구와 함께하는 대화방 찾기
              const sharedRooms = rooms.filter((r) => {
                return r.participantIds?.includes(friend.friend_id) || false;
              });

              return (
                <div
                  key={friend.id}
                  className={`group rounded-2xl transition-all duration-300 border ${
                    isExpanded
                      ? 'bg-indigo-50/30 border-indigo-100 shadow-sm'
                      : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
                >
                  {/* 친구 카드 헤더 */}
                  <div
                    onClick={() => toggleFriendExpansion(friend.friend_id)}
                    className="flex items-center justify-between p-3 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center text-lg font-bold text-indigo-600">
                          {(friend.friend.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-[15px]">
                          {friend.friend.name || friend.friend.email || 'Unknown'}
                        </h3>
                        <p className="text-xs text-gray-500">{friend.friend.email}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180 text-indigo-600' : 'text-gray-400'
                      }`}
                    />
                  </div>

                  {/* 펼쳐진 내용: 이 친구와의 대화방 목록 */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 overflow-hidden animate-slideDown">
                      <div className="bg-white/60 rounded-xl p-2 space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 px-2 py-1 mb-1">
                          참여 중인 대화방
                        </div>

                        {/* 기존 방 목록 */}
                        {sharedRooms.length > 0 ? (
                          sharedRooms.map((room) => (
                            <div
                              key={room.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectRoom(room.id);
                              }}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all"
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs ${
                                  room.type === 'private' ? 'bg-gray-400' : 'bg-indigo-500'
                                }`}
                              >
                                {room.type === 'private' ? (
                                  <User className="w-4 h-4" />
                                ) : (
                                  <Hash className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {room.name}
                                </div>
                                {room.lastMsg && (
                                  <div className="text-[10px] text-gray-500 truncate">
                                    {room.lastMsg}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-400 p-2 text-center">
                            진행 중인 대화가 없습니다.
                          </div>
                        )}

                        {/* 새 주제 만들기 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateTopicRoom(friend.friend_id);
                          }}
                          className="w-full mt-2 flex items-center justify-center space-x-1.5 p-2 rounded-lg border border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-medium transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>새 주제로 대화하기</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 친구 추가 모달 */}
      <Modal
        isOpen={showAddFriendModal}
        onClose={() => {
          setShowAddFriendModal(false);
          setFriendEmail('');
        }}
        title="친구 추가"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            친구의 이메일이나 ID를 입력하여<br />
            친구 요청을 보내세요.
          </p>
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
            <User className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder="친구 이메일 입력"
              className="bg-transparent flex-1 outline-none text-gray-900 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFriend();
                }
              }}
            />
          </div>
          <button
            onClick={handleAddFriend}
            disabled={!friendEmail.trim() || isAdding}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? '요청 중...' : '요청 보내기'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

