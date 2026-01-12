import React, { useState } from 'react';

type Props = {
  onSend: (text: string) => void;
};

export default function MessageComposer({ onSend }: Props) {
  const [text, setText] = useState('');

  return (
    <form
      className="flex items-center gap-2 p-3 border-t border-gray-200"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
      }}
    >
      <textarea
        className="flex-1 resize-none rounded border px-3 py-2 text-sm"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message..."
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
        Send
      </button>
    </form>
  );
}
