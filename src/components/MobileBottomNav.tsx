import { MessageCircle, Users, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'chats' | 'people';
  onTabChange: (tab: 'chats' | 'people') => void;
  onSettingsClick: () => void;
  unreadCount?: number;
  friendRequestCount?: number;
  show: boolean;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onSettingsClick,
  unreadCount = 0,
  friendRequestCount = 0,
  show,
}: MobileBottomNavProps) {
  if (!show) return null;

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 flex justify-around items-center shadow-[0_-5px_15px_rgba(0,0,0,0.05)]"
      style={{ 
        height: 'calc(4rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <button
        onClick={() => onTabChange('people')}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative py-2 ${
          activeTab === 'people' ? 'text-indigo-600' : 'text-gray-400'
        }`}
      >
        <div className="relative">
          <Users className="w-6 h-6" />
          {friendRequestCount > 0 && (
            <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </div>
        <span className="text-[10px] font-medium">친구</span>
      </button>
      <button
        onClick={() => onTabChange('chats')}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative py-2 ${
          activeTab === 'chats' ? 'text-indigo-600' : 'text-gray-400'
        }`}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </div>
        <span className="text-[10px] font-medium">채팅</span>
      </button>
      <button
        onClick={onSettingsClick}
        className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400 py-2"
      >
        <Settings className="w-6 h-6" />
        <span className="text-[10px] font-medium">설정</span>
      </button>
    </nav>
  );
}

