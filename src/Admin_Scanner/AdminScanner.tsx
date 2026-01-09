import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, User, Calendar, MapPin, Clock, Search, UserCheck } from 'lucide-react';

// This component is for event staff to scan QR codes and check in attendees
const AdminEventScanner = ({ 
  eventId, 
  onCheckIn,
  supabaseClient // Pass your Supabase client
}) => {
  const [scanning, setScanning] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    pending: 0
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load event statistics
  useEffect(() => {
    loadStats();
    loadRecentCheckIns();
  }, [eventId]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('event_registrations')
        .select('check_in_status', { count: 'exact' })
        .eq('event_id', eventId);

      if (error) throw error;

      const total = data.length;
      const checkedIn = data.filter(r => r.check_in_status === 'checked_in').length;
      const pending = total - checkedIn;

      setStats({ total, checkedIn, pending });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentCheckIns = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('event_registrations_complete')
        .select('*')
        .eq('event_id', eventId)
        .eq('check_in_status', 'checked_in')
        .order('checked_in_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCheckIns(data || []);
    } catch (error) {
      console.error('Error loading recent check-ins:', error);
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearch.trim()) return;

    setLoading(true);
    try {
      // Search by registration ID, name, or email
      const { data, error } = await supabaseClient
        .from('event_registrations_complete')
        .select('*')
        .eq('event_id', eventId)
        .or(`registration_id.ilike.%${manualSearch}%,full_name.ilike.%${manualSearch}%,email.ilike.%${manualSearch}%`)
        .single();

      if (error) throw error;

      if (data) {
        setScanResult({
          success: true,
          registration: data
        });
      } else {
        setScanResult({
          success: false,
          message: 'No registration found'
        });
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: error.message || 'Registration not found'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (registrationId) => {
    setLoading(true);
    try {
      // Call the Supabase function to check in
      const { data, error } = await supabaseClient.rpc('check_in_attendee', {
        p_registration_id: registrationId
      });

      if (error) throw error;

      if (data.success) {
        setScanResult({
          success: true,
          message: 'Check-in successful!',
          registration: data.registration
        });
        
        // Reload stats and recent check-ins
        loadStats();
        loadRecentCheckIns();
        
        // Callback to parent component
        onCheckIn?.(data.registration);
        
        // Clear after 3 seconds
        setTimeout(() => {
          setScanResult(null);
          setManualSearch('');
        }, 3000);
      } else {
        setScanResult({
          success: false,
          message: data.message || 'Check-in failed'
        });
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: error.message || 'Check-in failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Cannot access camera. Please use manual search.');
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  return (
    <div style={styles.container}>
      {/* Header Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <User size={24} color="#71C4FF" />
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Registered</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <UserCheck size={24} color="#4ade80" />
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.checkedIn}</div>
            <div style={styles.statLabel}>Checked In</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} color="#fbbf24" />
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.pending}</div>
            <div style={styles.statLabel}>Pending</div>
          </div>
        </div>
      </div>

      {/* Scanner Section */}
      <div style={styles.scannerSection}>
        <h2 style={styles.sectionTitle}>Check-In Scanner</h2>
        
        {!scanning ? (
          <div style={styles.scannerPlaceholder}>
            <button onClick={startScanning} style={styles.startScanButton}>
              <Camera size={24} />
              <span>Start Camera Scanner</span>
            </button>
            <p style={styles.orText}>or use manual search below</p>
          </div>
        ) : (
          <div style={styles.videoContainer}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={styles.video}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button onClick={stopScanning} style={styles.stopScanButton}>
              Stop Scanner
            </button>
          </div>
        )}

        {/* Manual Search */}
        <div style={styles.manualSearch}>
          <input
            type="text"
            placeholder="Search by Registration ID, Name, or Email..."
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
            style={styles.searchInput}
          />
          <button 
            onClick={handleManualSearch} 
            style={styles.searchButton}
            disabled={loading}
          >
            <Search size={20} />
          </button>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div style={{
            ...styles.resultCard,
            backgroundColor: scanResult.success ? '#d1fae5' : '#fee2e2',
            borderColor: scanResult.success ? '#4ade80' : '#ef4444'
          }}>
            <div style={styles.resultHeader}>
              {scanResult.success ? (
                <CheckCircle size={32} color="#10b981" />
              ) : (
                <XCircle size={32} color="#ef4444" />
              )}
              <h3 style={styles.resultTitle}>
                {scanResult.success ? 'Registration Found' : 'Error'}
              </h3>
            </div>

            {scanResult.registration && (
              <div style={styles.registrationDetails}>
                <div style={styles.detailRow}>
                  <strong>Name:</strong> {scanResult.registration.full_name || scanResult.registration.name}
                </div>
                <div style={styles.detailRow}>
                  <strong>Email:</strong> {scanResult.registration.email}
                </div>
                <div style={styles.detailRow}>
                  <strong>Role:</strong> {scanResult.registration.role?.replace('_', ' ').toUpperCase()}
                </div>
                <div style={styles.detailRow}>
                  <strong>Registration ID:</strong> {scanResult.registration.registration_id}
                </div>
                <div style={styles.detailRow}>
                  <strong>Status:</strong> 
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: scanResult.registration.check_in_status === 'checked_in' ? '#4ade80' : '#fbbf24',
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    {scanResult.registration.check_in_status?.toUpperCase()}
                  </span>
                </div>

                {scanResult.registration.check_in_status !== 'checked_in' && (
                  <button
                    onClick={() => handleCheckIn(scanResult.registration.registration_id)}
                    style={styles.checkInButton}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Check In Now'}
                  </button>
                )}

                {scanResult.registration.check_in_status === 'checked_in' && (
                  <div style={styles.alreadyCheckedIn}>
                    ✓ Already checked in at {new Date(scanResult.registration.checked_in_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {scanResult.message && !scanResult.registration && (
              <p style={styles.resultMessage}>{scanResult.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Recent Check-ins */}
      <div style={styles.recentSection}>
        <h3 style={styles.sectionTitle}>Recent Check-ins</h3>
        <div style={styles.recentList}>
          {recentCheckIns.length === 0 ? (
            <p style={styles.emptyState}>No check-ins yet</p>
          ) : (
            recentCheckIns.map((checkIn) => (
              <div key={checkIn.id} style={styles.recentItem}>
                <div style={styles.recentAvatar}>
                  {checkIn.avatar_url ? (
                    <img src={checkIn.avatar_url} alt="" style={styles.avatarImage} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div style={styles.recentInfo}>
                  <div style={styles.recentName}>{checkIn.full_name || checkIn.name}</div>
                  <div style={styles.recentRole}>{checkIn.role?.replace('_', ' ')}</div>
                </div>
                <div style={styles.recentTime}>
                  {new Date(checkIn.checked_in_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px'
  },
  scannerSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1a1a1a'
  },
  scannerPlaceholder: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  startScanButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#71C4FF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  orText: {
    margin: '20px 0',
    color: '#666',
    fontSize: '14px'
  },
  videoContainer: {
    position: 'relative',
    marginBottom: '20px'
  },
  video: {
    width: '100%',
    maxWidth: '600px',
    borderRadius: '8px',
    display: 'block',
    margin: '0 auto'
  },
  stopScanButton: {
    display: 'block',
    margin: '12px auto 0',
    padding: '10px 24px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  manualSearch: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px'
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  searchButton: {
    padding: '12px 20px',
    backgroundColor: '#71C4FF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultCard: {
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
    marginTop: '20px'
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  resultTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600'
  },
  registrationDetails: {
    fontSize: '14px'
  },
  detailRow: {
    padding: '8px 0',
    borderBottom: '1px solid rgba(0,0,0,0.1)'
  },
  checkInButton: {
    width: '100%',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  alreadyCheckedIn: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#4ade80',
    color: 'white',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '600'
  },
  resultMessage: {
    margin: '12px 0 0',
    fontSize: '14px'
  },
  recentSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '20px'
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  recentAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  recentInfo: {
    flex: 1
  },
  recentName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#1a1a1a'
  },
  recentRole: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'capitalize'
  },
  recentTime: {
    fontSize: '12px',
    color: '#999'
  }
};

export default AdminEventScanner;