/**
 * Intelligence Service — Frontend SSE streaming client.
 *
 * Connects to POST /api/intelligence/chat and pipes the SSE token stream
 * into caller-provided callbacks. Returns an AbortController so callers
 * can cancel mid-stream (e.g. user closes chatbot, sends new message).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Streams an intelligence chat response token by token.
 *
 * @returns AbortController — call .abort() to cancel the stream.
 */
export function streamIntelligenceChat(
  message: string,
  history: ChatHistoryMessage[],
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  const token = localStorage.getItem('authToken');
  const orgId = localStorage.getItem('activeOrgId');

  void (async () => {
    try {
      const response = await fetch(`${BASE_URL}/intelligence/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({
          message,
          // Cap history to last 10 turns client-side as well
          history: history.slice(-10),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Non-SSE error response (e.g. 401, 429 before stream starts)
        const errBody = await response.json().catch(() => ({})) as { message?: string };
        callbacks.onError(
          errBody.message ?? `Intelligence request failed (${response.status}).`
        );
        return;
      }

      if (!response.body) {
        callbacks.onError('No response body from Intelligence service.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n\n; process all complete events
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? ''; // last part may be incomplete

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const payload = JSON.parse(line.slice(6)) as {
              type: 'token' | 'done' | 'error';
              content?: string;
              message?: string;
            };

            if (payload.type === 'token' && payload.content) {
              callbacks.onToken(payload.content);
            } else if (payload.type === 'done') {
              callbacks.onDone();
              return;
            } else if (payload.type === 'error') {
              callbacks.onError(payload.message ?? 'An error occurred in Intelligence mode.');
              return;
            }
          } catch {
            // Malformed SSE line — skip silently
          }
        }
      }

      // Stream ended without explicit done event
      callbacks.onDone();

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — not an error
        return;
      }
      callbacks.onError(
        err instanceof Error ? err.message : 'Failed to connect to Intelligence service.'
      );
    }
  })();

  return controller;
}
