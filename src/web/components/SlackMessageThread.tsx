import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { SlackFormatter } from '@/services/slack-formatter';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  message_id: string;
  content: string;
  author: string;
  timestamp: string;
  thread_id: string | null;
  thread_reply_count?: number;
  is_evidence?: boolean;
  trigger_text?: string;
  channel_id?: string;
  team_id?: string;
  authorProfile?: {
    display_name: string | null;
    real_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ThreadMessage extends Message {
  parent_message_id: string;
}

interface SlackMessageThreadProps {
  messages: Message[];
  maxHeight?: string;
}

export interface SlackMessageThreadHandle {
  scrollToEvidence: () => void;
}

export const SlackMessageThread = forwardRef<SlackMessageThreadHandle, SlackMessageThreadProps>(({ 
  messages,
  maxHeight = '500px'
}, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  const scrollToEvidence = () => {
    if (evidenceRef.current) {
      evidenceRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToEvidence
  }));

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      // Find first evidence message
      const firstEvidence = messages.find(msg => msg.is_evidence);
      if (firstEvidence) {
        // Get the scroll container and evidence message element
        const container = scrollRef.current;
        const evidenceMessage = container.querySelector(`[data-message-id="${firstEvidence.message_id}"]`);
        
        if (evidenceMessage) {
          evidenceMessage.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }
    }
  }, [messages]);

  const fetchThreadMessages = async (threadTs: string) => {
    try {
      setIsLoadingThread(true);
      const response = await fetch(`/api/threads/${threadTs}`);
      if (!response.ok) throw new Error('Failed to fetch thread messages');
      const data = await response.json();
      setThreadMessages(data.messages);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleThreadClick = async (message: Message) => {
    if (!message.thread_id) return;
    
    if (activeThread === message.thread_id) {
      setActiveThread(null);
      setThreadMessages([]);
    } else {
      setActiveThread(message.thread_id);
      await fetchThreadMessages(message.thread_id);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const highlightTriggerText = (content: string, triggerText?: string) => {
    if (!triggerText) {
      return SlackFormatter.format(content);
    }

    // First format the content to handle Slack formatting
    let formattedContent = SlackFormatter.format(content);

    // Clean up the trigger text for better matching
    const cleanTriggerText = triggerText
      .replace(/['"]/g, '') // Remove quotes
      .trim();

    // Find the sentence containing any of the trigger phrases
    const sentenceRegex = new RegExp(`[^.!?]*(?:${cleanTriggerText})[^.!?]*[.!?]`, 'gi');
    formattedContent = formattedContent.replace(
      sentenceRegex,
      '<span class="inline-block bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">$&</span>'
    );

    // Split into phrases and escape special characters
    const phrases = cleanTriggerText.split(/,\s*and\s*|\s*,\s*/)
      .map(phrase => phrase.trim())
      .filter(phrase => phrase.length > 0)
      .map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    // Then highlight specific phrases with stronger emphasis
    phrases.forEach(phrase => {
      const phraseRegex = new RegExp(`(${phrase})`, 'gi');
      formattedContent = formattedContent.replace(
        phraseRegex,
        '<span class="inline-block bg-blue-100 border-2 border-blue-300 rounded-sm px-1 -mx-0.5 font-semibold text-blue-900">$1</span>'
      );
    });

    return formattedContent;
  };

  const getSlackMessageUrl = (message: Message) => {
    if (!message.team_id || !message.channel_id) return null;
    
    // Convert timestamp to the format Slack expects (whole number in microseconds)
    const ts = message.thread_id || message.timestamp;
    const tsNum = typeof ts === 'string' ? 
      (ts.includes('.') ? ts.replace('.', '') : `${ts}000000`) :
      `${Math.floor(Number(ts) * 1000000)}`;

    return `https://app.slack.com/client/${message.team_id}/${message.channel_id}/thread/${tsNum}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl hover:border-blue-100 border border-transparent">
      <div 
        ref={scrollRef}
        className="overflow-y-auto px-4 transition-colors duration-200 hover:bg-gray-50 message-thread relative"
        style={{ 
          maxHeight,
          scrollbarWidth: 'thin',
          scrollbarColor: '#E5E7EB transparent'
        }}
      >
        <style jsx global>{`
          .message-thread::-webkit-scrollbar {
            width: 8px;
          }
          .message-thread::-webkit-scrollbar-track {
            background: transparent;
          }
          .message-thread::-webkit-scrollbar-thumb {
            background-color: #E5E7EB;
            border-radius: 4px;
            border: 2px solid transparent;
          }
          .message-thread:hover::-webkit-scrollbar-thumb {
            background-color: #D1D5DB;
          }
          
          /* Add smooth transition for the highlight */
          .message-content span {
            transition: all 0.15s ease-in-out;
          }
          
          /* Subtle hover effect for highlighted text */
          .message-content span:hover {
            @apply bg-blue-100 border-blue-300;
          }
          
          .slack-link {
            opacity: 0;
            transition: opacity 0.15s ease-in-out;
          }
          
          .message-content:hover .slack-link {
            opacity: 1;
          }
          
          .thread-indicator {
            opacity: 0.6;
            transition: opacity 0.15s ease-in-out;
          }
          
          .message-content:hover .thread-indicator {
            opacity: 1;
          }
          
          .thread-replies {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-in-out;
          }
          
          .thread-replies.open {
            max-height: 500px;
          }

          /* Hide any bare text nodes that might be numbers */
          .message-thread > div > :not([class]) {
            display: none;
          }
        `}</style>
        <AnimatePresence>
          {messages.map((message, index) => {
            const isFirstInGroup = index === 0 || 
              messages[index - 1].author !== message.author ||
              Number(message.timestamp) - Number(messages[index - 1].timestamp) > 300000;

            const isFirstEvidence = message.is_evidence && 
              (!messages[index - 1]?.is_evidence);

            const slackUrl = getSlackMessageUrl(message);
            const hasThread = message.thread_id && message.thread_reply_count;
            const isThreadOpen = activeThread === message.thread_id;

            return (
              <motion.div
                key={message.message_id}
                data-message-id={message.message_id}
                ref={isFirstEvidence ? evidenceRef : null}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`py-1 ${message.is_evidence ? 'bg-blue-50 -mx-4 px-4 border-l-4 border-blue-500' : ''}`}
              >
                {isFirstInGroup && (
                  <div className="flex items-center mt-4 mb-1">
                    <div className="flex-shrink-0 w-10 h-10 relative">
                      {message.authorProfile?.avatar_url ? (
                        <img
                          src={message.authorProfile.avatar_url}
                          alt={message.authorProfile.display_name || message.author}
                          className="w-10 h-10 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {(message.authorProfile?.display_name || message.author).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {message.authorProfile?.display_name || message.author}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {slackUrl && (
                        <a
                          href={slackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1.5 p-0.5 rounded hover:bg-gray-100 transition-all inline-flex items-center"
                          title="Open in Slack"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" viewBox="0 0 122.8 122.8" fill="currentColor">
                            <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
                            <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
                            <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
                            <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div 
                  className={`${isFirstInGroup ? '' : 'pl-13'} message-content group relative`}
                  onClick={() => hasThread && handleThreadClick(message)}
                >
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: highlightTriggerText(message.content, message.trigger_text)
                    }}
                    className="text-gray-900 text-sm whitespace-pre-wrap break-words"
                  />
                  {hasThread ? (
                    <button
                      className={`thread-indicator inline-flex items-center mt-1 px-2 py-1 text-xs font-medium rounded ${
                        isThreadOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThreadClick(message);
                      }}
                    >
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3C17.5228 3 22 6.47715 22 10.5C22 14.5228 17.5228 18 12 18H8L3 21V10.5C3 6.47715 7.47715 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {message.thread_reply_count} {message.thread_reply_count === 1 ? 'reply' : 'replies'}
                    </button>
                  ) : null}
                  {isThreadOpen && threadMessages.length > 0 && (
                    <div className={`thread-replies ${isThreadOpen ? 'open' : ''} ml-4 mt-2 border-l-2 border-gray-200 pl-4`}>
                      {isLoadingThread ? (
                        <div className="py-4 text-center text-gray-500">
                          Loading thread...
                        </div>
                      ) : (
                        threadMessages.map((threadMessage) => (
                          <div key={threadMessage.message_id} className="py-2">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-6 h-6 relative">
                                {threadMessage.authorProfile?.avatar_url ? (
                                  <img
                                    src={threadMessage.authorProfile.avatar_url}
                                    alt={threadMessage.authorProfile.display_name || threadMessage.author}
                                    className="w-6 h-6 rounded object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">
                                      {(threadMessage.authorProfile?.display_name || threadMessage.author).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-2">
                                <span className="text-xs font-medium text-gray-900">
                                  {threadMessage.authorProfile?.display_name || threadMessage.author}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {formatTimestamp(threadMessage.timestamp)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-sm text-gray-900">
                              <div dangerouslySetInnerHTML={{ 
                                __html: SlackFormatter.format(threadMessage.content)
                              }} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}); 