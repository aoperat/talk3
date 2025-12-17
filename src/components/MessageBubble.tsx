import { MessageWithSender } from '../lib/types';

interface MessageBubbleProps {
  message: MessageWithSender;
  roomType?: string | null;
}

export default function MessageBubble({ message, roomType }: MessageBubbleProps) {
  const isTopicRoom = roomType === 'topic';
  const showSenderName = isTopicRoom && message.sender !== 'me' && message.senderName;
  
  return (
    <div className={`flex flex-col ${message.sender === 'me' ? 'items-end' : 'items-start'} space-y-1`}>
      {/* 발신자 이름 표시 (주제별 대화방에서만, 내 메시지 제외) */}
      {showSenderName && (
        <span className="text-[11px] text-gray-500 ml-3 mb-1 block">
          {message.senderName}
        </span>
      )}
      <div className={`flex items-end max-w-[85%] ${message.sender === 'me' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* 말풍선 */}
        <div
          className={`group relative px-4 py-3 shadow-sm transition-all ${
            message.sender === 'me'
              ? 'bg-indigo-600 text-white rounded-[20px] rounded-tr-[4px]'
              : 'bg-white text-gray-800 rounded-[20px] rounded-tl-[4px] border border-gray-100'
          }`}
        >
          <p className="text-[15px] leading-relaxed font-normal">{message.text}</p>

          {message.textEn && (
            <div
              className={`mt-2 pt-2 border-t text-[13px] font-serif italic leading-relaxed ${
                message.sender === 'me'
                  ? 'border-indigo-500/30 text-indigo-100'
                  : 'border-gray-100 text-gray-500'
              }`}
            >
              {message.textEn}
            </div>
          )}
        </div>

        {/* 시간 */}
        <span className="text-[10px] text-gray-400 mb-1 mx-1.5 flex-shrink-0 font-medium">
          {message.time}
        </span>
      </div>
    </div>
  );
}

