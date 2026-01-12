import React from 'react';
import MessageComposer from './MessageComposer';

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Props = {
  threadTitle?: string;
  messages: Message[];
  onSend: (text: string) => void;
};

export default function ConversationView({ threadTitle, messages, onSend }: Props) {
  return (
    <main className="flex-1 flex flex-col h-full">
      <header className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">{threadTitle ?? 'Conversation'}</h3>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet — say hi 👋</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="p-3 rounded bg-gray-50 max-w-2xl">
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <MessageComposer onSend={onSend} />
    </main>
  );
}
