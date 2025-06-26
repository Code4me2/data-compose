'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Menu, LogOut } from 'lucide-react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { useSidebarStore } from '@/store/sidebar';

interface ChatItem {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
}

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNewChat: () => void;
  chats: ChatItem[];
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
}

export default function Sidebar({ 
  isExpanded, 
  onToggleExpand, 
  onNewChat,
  chats,
  currentChatId,
  onChatSelect
}: SidebarProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { isDarkMode } = useSidebarStore();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    (chat.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-[997] md:hidden"
          onClick={onToggleExpand}
        />
      )}
      
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed left-[56px] top-0 h-screen bg-white/95 dark:bg-[#1a1b1e] backdrop-blur-sm flex flex-col z-[998] transition-all duration-300 ease-in-out`}
        style={{
          width: isExpanded ? '250px' : '60px',
          transform: isMobile && !isExpanded ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'width 0.3s ease-in-out, transform 0.3s ease-in-out'
        }}
      >
      {/* Top Section */}
      <div className="space-y-4">
        {/* Toggle Button aligned with AI Legal */}
        <div className="flex items-center h-[73px] px-3">
          <button
            onClick={onToggleExpand}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200 ${
              isDarkMode 
                ? 'hover:bg-[#25262b] active:bg-[#25262b]' 
                : 'hover:bg-gray-100 active:bg-[#C7A562] focus:bg-[#C7A562]'
            }`}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu className="w-5 h-5" style={{ color: isDarkMode ? '#e5e7eb' : '#004A84' }} />
          </button>
          {isExpanded && (
            <span className="ml-3 font-semibold text-gray-900 dark:text-dark-text">AI Legal</span>
          )}
        </div>

        <div className="px-3 space-y-4">
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className={`w-full flex items-center transition-all duration-200 hover:opacity-90 ${
              isExpanded ? 'gap-3' : 'justify-center'
            }`}
            title={!isExpanded ? 'New Chat' : ''}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: isDarkMode ? '#25262b' : '#C7A562'
              }}
            >
              <Plus 
                className="w-5 h-5" 
                style={{ color: isDarkMode ? '#ffffff' : '#004A84' }} 
                strokeWidth={3} 
              />
            </div>
            {isExpanded && (
              <span style={{ color: isDarkMode ? '#ffffff' : '#004A84' }} className="font-medium">New Chat</span>
            )}
          </button>

          {/* Search Input - Only show when expanded */}
          {isExpanded && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm dark:bg-[#25262b] dark:text-dark-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat History - Scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isExpanded && (
          <div className="px-3 py-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-muted uppercase tracking-wider">Chats</h3>
          </div>
        )}
        
        <div className="flex-1 px-3 overflow-y-auto hide-scrollbar">
          {isExpanded ? (
            <div className="space-y-2 pb-4">
              {filteredChats.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery ? 'No chats found' : 'No conversations yet'}
                </p>
              ) : (
                // Sort chats by date - most recent first
                [...filteredChats]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => onChatSelect(chat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group ${
                        currentChatId === chat.id 
                          ? 'bg-white dark:bg-[#25262b] shadow-sm' 
                          : 'hover:bg-gray-100 dark:hover:bg-[#25262b]'
                      }`}
                    >
                      <p className={`text-sm truncate ${
                        currentChatId === chat.id ? 'font-medium text-gray-900 dark:text-dark-text' : 'text-gray-700 dark:text-dark-muted'
                      }`}>
                        {chat.title || 'Untitled'}
                      </p>
                      {chat.createdAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </button>
                  ))
              )}
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {/* Show chat icons when collapsed */}
              {filteredChats.slice(0, 8).map((chat, index) => (
                <button
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={`w-full flex items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                    currentChatId === chat.id 
                      ? 'bg-white shadow-sm' 
                      : 'hover:bg-gray-100'
                  }`}
                  title={chat.title || 'Untitled'}
                >
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-700">
                    {index + 1}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - User Account */}
      <div className="p-3">
        {/* Account Button */}
        <AccountButton isExpanded={isExpanded} session={session} />
      </div>
    </div>
    </>
  );
}

// Account Button Component
function AccountButton({ isExpanded, session }: { isExpanded: boolean; session: any }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useSidebarStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`w-full flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#25262b] transition-all duration-200 ${
          isExpanded ? 'gap-3 px-3 py-2' : 'justify-center p-2'
        }`}
        title={!isExpanded ? (session?.user ? session.user.name || 'User' : 'Not signed in') : ''}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isDarkMode 
              ? '#25262b'
              : '#C7A562'
          }}
        >
          {session?.user ? (
            session.user.image ? (
              <img 
                src={session.user.image} 
                alt=""
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-sm font-medium" style={{ color: isDarkMode ? '#ffffff' : '#004A84' }}>
                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
              </span>
            )
          ) : (
            <span className="text-sm font-medium" style={{ color: isDarkMode ? '#ffffff' : '#004A84' }}>?</span>
          )}
        </div>
        {isExpanded && (
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
              {session?.user ? (session.user.name || session.user.email?.split('@')[0] || 'User') : 'Guest'}
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-muted">
              {session?.user ? 'Signed in' : 'Not signed in'}
            </p>
          </div>
        )}
      </button>

      {/* Account Menu Dropdown */}
      {showMenu && (
        <div className={`absolute bottom-full mb-2 rounded-lg shadow-lg overflow-hidden ${
          isExpanded ? 'left-0 right-0' : 'left-0 min-w-[200px]'
        }`}
        style={{
          backgroundColor: isDarkMode ? '#25262b' : '#f3f4f6'
        }}>
          {session?.user ? (
            <>
              <div className="px-4 py-3">
                <p className="text-sm font-medium" style={{ color: isDarkMode ? '#f3f4f6' : '#004A84' }}>{session.user.name || 'User'}</p>
                <p className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#004A84', opacity: 0.8 }}>{session.user.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowMenu(false);
                  signOut();
                }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
                style={{
                  color: isDarkMode ? '#f3f4f6' : '#004A84',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDarkMode 
                    ? 'rgba(229, 231, 235, 0.1)' 
                    : 'rgba(0, 74, 132, 0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <LogOut className="w-4 h-4" style={{ color: isDarkMode ? '#f3f4f6' : '#004A84' }} />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setShowMenu(false);
                signIn();
              }}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{
                color: isDarkMode ? '#e5e7eb' : '#004A84',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDarkMode 
                  ? 'rgba(229, 231, 235, 0.1)' 
                  : 'rgba(0, 74, 132, 0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              Sign in to your account
            </button>
          )}
        </div>
      )}
    </div>
  );
}