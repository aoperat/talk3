import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import { MessageWithSender } from '../lib/types';

interface ChatViewProps {
  roomId: number | null;
  roomName: string;
  roomType?: string | null;
  messages: MessageWithSender[];
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onTranslate: () => void;
  isTranslating: boolean;
  disabled?: boolean;
  onLeaveRoom?: () => void;
   onGenerateStudyNote: () => void;
   isGeneratingStudyNote: boolean;
   canGenerateStudyNote: boolean;
}

export default function ChatView({
  roomId,
  roomName,
  roomType,
  messages,
  onBack,
  onSendMessage,
  onTranslate,
  isTranslating,
  disabled,
  onLeaveRoom,
  onGenerateStudyNote,
  isGeneratingStudyNote,
  canGenerateStudyNote,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, roomId]);

  if (!roomId) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
        <div className="w-24 h-24 bg-indigo-50 rounded-[30px] flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-indigo-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">English Buddy Messenger</h3>
        <p className="text-gray-500 max-w-sm">
          Select a chat room from the sidebar to start talking with your friend.
        </p>
      </div>
    );
  }

  return (
    <main
      className={`flex-1 flex flex-col absolute md:relative w-full h-full z-20 transition-transform duration-300 bg-[#F8F9FD] ${
        roomId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      }`}
    >
      <ChatHeader
        roomName={roomName}
        onBack={onBack}
        onTranslate={onTranslate}
        isTranslating={isTranslating}
        onLeaveRoom={onLeaveRoom}
        onGenerateStudyNote={onGenerateStudyNote}
        isGeneratingStudyNote={isGeneratingStudyNote}
        canGenerateStudyNote={canGenerateStudyNote}
      />

      {/* 메시지 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#F8F9FD] scrollbar-hide min-h-0">
        {disabled && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">메시지를 불러오는 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">대화를 시작하세요!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} roomType={roomType} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <MessageInput onSend={onSendMessage} disabled={disabled} />
    </main>
  );
}

