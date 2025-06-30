'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Plus, LogOut, User, Search, Trash2 } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';
import { useSession, signIn, signOut } from 'next-auth/react';
import { isToday, isYesterday, isThisWeek, isThisMonth, format } from 'date-fns';
import { api } from '@/utils/api';
import { createLogger } from '@/utils/logger';
import type { Chat } from '@/types';
import { ErrorBoundary } from './ErrorBoundary';

const logger = createLogger('taskbar');

interface TaskBarProps {
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
}

function TaskBarContent({ onChatSelect, onNewChat }: TaskBarProps = {}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ chatId: string; title: string } | null>(null);
  const [showTrashIcon, setShowTrashIcon] = useState<string | null>(null);
  const taskBarRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isDarkMode, isTaskBarExpanded, toggleTaskBar, setTaskBarExpanded } = useSidebarStore();
  const { data: session } = useSession();

  // Click outside detection for user menu and trash icon
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      // Hide trash icon when clicking outside
      const target = event.target as HTMLElement;
      if (!target.closest('.chat-item-container')) {
        setShowTrashIcon(null);
      }
    };

    if (showUserMenu || showTrashIcon) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu, showTrashIcon]);

  // Fetch chat history for signed-in users
  useEffect(() => {
    console.log('Session in TaskBar:', session);
    if (session?.user) {
      console.log('User is logged in, fetching chat history...');
      fetchChatHistory();
    } else {
      console.log('No session/user, skipping chat history fetch');
    }
  }, [session]);

  const fetchChatHistory = async () => {
    try {
      console.log('Fetching chat history...');
      const response = await api.get('/api/chats');
      console.log('Chat history response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history data:', data);
        setChatHistory(data);
      } else {
        console.error('Failed to fetch chat history:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      logger.error('Error fetching chat history', error);
      console.error('Error fetching chat history:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // Optimistically remove from UI for immediate feedback
      const previousHistory = chatHistory;
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      setDeleteConfirmation(null);
      
      // Make backend API call to permanently delete the chat
      const response = await api.delete(`/api/chats/${chatId}`);
      if (!response.ok) {
        // Revert on error
        logger.error('Failed to delete chat from backend', { chatId, status: response.status });
        setChatHistory(previousHistory);
        // Optionally show an error message to the user
        alert('Failed to delete chat. Please try again.');
      }
    } catch (error) {
      logger.error('Error deleting chat', error);
      // Refresh chat history on error
      fetchChatHistory();
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (!session?.user?.name && !session?.user?.email) return '?';
    const name = session.user.name || session.user.email || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Group chats by time periods
  const groupChatsByTimePeriod = (chats: Chat[]) => {
    const groups: { [key: string]: Chat[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    chats.forEach(chat => {
      const chatDate = new Date(chat.createdAt);
      if (isToday(chatDate)) {
        groups['Today'].push(chat);
      } else if (isYesterday(chatDate)) {
        groups['Yesterday'].push(chat);
      } else if (isThisWeek(chatDate)) {
        groups['This Week'].push(chat);
      } else if (isThisMonth(chatDate)) {
        groups['This Month'].push(chat);
      } else {
        groups['Older'].push(chat);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };


  return (
    <>
      {/* Taskbar */}
      <div
        ref={taskBarRef}
        className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 hide-scrollbar ${
          isDarkMode ? 'bg-[#1a1b1e] border-r border-gray-500' : 'bg-gray-50 border-r border-gray-300'
        }`}
        style={{
          width: isTaskBarExpanded ? '280px' : '56px', // 56px ≈ 1.5cm
        }}
      >
        {/* Toggle Button and Header */}
        <div className="relative">
          <div className={`flex items-center ${isTaskBarExpanded ? 'px-4 justify-between' : 'px-2 justify-center'} pt-2 pb-4`}>
            {isTaskBarExpanded ? (
              <>
                {/* Title on the left */}
                <div className="flex items-center gap-2">
                  <img 
                    src="/logo.png" 
                    alt="AI Legal Logo" 
                    className="h-8 w-8 object-contain"
                  />
                  <h1 className="text-lg font-semibold" style={{ color: isDarkMode ? '#d1d1d1' : '#004A84' }}>
                    AI Legal
                  </h1>
                </div>
                {/* Hamburger toggle on the right */}
                <button
                  onClick={() => toggleTaskBar()}
                  className={`p-2 flex items-center justify-center transition-all duration-300 rounded-lg ${
                    isDarkMode 
                      ? 'hover:bg-[#404147]' 
                      : 'hover:bg-gray-100'
                  }`}
                  style={{ color: isDarkMode ? '#d1d1d1' : '#004A84' }}
                  aria-label="Collapse menu"
                >
                  <Menu size={24} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              /* Hamburger toggle centered when collapsed */
              <button
                onClick={() => toggleTaskBar()}
                className={`p-2 flex items-center justify-center transition-all duration-300 rounded-lg ${
                  isDarkMode 
                    ? 'hover:bg-[#404147]' 
                    : 'hover:bg-gray-100'
                }`}
                style={{ color: isDarkMode ? '#d1d1d1' : '#004A84' }}
                aria-label="Expand menu"
              >
                <Menu size={24} strokeWidth={2.5} />
              </button>
            )}
          </div>
          
          {/* Divider line - positioned to align with Aletheia text */}
          <div className={`absolute left-0 right-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ 
            height: '1px',
            bottom: '0'
          }}></div>
        </div>

        {/* New Chat Button - Always Circular */}
        <div className={`flex items-center mt-4 ${isTaskBarExpanded ? 'px-4 justify-start' : 'px-2 justify-center'}`}>
          <button
            onClick={() => onNewChat ? onNewChat() : window.location.reload()}
            className="flex-shrink-0 flex items-center justify-center transition-all duration-300 hover:shadow-lg"
            style={{
              backgroundColor: isDarkMode ? 'transparent' : '#C7A562',
              border: isDarkMode ? '2px solid #d1d1d1' : '2px solid #004A84',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
            }}
            onMouseEnter={(e) => {
              if (!isDarkMode) e.currentTarget.style.backgroundColor = '#B59552';
              else e.currentTarget.style.backgroundColor = '#404147';
            }}
            onMouseLeave={(e) => {
              if (!isDarkMode) e.currentTarget.style.backgroundColor = '#C7A562';
              else e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="New Chat"
          >
            <Plus size={18} strokeWidth={3} style={{ color: isDarkMode ? '#ffffff' : '#004A84' }} />
          </button>
          {isTaskBarExpanded && (
            <span 
              className="ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-300"
              style={{ color: isDarkMode ? '#ffffff' : '#004A84' }}
            >
              New Chat
            </span>
          )}
        </div>

        {/* Chat History Button/Text */}
        {!isTaskBarExpanded ? (
          // Show button when collapsed
          <div className="flex items-center mt-4 px-2 justify-center">
            <button
              onClick={() => {
                setTaskBarExpanded(true);
              }}
              className="flex-shrink-0 flex items-center justify-center transition-all duration-300 hover:shadow-lg relative"
              style={{
                backgroundColor: isDarkMode ? 'transparent' : '#C7A562',
                border: isDarkMode ? '2px solid #d1d1d1' : '2px solid #004A84',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
              }}
              onMouseEnter={(e) => {
                if (!isDarkMode) e.currentTarget.style.backgroundColor = '#B59552';
                else e.currentTarget.style.backgroundColor = '#404147';
              }}
              onMouseLeave={(e) => {
                if (!isDarkMode) e.currentTarget.style.backgroundColor = '#C7A562';
                else e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Chat History"
            >
              {/* Minimal Clock Icon */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                {/* Hour hand (12 o'clock) - straight up */}
                <line 
                  x1="16" y1="16" 
                  x2="16" y2="9" 
                  stroke={isDarkMode ? '#ffffff' : '#004A84'} 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
                {/* Minute hand (4 o'clock) - down-right */}
                <line 
                  x1="16" y1="16" 
                  x2="21" y2="24" 
                  stroke={isDarkMode ? '#ffffff' : '#004A84'} 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
                {/* Center dot */}
                <circle 
                  cx="16" cy="16" r="1.5" 
                  fill={isDarkMode ? '#ffffff' : '#004A84'} 
                />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Chat History Section - Shows when taskbar is expanded */}
        {isTaskBarExpanded && (
          <div className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Divider line */}
            <div className={`mx-3 mb-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ height: '1px' }}></div>
            
            {/* Search Bar - Always visible when expanded */}
            <div className="px-4 mb-3">
              <div className="relative">
                <Search size={16} className={`absolute left-3 top-2.5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none ${
                    isDarkMode 
                      ? 'bg-[#25262b] text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Chats Header */}
            <div className="px-4 mb-3">
              <span 
                className="text-sm font-medium"
                style={{ color: isDarkMode ? '#ffffff' : '#004A84' }}
              >
                Chats
              </span>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 hide-scrollbar">
              {!session ? (
                // Message for non-signed-in users
                <div className="text-center py-8">
                  <p className="text-sm font-medium" style={{ color: isDarkMode ? '#9CA3AF' : '#E1C88E' }}>Sign in to save chats</p>
                </div>
              ) : (
                // Show chat history
                <>
                  {/* Chat History Header */}
                  <div className="mb-3">
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Recent Chats
                    </h3>
                  </div>
                  {chatHistory.length === 0 ? (
                // No chats found
                <div className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="text-sm">
                    {chatSearchQuery ? 'No chats found' : 'No chat history yet'}
                  </p>
                </div>
              ) : (() => {
                // Filter and group chats
                const filteredChats = chatHistory.filter(chat => {
                  const searchLower = chatSearchQuery.toLowerCase();
                  const title = chat.title?.toLowerCase() || '';
                  const preview = chat.preview?.toLowerCase() || '';
                  return title.includes(searchLower) || preview.includes(searchLower);
                });

                if (filteredChats.length === 0) {
                  return (
                    <div className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p className="text-sm">No chats found</p>
                    </div>
                  );
                }

                const groupedChats = groupChatsByTimePeriod(filteredChats);

                return (
                  <div className="space-y-4">
                    {Object.entries(groupedChats).map(([period, chats]) => (
                      <div key={period}>
                        <div className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {period}
                        </div>
                        <div className="space-y-1">
                          {chats
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((chat) => (
                              <div
                                key={chat.id}
                                className="chat-item-container relative"
                              >
                                <button
                                  onClick={() => {
                                    if (onChatSelect) {
                                      onChatSelect(chat.id);
                                    } else {
                                      window.location.href = `/?chat=${chat.id}`;
                                    }
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setShowTrashIcon(chat.id);
                                  }}
                                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                                    isDarkMode 
                                      ? 'hover:bg-[#25262b] text-gray-300' 
                                      : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  <div className={`text-sm font-medium truncate pr-8`}>
                                    {chat.title || chat.preview?.substring(0, 40) + '...' || 'New Chat'}
                                  </div>
                                  <div className={`text-xs mt-0.5 ${
                                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                  }`}>
                                    {format(new Date(chat.createdAt), 'h:mm a')}
                                  </div>
                                </button>
                                
                                {/* Trash icon that appears on right-click */}
                                {showTrashIcon === chat.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowTrashIcon(null);
                                      setDeleteConfirmation({ 
                                        chatId: chat.id, 
                                        title: chat.title || 'Untitled Chat' 
                                      });
                                    }}
                                    className={`absolute top-2 right-2 p-1 rounded transition-all ${
                                      isDarkMode 
                                        ? 'bg-red-900/20 hover:bg-red-900/40 text-red-400' 
                                        : 'bg-red-100 hover:bg-red-200 text-red-600'
                                    }`}
                                    aria-label="Delete chat"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom Section - User Button */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Divider line */}
          <div className={`mx-3 mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ height: '1px' }}></div>
          
          <div className={`${isTaskBarExpanded ? 'px-4' : 'px-2'} pb-4`}>
            
            {/* User/Auth Button */}
            <div className={`flex items-center ${isTaskBarExpanded ? 'justify-start' : 'justify-center'} relative`}>
              <div className="relative flex items-center" ref={userMenuRef}>
                <button
                  onClick={() => {
                    if (!isTaskBarExpanded && !session) {
                      // If collapsed and not signed in, go directly to sign-in page
                      signIn();
                    } else {
                      // Otherwise show the menu
                      setShowUserMenu(!showUserMenu);
                    }
                  }}
                  className="flex-shrink-0 flex items-center justify-center transition-all duration-300 hover:shadow-lg"
                  style={{
                    backgroundColor: isDarkMode ? 'transparent' : '#C7A562',
                    border: isDarkMode ? '2px solid #ffffff' : '2px solid #004A84',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDarkMode) e.currentTarget.style.backgroundColor = '#B59552';
                    else e.currentTarget.style.backgroundColor = '#404147';
                  }}
                  onMouseLeave={(e) => {
                    if (!isDarkMode) e.currentTarget.style.backgroundColor = '#C7A562';
                    else e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  aria-label={session ? 'User menu' : 'Sign in'}
                >
                  <span className="text-base font-bold" style={{ color: isDarkMode ? '#d1d1d1' : '#004A84', fontStyle: 'normal' }}>
                    {session ? getUserInitials() : '?'}
                  </span>
                </button>
                {isTaskBarExpanded && (
                  <button
                    onClick={() => {
                      if (session) {
                        setShowUserMenu(!showUserMenu);
                      } else {
                        signIn();
                      }
                    }}
                    className="ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-300 hover:underline cursor-pointer"
                    style={{ color: isDarkMode ? '#ffffff' : '#004A84' }}
                  >
                    {session ? (session.user?.name || session.user?.email || 'User') : 'Sign In'}
                  </button>
                )}

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div 
                  className={`fixed rounded-2xl shadow-lg z-[9999] overflow-hidden ${
                    isDarkMode ? 'bg-[#25262b] border border-gray-700' : 'bg-white border border-gray-200'
                  }`}
                  style={{
                    bottom: '60px',
                    left: isTaskBarExpanded ? '16px' : '64px',
                    minWidth: '200px'
                  }}
                >
                  {session ? (
                    <>
                      <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {session.user?.name || 'User'}
                        </div>
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {session.user?.email}
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            signOut();
                          }}
                          className={`w-full flex items-center px-4 py-2 text-sm transition-colors rounded-xl ${
                            isDarkMode 
                              ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                              : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                          }`}
                        >
                          <LogOut size={16} className="mr-2" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signIn();
                      }}
                      className={`w-full flex items-center px-4 py-3 text-sm transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                          : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <User size={16} className="mr-2" />
                      Sign In
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className={`mx-4 p-6 rounded-lg shadow-xl max-w-sm w-full ${
            isDarkMode ? 'bg-[#25262b] text-gray-100' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-lg font-semibold mb-3">Delete Chat?</h3>
            <p className={`mb-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to delete "{deleteConfirmation.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteChat(deleteConfirmation.chatId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default function TaskBar(props: TaskBarProps) {
  return (
    <ErrorBoundary 
      level="section"
      isolate
      fallback={
        <div className="h-full w-14 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-xs text-gray-500 -rotate-90 whitespace-nowrap">Navigation Error</p>
        </div>
      }
    >
      <TaskBarContent {...props} />
    </ErrorBoundary>
  );
}