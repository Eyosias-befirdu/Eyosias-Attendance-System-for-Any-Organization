import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';


// ─────────────────────────────────────────────────────────────────────────────
// KEY BUG FIX (applies to all 3 components below):
//   When a <video> element is inside a conditional branch, its ref is null
//   during the getUserMedia callback because React hasn't rendered the
//   <video> yet.  We fix this by:
//   1. Always keeping the <video> in the DOM (just hide it when inactive).
//   2. Using a useEffect that watches the stream state and assigns srcObject
//      AFTER React has committed the new render.
// ─────────────────────────────────────────────────────────────────────────────

// ── IP Camera Card (dual mode: MJPEG proxy OR local webcam) ──────────────────
export const IPCameraStream = ({ camera }) => {
  const [mode, setMode] = useState('ip');
  const [recognition, setRecognition] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [webcamStream, setWebcamStream] = useState(null);

  const streamUrl = `${API_BASE}/api/cameras/${camera.id}/stream?k=${streamKey}`;

  // ✅ FIX: assign srcObject in effect, AFTER React renders <video>
  useEffect(() => {
    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  const startWebcam = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: true });
      setMode('webcam');       // trigger re-render so <video> is visible
      setWebcamStream(ms);     // effect above assigns srcObject after render
    } catch (e) {
      alert('Cannot access webcam: ' + e.message);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setMode('ip');
    setStreamKey(k => k + 1);
  };

  const scanWebcamFrame = () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;
    setScanning(true);
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 360;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(async (blob) => {
      const fd = new FormData();
      fd.append('file', blob, 'frame.jpg');
      try {
        const r = await fetch(`${API_BASE}/api/attendance/face?camera_id=${camera.id}`, { method: 'POST', body: fd });
        const d = await r.json();
        setRecognition(d);
        if (d.status === 'success') setTimeout(() => setRecognition(null), 5000);
      } catch (e) { setRecognition({ status: 'error', message: 'Network error' }); }
      setScanning(false);
    }, 'image/jpeg');
  };

  const scanIPFrame = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const r = await fetch(`${API_BASE}/api/cameras/${camera.id}/snapshot`, { method: 'POST' });
      const d = await r.json();
      setRecognition(d);
      if (d.status === 'success') setTimeout(() => setRecognition(null), 5000);
    } catch (e) { setRecognition({ status: 'error', message: 'Network error' }); }
    setScanning(false);
  };

  const doScan = mode === 'webcam' ? scanWebcamFrame : scanIPFrame;

  useEffect(() => {
    let interval;
    if (autoScan) interval = setInterval(doScan, 5000);
    return () => clearInterval(interval);
  }, [autoScan, mode, webcamStream]);

  useEffect(() => () => { if (webcamStream) webcamStream.getTracks().forEach(t => t.stop()); }, []);

  return (
    <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}>{camera.name}</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📍 {camera.location}</span>
        </div>
        <span style={{ fontSize: '0.7rem', padding: '2px 10px', borderRadius: '20px', color: 'white', fontWeight: 'bold', background: mode === 'webcam' ? '#3b82f6' : '#10b981' }}>
          {mode === 'webcam' ? '🎥 WEBCAM' : '📡 IP CAM'}
        </span>
      </div>

      {/* Stream area — video is ALWAYS in DOM, just toggled visible */}
      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#0a0a14', minHeight: '200px' }}>
        {/* MJPEG proxy img (IP mode) */}
        <img
          key={streamKey}
          src={streamUrl}
          alt={`${camera.name} live feed`}
          style={{ width: '100%', display: mode === 'ip' ? 'block' : 'none', borderRadius: '10px' }}
        />

        {/* Webcam video — always rendered so ref is always valid */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', borderRadius: '10px', display: mode === 'webcam' ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Live badge */}
        <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '7px', height: '7px', background: '#10b981', borderRadius: '50%' }} />
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>LIVE</span>
        </div>

        {recognition?.status === 'success' && (
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', background: 'rgba(16,185,129,0.93)', borderRadius: '6px', padding: '0.5rem 0.75rem', backdropFilter: 'blur(4px)' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: 'white', fontSize: '0.85rem' }}>✅ {recognition.user}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)' }}>Confidence: {(recognition.similarity * 100).toFixed(1)}%</p>
          </div>
        )}
        {recognition?.status === 'error' && (
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', background: 'rgba(239,68,68,0.88)', borderRadius: '6px', padding: '0.4rem 0.75rem' }}>
            <p style={{ margin: 0, color: 'white', fontSize: '0.8rem' }}>⚠️ {recognition.message}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={doScan} disabled={scanning || (mode === 'webcam' && !webcamStream)}
          style={{ flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontSize: '0.8rem', opacity: scanning ? 0.6 : 1 }}>
          {scanning ? '⏳ Scanning…' : '🔍 Scan Face'}
        </button>
        {mode === 'ip' ? (
          <button onClick={startWebcam} style={{ flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>🎥 Use Webcam</button>
        ) : (
          <button onClick={stopWebcam} style={{ flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>⏹ Stop Webcam</button>
        )}
        <button onClick={() => setAutoScan(v => !v)}
          style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: autoScan ? '#10b981' : 'transparent', color: autoScan ? 'white' : 'var(--text-muted)', border: `1px solid ${autoScan ? '#10b981' : 'var(--border-color)'}` }}>
          {autoScan ? '⏹ Auto OFF' : '▶ Auto'}
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.65rem', color: '#444', wordBreak: 'break-all' }}>{camera.stream_url}</p>
    </div>
  );
};


// ── Dual Camera capture widget (used in Registration form) ─────────────────────────
export const CameraCaptureComponent = ({ cameraId, onCapture, buttonText }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  useEffect(() => {
    if (videoRef.current && !cameraId) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream, cameraId]);

  useEffect(() => {
    if (cameraId && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [cameraId]);

  const startVideo = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(ms);
    } catch (err) {
      alert('Could not access webcam: ' + err.message);
    }
  };

  const stopVideo = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const captureFrame = async () => {
    setCapturing(true);
    try {
      if (!cameraId) {
        // Webcam Capture
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        c.toBlob((blob) => {
          onCapture(new File([blob], 'registration_capture.jpg', { type: 'image/jpeg' }));
          stopVideo();
        }, 'image/jpeg');
      } else {
        // IP Camera snapshot capture via backend transformation
        // Note: The backend doesn't have a direct "file" return for snapshot, 
        // so we fetch the stream frame or ask backend to provide it as a file.
        // For simplicity, we'll fetch a frame from the stream proxy via fetch if possible,
        // or just use the stream URL to an offscreen canvas.
        
        // Simpler: fetch the current frame from the MJPEG stream via a temporary img
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `${API_BASE}/api/cameras/${cameraId}/stream?k=${Date.now()}`;
        img.onload = () => {
          const c = canvasRef.current;
          c.width = img.width;
          c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob((blob) => {
            onCapture(new File([blob], `cam_${cameraId}_capture.jpg`, { type: 'image/jpeg' }));
          }, 'image/jpeg');
        };
      }
    } catch (e) {
      console.error(e);
      alert('Capture failed');
    } finally {
      setCapturing(false);
    }
  };

  const streamUrl = cameraId ? `${API_BASE}/api/cameras/${cameraId}/stream?k=${streamKey}` : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--primary-color)', background: '#000', minHeight: '225px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {cameraId ? (
          <img src={streamUrl} alt="Camera view" style={{ width: '100%' }} onError={() => setStreamKey(k => k + 1)} />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: stream ? 'block' : 'none' }} />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {cameraId && <div className="badge primary" style={{ position: 'absolute', top: 10, left: 10, fontSize: '0.7rem' }}>IP CAM ACTIVE</div>}
        {!cameraId && stream && <div className="badge success" style={{ position: 'absolute', top: 10, left: 10, fontSize: '0.7rem' }}>WEBCAM ACTIVE</div>}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {!cameraId && !stream ? (
          <button type="button" onClick={startVideo} className="badge primary" style={{ cursor: 'pointer', padding: '0.6rem 1.5rem', fontSize: '0.9rem', border: 'none' }}>
            🎥 Start Webcam
          </button>
        ) : (
          <>
            <button type="button" onClick={captureFrame} disabled={capturing}
              style={{ background: '#10b981', padding: '0.6rem 1.5rem', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {capturing ? '⌛ Capturing...' : (buttonText || 'Capture Registration Photo')}
            </button>
            {!cameraId && (
              <button type="button" onClick={stopVideo}
                style={{ background: '#ef4444', padding: '0.6rem 1.5rem', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};


// ── Dashboard live stream with background face detection ──────────────────────
export const LiveDashboardFeed = ({ cameraId }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [webcamStream, setWebcamStream] = useState(null);
  const [latestRecognition, setLatestRecognition] = useState(null);
  const [streamKey, setStreamKey] = useState(0);

  // Sync webcam stream to video element
  useEffect(() => {
    if (videoRef.current && !cameraId) {
      videoRef.current.srcObject = webcamStream || null;
    }
  }, [webcamStream, cameraId]);

  // Reset/Cleanup webcam when switching to IP or unmounting
  useEffect(() => {
    if (cameraId && webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null);
    }
    return () => {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraId]);

  const startWebcam = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(ms);
    } catch (err) {
      console.error('Webcam error:', err);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
  };

  // Background face-recognition loop
  useEffect(() => {
    const runRecognition = async () => {
      if (!cameraId) {
        // Webcam mode
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || !webcamStream || v.videoWidth === 0) return;

        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        c.toBlob(async (blob) => {
          const fd = new FormData();
          fd.append('file', blob, 'live_dash.jpg');
          try {
            const r = await fetch('${API_BASE}/api/attendance/face', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.status === 'success') {
              setLatestRecognition(d);
              setTimeout(() => setLatestRecognition(null), 4000);
            }
          } catch (e) { /* skip */ }
        }, 'image/jpeg');
      } else {
        // IP Camera mode
        try {
          const r = await fetch(`${API_BASE}/api/cameras/${cameraId}/snapshot`, { method: 'POST' });
          const d = await r.json();
          if (d.status === 'success') {
            setLatestRecognition(d);
            setTimeout(() => setLatestRecognition(null), 4000);
          }
        } catch (e) { /* skip */ }
      }
    };

    const interval = setInterval(runRecognition, 3500);
    return () => clearInterval(interval);
  }, [cameraId, webcamStream]);

  const streamUrl = cameraId ? `${API_BASE}/api/cameras/${cameraId}/stream?k=${streamKey}` : null;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', background: 'rgba(5, 5, 15, 0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>
            {cameraId ? 'IP Camera Analytic Feed' : 'Neural Webcam Analytics'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-time biometric scanning enabled
          </p>
        </div>
        {!cameraId && (
          !webcamStream ? (
            <button onClick={startWebcam} className="badge primary" style={{ cursor: 'pointer', border: 'none' }}>Connect Webcam</button>
          ) : (
            <button onClick={stopWebcam} className="badge danger" style={{ cursor: 'pointer', border: 'none', background: '#ef4444' }}>Disconnect</button>
          )
        )}
      </div>

      <div style={{ position: 'relative', minHeight: '300px', background: '#000', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {cameraId ? (
          <img
            src={streamUrl}
            alt="Live feed"
            style={{ width: '100%', borderRadius: '12px' }}
            onError={() => setStreamKey(k => k + 1)}
          />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width: '100%', borderRadius: '12px', display: webcamStream ? 'block' : 'none' }} />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
          AI SCANNING ACTIVE
        </div>

        {latestRecognition && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', background: 'rgba(16,185,129,0.92)', padding: '1rem', borderRadius: '10px', color: 'white', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Neural IDs Verified ({latestRecognition.count})</span>
                <span style={{ fontSize: '0.7rem' }}>Matched AI Hub</span>
              </div>
              {latestRecognition.matches.map((match, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>✅ {match.user}</h4>
                  <span style={{ fontSize: '0.85rem' }}>{(match.similarity * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!cameraId && !webcamStream && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📷</p>
            <p>Webcam stream is offline. Click <strong>Connect Webcam</strong> or select an <strong>IP Camera</strong> above.</p>
          </div>
        )}
      </div>
    </div>
  );
};
