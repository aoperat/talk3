import { MessageCircle, Users, Settings } from 'lucide-react';

interface NavigationRailProps {
  activeTab: 'chats' | 'people';
  onTabChange: (tab: 'chats' | 'people') => void;
  onSettingsClick: () => void;
  unreadCount?: number;
  friendRequestCount?: number;
}

export default function NavigationRail({
  activeTab,
  onTabChange,
  onSettingsClick,
  unreadCount = 0,
  friendRequestCount = 0,
}: NavigationRailProps) {
  return (
    <nav 
      className="hidden md:flex flex-col w-[72px] bg-[#1E1E24] h-full items-center py-6 space-y-8 z-40 flex-shrink-0" 
      style={{ paddingTop: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-top)))' }}
    >
      <button
        onClick={() => onTabChange('people')}
        className={`p-3 rounded-2xl transition-all relative ${
          activeTab === 'people'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <Users className="w-6 h-6" />
        {friendRequestCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1E1E24]"></span>
        )}
      </button>
      <button
        onClick={() => onTabChange('chats')}
        className={`p-3 rounded-2xl transition-all relative ${
          activeTab === 'chats'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1E1E24]"></span>
        )}
      </button>
      <div className="flex-1"></div>
      <button
        onClick={onSettingsClick}
        className="p-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
      >
        <Settings className="w-6 h-6" />
      </button>
    </nav>
  );
}

