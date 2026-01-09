import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import './ui_CSS/ProfileCard.css';
import { Fingerprint, Activity, Lock, Linkedin, Github, Twitter, Globe, QrCode, CheckCircle, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';

const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)';

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180
};

const ROLE_THEMES = {
  judge: { gradient: 'linear-gradient(145deg, #FFD70080 0%, #FFA50080 100%)', border: '#FFD700' },
  participant: { gradient: 'linear-gradient(145deg, #60496e8c 0%, #71C4FF44 100%)', border: '#71C4FF' },
  volunteer: { gradient: 'linear-gradient(145deg, #4169E180 0%, #1E90FF80 100%)', border: '#4169E1' },
  instructor: { gradient: 'linear-gradient(145deg, #9370DB80 0%, #8A2BE280 100%)', border: '#9370DB' },
  executive_board: { gradient: 'linear-gradient(145deg, #FFD70080 0%, #FF8C0080 100%)', border: '#FFD700' },
  delegate: { gradient: 'linear-gradient(145deg, #2E8B5780 0%, #3CB37180 100%)', border: '#2E8B57' },
  chair: { gradient: 'linear-gradient(145deg, #DC143C80 0%, #FF6B6B80 100%)', border: '#DC143C' },
  vice_chair: { gradient: 'linear-gradient(145deg, #FF634780 0%, #FF8A6580 100%)', border: '#FF6347' }
};

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v, precision = 3) => parseFloat(v.toFixed(precision));
const adjust = (v, fMin, fMax, tMin, tMax) => round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));



const ProfileCardComponent = ({
  avatarUrl = '<Placeholder for avatar URL>',
  iconUrl = '<Placeholder for icon URL>',
  grainUrl = '<Placeholder for grain URL>',
  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,
  behindGlowSize,
  className = '',
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  miniAvatarUrl,
  name = 'Javi A. Torres',
  title = 'Software Engineer',
  handle = 'javicodes',
  status = 'Online',
  contactText = 'Contact',
  showUserInfo = true,
  onContactClick,
  // Reflective card props
  metalness = 1,
  roughness = 0.4,
  overlayColor = 'rgba(255, 255, 255, 0.1)',
  idCardName = 'ALEXANDER DOE',
  idCardRole = 'SENIOR DEVELOPER',
  idNumber = '8901-2345-6789',
  showIdCard = false,
  mode = 'personal',
  userData = {
    user_id: null,
    full_name: 'John Doe',
    handle: 'johndoe',
    bio: 'Software Engineer',
    avatar_url: null,
    phone: null,
    email: null,
    job_title: 'Senior Developer',
    company: 'Tech Corp',
    location: null,
    socials: {
      linkedin_url: null,
      github_url: null,
      twitter_url: null,
      instagram_url: null,
      portfolio_url: null
    }
  },
  eventRegistration = null,
  eventData = null,
}) => {
  const wrapRef = useRef(null);
  const shellRef = useRef(null);
  const [showQR, setShowQR] = useState(false);

  const enterTimerRef = useRef(null);
  const leaveRafRef = useRef(null);

const roleTheme = useMemo(() => {
  if (mode === 'event' && eventRegistration?.role) {
    return ROLE_THEMES[eventRegistration.role] || ROLE_THEMES.participant;
  }
  return { gradient: DEFAULT_INNER_GRADIENT, border: '#71C4FF' };
}, [mode, eventRegistration]);

const qrData = useMemo(() => {
  if (mode === 'event' && eventRegistration) {
    return JSON.stringify({
      user_id: userData.user_id,
      event_id: eventData?.id,
      registration_id: eventRegistration.registration_id,
      timestamp: new Date().toISOString()
    });
  } else {
    return userData.socials?.linkedin_url || `https://yourapp.com/profile/${userData.handle}`;
  }
}, [mode, userData, eventRegistration, eventData]);

  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null;

    let rafId = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x, y) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`
      };

      for (const [k, v] of Object.entries(properties)) wrap.style.setProperty(k, v);
    };

    const step = ts => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x, y) {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x, y) {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        const shell = shellRef.current;
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs) {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      }
    };
  }, [enableTilt]);

  const getOffsets = (evt, el) => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerEnter = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      shell.classList.add('active');
      shell.classList.add('entering');
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback(() => {
    const shell = shellRef.current;
    if (!shell || !tiltEngine) return;

    tiltEngine.toCenter();

    const checkSettle = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      const settled = Math.hypot(tx - x, ty - y) < 0.6;
      if (settled) {
        shell.classList.remove('active');
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  const handleDeviceOrientation = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(centerX + gamma * mobileTiltSensitivity, 0, shell.clientWidth);
      const y = clamp(
        centerY + (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * mobileTiltSensitivity,
        0,
        shell.clientHeight
      );

      tiltEngine.setTarget(x, y);
    },
    [tiltEngine, mobileTiltSensitivity]
  );

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;

    const shell = shellRef.current;
    if (!shell) return;

    const pointerMoveHandler = handlePointerMove;
    const pointerEnterHandler = handlePointerEnter;
    const pointerLeaveHandler = handlePointerLeave;
    const deviceOrientationHandler = handleDeviceOrientation;

    shell.addEventListener('pointerenter', pointerEnterHandler);
    shell.addEventListener('pointermove', pointerMoveHandler);
    shell.addEventListener('pointerleave', pointerLeaveHandler);

    const handleClick = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return;
      const anyMotion = window.DeviceMotionEvent;
      if (anyMotion && typeof anyMotion.requestPermission === 'function') {
        anyMotion
          .requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', deviceOrientationHandler);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', deviceOrientationHandler);
      }
    };
    shell.addEventListener('click', handleClick);

    const initialX = (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);

    return () => {
      shell.removeEventListener('pointerenter', pointerEnterHandler);
      shell.removeEventListener('pointermove', pointerMoveHandler);
      shell.removeEventListener('pointerleave', pointerLeaveHandler);
      shell.removeEventListener('click', handleClick);
      window.removeEventListener('deviceorientation', deviceOrientationHandler);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove('entering');
    };
  }, [
    enableTilt,
    enableMobileTilt,
    tiltEngine,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
    handleDeviceOrientation
  ]);

  const cardStyle = useMemo(
  () => ({
    '--icon': iconUrl ? `url(${iconUrl})` : 'none',
    '--grain': grainUrl ? `url(${grainUrl})` : 'none',
    '--inner-gradient': innerGradient || roleTheme.gradient, // CHANGED
    '--behind-glow-color': behindGlowColor ?? roleTheme.border, // CHANGED
    '--behind-glow-size': behindGlowSize ?? '50%',
    '--metalness': metalness, // ADD if missing
    '--roughness': roughness, // ADD if missing
    '--overlay-color': overlayColor, // ADD if missing
    '--text-color': 'white', // ADD
    '--role-border-color': roleTheme.border // ADD
  }),
  [iconUrl, grainUrl, innerGradient, behindGlowColor, behindGlowSize, metalness, roughness, overlayColor, roleTheme]
);

  const handleContactClick = useCallback(() => {
    onContactClick?.();
  }, [onContactClick]);

const renderEventCard = () => (
  <div className="pc-content reflective-content">
    {!showQR ? (
      <>
        <div className="card-header">
          <div className="security-badge" style={{ borderColor: roleTheme.border }}>
            <Lock size={14} className="security-icon" />
            <span>{eventData?.type?.toUpperCase() || 'EVENT'}</span>
          </div>
          <div className="status-badge">
            {eventRegistration?.check_in_status === 'checked_in' ? (
              <CheckCircle size={18} color="#4ade80" />
            ) : (
              <Clock size={18} color="#fbbf24" />
            )}
          </div>
        </div>

        <div className="inner-line" />

        <div className="card-body">
          <div className="user-info-event">
            <h2 className="user-name">{userData.full_name?.toUpperCase()}</h2>
            <p className="user-role" style={{ color: roleTheme.border }}>
              {eventRegistration?.role?.replace('_', ' ').toUpperCase()}
            </p>
            {eventRegistration?.committee && (
              <p className="user-committee">{eventRegistration.committee}</p>
            )}
            {eventRegistration?.position && eventRegistration.position !== 'delegate' && (
              <p className="user-position">{eventRegistration.position.toUpperCase()}</p>
            )}
            {eventRegistration?.country && (
              <p className="user-country">🌍 {eventRegistration.country}</p>
            )}
          </div>
        </div>

        <div className="inner-line" />

        <div className="card-footer">
          <div className="id-section">
            <span className="label">EVENT</span>
            <span className="value-small">{eventData?.title}</span>
            <span className="label" style={{ marginTop: '8px' }}>REG ID</span>
            <span className="value">{eventRegistration?.registration_id}</span>
          </div>
          <button 
            className="qr-button"
            onClick={() => setShowQR(true)}
            style={{ pointerEvents: 'auto' }}
          >
            <QrCode size={32} />
          </button>
        </div>
      </>
    ) : (
      <div className="qr-view">
        <button 
          className="back-button"
          onClick={() => setShowQR(false)}
          style={{ pointerEvents: 'auto' }}
        >
          ← Back
        </button>
        <div className="qr-container">
          <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}><QRCode value={qrData} size={220} /></div>
          <p className="qr-label">Scan for Check-in</p>
          <p className="qr-id">{eventRegistration?.registration_id}</p>
        </div>
      </div>
    )}
  </div>
);

const renderPersonalCard = () => (
  <div className="pc-content reflective-content">
    {!showQR ? (
      <>
        <div className="card-header">
          <div className="security-badge">
            <Fingerprint size={14} className="security-icon" />
            <span>DIGITAL CARD</span>
          </div>
          <Activity className="status-icon" size={20} />
        </div>

        <div className="inner-line" />

        <div className="card-body">
          {userData.avatar_url && (
            <img 
              src={userData.avatar_url} 
              alt={userData.full_name}
              className="personal-avatar"
            />
          )}
          <div className="user-info-personal">
            <h2 className="user-name">{userData.full_name}</h2>
            </div>
            {userData.job_title && (
              <p className="user-role">{userData.job_title}</p>
            )}
            {/* {userData.company && (
              <p className="user-company">{userData.company}</p>
            )} */}
          

          <div className="social-links">
            {userData.socials?.linkedin_url && (
              <a href={userData.socials.linkedin_url} className="social-icon" style={{ pointerEvents: 'auto' }}>
                <Linkedin size={20} />
              </a>
            )}
            {userData.socials?.github_url && (
              <a href={userData.socials.github_url} className="social-icon" style={{ pointerEvents: 'auto' }}>
                <Github size={20} />
              </a>
            )}
            {userData.socials?.twitter_url && (
              <a href={userData.socials.twitter_url} className="social-icon" style={{ pointerEvents: 'auto' }}>
                <Twitter size={20} />
              </a>
            )}
            {userData.socials?.portfolio_url && (
              <a href={userData.socials.portfolio_url} className="social-icon" style={{ pointerEvents: 'auto' }}>
                <Globe size={20} />
              </a>
            )}
          </div>
        </div>

        <div className="inner-line" />

        <div className="card-footer">
  <div className="id-section">
    <span className="label">USER ID</span>
    <span className="value">{userData.user_id || 'N/A'}</span>
  </div>
  <button 
    className="qr-button"
    onClick={() => setShowQR(true)}
    style={{ pointerEvents: 'auto' }}
  >
    <QrCode size={28} />
  </button>
</div>
      </>
    ) : (
      <div className="qr-view">
        <button 
          className="back-button"
          onClick={() => setShowQR(false)}
          style={{ pointerEvents: 'auto' }}
        >
          ← Back
        </button>
        <div className="qr-container">
          <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}><QRCode value={qrData} size={220} /></div>
          <p className="qr-label">Connect with me</p>
          <p className="qr-sublabel">Scan to view profile</p>
        </div>
      </div>
    )}
  </div>
);

  return (
    <div ref={wrapRef} className={`pc-card-wrapper ${className}`.trim()} style={cardStyle}>
      {behindGlowEnabled && <div className="pc-behind" />}
      <div ref={shellRef} className="pc-card-shell">
        <section className="pc-card">
          <div className="pc-inside">
  <div className="reflective-noise" />
  <div className="reflective-sheen" />
  <div className="reflective-border" style={{ borderColor: roleTheme.border }} />
  
  <div className="pc-shine" />
  <div className="pc-glare" />
  
  {mode === 'event' ? renderEventCard() : renderPersonalCard()}
</div>
        </section>
      </div>
    </div>
  );
};

const ProfileCard = React.memo(ProfileCardComponent);
export default ProfileCard;