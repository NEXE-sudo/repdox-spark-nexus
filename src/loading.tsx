export default function Loading() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9998,
      height: '3px',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
    }}>
      <div style={{
        height: '100%',
        backgroundColor: '#8B5CF6',
        animation: 'progress 2s ease-out infinite',
        transformOrigin: 'left',
      }} />
      
      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          90% { transform: scaleX(0.9); }
          100% { transform: scaleX(0.9); }
        }
      `}</style>
    </div>
  );
}