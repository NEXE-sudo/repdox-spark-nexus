import { useEffect, useState } from 'react';

export default function PrivacyPolicy() {
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem('privacy_policy_draft') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('privacy_policy_draft', content);
    } catch {
      // ignore
    }
  }, [content]);

  const download = (format: 'md' | 'txt' = 'md') => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-policy.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">
          https://repdox-spark-nexus.vercel.app/
        </p>

        <div className="flex gap-3 mb-4">
          <button
            className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90"
            onClick={() => download('md')}
          >
            Download (.md)
          </button>
          <button
            className="px-4 py-2 bg-secondary text-white rounded-md hover:opacity-90"
            onClick={() => download('txt')}
          >
            Download (.txt)
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:opacity-90"
            onClick={() => setContent('')}
          >
            Clear
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your privacy policy here..."
          className="w-full min-h-[60vh] p-4 rounded-lg bg-muted/60 border border-muted/40 resize-none font-mono"
        />

        <p className="text-sm text-muted-foreground mt-3">Tip: After pasting, you can download the file or copy it into `src/pages/Privacy_policy.tsx` to keep it in source control.</p>
      </div>
    </section>
  );
}
