import { Search, Plus, X } from 'lucide-react';
import { RoomWithMetadata } from '../lib/types';
import { useState } from 'react';

interface RoomListProps {
  rooms: RoomWithMetadata[];
  activeRoomId: number | null;
  onSelectRoom: (roomId: number) => void;
  onCreateRoom: () => void;
  onLeaveRoom?: (roomId: number) => void;
}

export default function RoomList({ rooms, activeRoomId, onSelectRoom, onCreateRoom, onLeaveRoom }: RoomListProps) {
  const [hoveredRoomId, setHoveredRoomId] = useState<number | null>(null);

  const handleLeaveRoom = (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation();
    if (onLeaveRoom && confirm('이 대화방을 나가시겠습니까?')) {
      onLeaveRoom(roomId);
    }
  };

  return (
    <aside
      className={`w-full md:w-[380px] bg-white flex flex-col border-r border-gray-100 absolute md:relative z-10 h-full transition-transform duration-300 ${
        activeRoomId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      }`}
    >
      {/* 목록 헤더 */}
      <div className="px-5 py-4 flex items-center justify-between bg-white sticky top-0 z-20 pt-safe" style={{ paddingTop: 'max(1rem, calc(1rem + env(safe-area-inset-top)))' }}>
        <h1 className="font-bold text-2xl text-gray-900">Chats</h1>
        <div className="flex space-x-2">
          <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onCreateRoom}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition shadow-lg shadow-gray-200"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 목록 리스트 */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-hide pb-20 md:pb-0">
        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            onMouseEnter={() => setHoveredRoomId(room.id)}
            onMouseLeave={() => setHoveredRoomId(null)}
            className={`p-4 mb-1 rounded-2xl cursor-pointer transition-all active:scale-[0.98] relative ${
              activeRoomId === room.id
                ? 'bg-indigo-50 md:bg-gray-100'
                : 'hover:bg-gray-50 bg-white'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center text-2xl shadow-sm border border-white">
                  {room.name.substring(0, 1)}
                </div>
                {(room.unread ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    {room.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-gray-900 truncate text-[15px]">{room.name}</h3>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {room.time && (
                      <span className="text-[11px] text-gray-400">{room.time}</span>
                    )}
                    {onLeaveRoom && hoveredRoomId === room.id && (
                      <button
                        onClick={(e) => handleLeaveRoom(e, room.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="방 나가기"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {room.lastMsg && (
                  <p className="text-[13px] text-gray-500 truncate leading-snug">{room.lastMsg}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

