import { useCallback, useEffect, useRef, useState } from 'react';
import { COACH_GREETING, generateCoachReply } from '../services/coachService';
import type { ChatMessage, CoachContext, Settings } from '../types';

const CHAT_STORAGE_KEY = 'london-lab.chat.v1';
const MAX_MESSAGES = 40;

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function greeting(): ChatMessage {
  return {
    id: 'coach-greeting',
    role: 'coach',
    text: COACH_GREETING,
    createdAt: Date.now(),
  };
}

function readMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [greeting()];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [greeting()];
    return parsed
      .filter((message) => message && (message.role === 'coach' || message.role === 'user'))
      .slice(-MAX_MESSAGES)
      .map((message) => ({ ...message, pending: false }));
  } catch {
    return [greeting()];
  }
}

export interface CoachChatController {
  messages: ChatMessage[];
  isTyping: boolean;
  send: (text: string, context: CoachContext, settings: Settings) => Promise<void>;
  clear: () => void;
}

export function useCoachChat(): CoachChatController {
  const [messages, setMessages] = useState<ChatMessage[]>(readMessages);
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef(messages);
  const pendingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.filter((message) => !message.pending).slice(-MAX_MESSAGES)),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [messages]);

  const send = useCallback(
    async (text: string, context: CoachContext, settings: Settings) => {
      const question = text.trim();
      if (!question || pendingRef.current) return;
      pendingRef.current = true;

      const userMessage: ChatMessage = {
        id: makeId('user'),
        role: 'user',
        text: question,
        createdAt: Date.now(),
      };
      const pendingMessage: ChatMessage = {
        id: makeId('coach'),
        role: 'coach',
        text: 'Thinking…',
        createdAt: Date.now(),
        pending: true,
      };
      const history = messagesRef.current;
      setMessages((current) => [...current, userMessage, pendingMessage].slice(-MAX_MESSAGES));
      setIsTyping(true);

      try {
        const reply = await generateCoachReply({
          question,
          history,
          context,
          settings,
        });
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessage.id ? { ...message, text: reply, pending: false } : message,
          ),
        );
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessage.id
              ? {
                  ...message,
                  text: 'I could not complete that thought. Try asking about the current plan, a specific move, or the evaluation.',
                  pending: false,
                }
              : message,
          ),
        );
      } finally {
        pendingRef.current = false;
        setIsTyping(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    const fresh = [greeting()];
    messagesRef.current = fresh;
    setMessages(fresh);
  }, []);

  return { messages, isTyping, send, clear };
}
