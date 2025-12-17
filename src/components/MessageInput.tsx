import { useState, useRef, useEffect } from 'react';
import { Send, Plus } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!inputText.trim() || disabled) return;
    onSend(inputText);
    setInputText('');
    // 메시지 전송 후 입력창에 포커스 유지
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 컴포넌트 마운트 시 입력창에 포커스
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <div className="p-3 bg-white border-t border-gray-100">
      <div className="flex items-center bg-gray-100 p-1.5 rounded-[24px]">
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 transition rounded-full hover:bg-gray-200"
        >
          <Plus className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-[15px] px-2 min-w-0 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim() || disabled}
          className={`p-2 rounded-full transition-all duration-200 ${
            inputText.trim() && !disabled
              ? 'bg-indigo-600 text-white shadow-md transform hover:scale-105'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

