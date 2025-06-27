'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatHistoryItem {
  id: string;
  title: string | null;
  preview: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatHistory: ChatHistoryItem[];
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isLoggedIn: boolean;
}

export default function ChatHistorySidebar({
  isOpen,
  onToggle,
  chatHistory,
  currentChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  isLoggedIn
}: ChatHistorySidebarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarWidth = isMobile ? 'w-[280px]' : 'w-[320px]';

  return (
    <>
      {/* Chat History Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed z-50 w-12 h-12 bg-white border border-gray-300 rounded-lg transition-all duration-300 hover:bg-gray-50 ${
          isOpen ? 'left-[340px]' : 'left-5'
        } ${isMobile ? 'w-10 h-10 top-16' : 'top-20'}`}
        style={{
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
        aria-label="Toggle chat history"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Vertical Divider Line */}
          <div 
            className="absolute right-3 top-2 bottom-2 w-[2px] bg-gray-300"
            style={{
              height: 'calc(100% - 16px)'
            }}
          />
        </div>
      </button>

      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 transition-transform duration-300 ${
          sidebarWidth
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#004A84' }}>Chat History</h2>
              {isLoggedIn && (
                <button
                  onClick={onNewChat}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="New chat"
                >
                  <Plus className="w-5 h-5" style={{ color: '#004A84' }} />
                </button>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {!isLoggedIn ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Sign in to save your chat history</p>
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No chat history yet</p>
                <p className="text-xs mt-1">Start a new conversation</p>
              </div>
            ) : (
              <div className="p-2">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group relative mb-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      currentChatId === chat.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => {
                      onChatSelect(chat.id);
                      if (isMobile) onToggle();
                    }}
                  >
                    <div className="pr-8">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {chat.title || 'New Chat'}
                      </h3>
                      {chat.preview && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {chat.preview}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all duration-200"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {isLoggedIn && (
            <div className="p-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}