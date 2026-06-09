'use client';

import {useCallback} from 'react';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport, type ChatStatus, type UIMessage} from 'ai';

const CLIENT_AGENT_API = '/api/ai/client-agent';

// Stable singleton: the endpoint never changes, so the transport never needs
// re-creating. Per-request context is layered on through `sendMessage` options.
const transport = new DefaultChatTransport({api: CLIENT_AGENT_API});

export interface UseClientAgentOptions {
  /** When set, every request carries this client name as extra body context. */
  clientName?: string;
}

export interface UseClientAgentResult {
  messages: UIMessage[];
  /** Sends a trimmed user turn; no-ops on empty input. */
  sendMessage: (text: string) => Promise<void>;
  status: ChatStatus;
  error: Error | undefined;
}

/**
 * Thin wrapper over Vercel AI SDK v6 `useChat` for the client-operations agent.
 * Exposes a string-first `sendMessage` and seeds an optional `clientName` into
 * the per-request body so the model can answer with client-aware context.
 */
export function useClientAgent({clientName}: UseClientAgentOptions = {}): UseClientAgentResult {
  const {messages, sendMessage, status, error} = useChat({transport});

  const send = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await sendMessage({text: trimmed}, clientName ? {body: {clientName}} : undefined);
    },
    [sendMessage, clientName],
  );

  return {messages, sendMessage: send, status, error};
}
