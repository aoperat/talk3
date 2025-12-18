import { ChevronLeft, ChevronRight, Languages, Loader2, LogOut, Sparkles } from 'lucide-react';

interface ChatHeaderProps {
  roomName: string;
  onBack: () => void;
  onTranslate: () => void;
  isTranslating: boolean;
  onLeaveRoom?: () => void;
  onGenerateStudyNote: () => void;
  isGeneratingStudyNote: boolean;
  canGenerateStudyNote: boolean;
}

export default function ChatHeader({
  roomName,
  onBack,
  onTranslate,
  isTranslating,
  onLeaveRoom,
  onGenerateStudyNote,
  isGeneratingStudyNote,
  canGenerateStudyNote,
}: ChatHeaderProps) {
  return (
    <header
      className="px-4 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between sticky top-0 z-30"
      style={{ paddingTop: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))' }}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0"
          aria-label="뒤로가기"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 truncate">
            {roomName}
            <ChevronRight className="w-4 h-4 text-gray-300 md:hidden flex-shrink-0" />
          </h2>
          <span className="text-[11px] text-green-500 font-medium">● Online</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
            title="방 나가기"
            aria-label="방 나가기"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onGenerateStudyNote}
          disabled={
            isGeneratingStudyNote ||
            isTranslating ||
            !canGenerateStudyNote
          }
          className={`hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex-shrink-0 ${
            isGeneratingStudyNote
              ? 'bg-gray-100 text-gray-400'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={canGenerateStudyNote ? 'AI 학습 노트 생성' : '학습할 대화가 필요합니다'}
        >
          {isGeneratingStudyNote ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{isGeneratingStudyNote ? '생성 중...' : 'AI 학습 노트'}</span>
        </button>
        <button
          onClick={onTranslate}
          disabled={isTranslating}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex-shrink-0 ${
            isTranslating
              ? 'bg-gray-100 text-gray-400'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {isTranslating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Languages className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{isTranslating ? 'Translating...' : 'Translate'}</span>
        </button>
      </div>
    </header>
  );
}

