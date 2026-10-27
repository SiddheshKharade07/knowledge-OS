import * as React from 'react';

export interface ChatActivity {
  streaming: boolean;
  /** Aborts the in-flight generation. Must be safe to call multiple times. */
  stop: () => void;
}

export interface ChatActivityContextValue {
  activity: ChatActivity | null;
  register: (activity: ChatActivity | null) => void;
  /** Run a navigation that must bypass the stream guard (e.g. draft session id). */
  allowNextNavigation: (navigate: () => void) => void;
}

export const ChatActivityContext = React.createContext<ChatActivityContextValue | null>(null);

export function useChatActivity(): ChatActivityContextValue {
  const context = React.useContext(ChatActivityContext);
  if (!context) {
    throw new Error('useChatActivity must be used within a ChatActivityProvider');
  }
  return context;
}
