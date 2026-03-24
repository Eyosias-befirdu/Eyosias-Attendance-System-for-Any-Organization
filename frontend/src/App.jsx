import React, { useState, useEffect } from 'react';
import './index.css';
import { LiveDashboardFeed, CameraCaptureComponent, IPCameraStream } from './LiveCamera';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.CLIENT_KEY || import.meta.env.VITE_CLIENT_KEY || 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  }, [isDarkMode]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav className="sidebar glass-panel">
        <div className="brand gradient-text">Eyosias System</div>
        <ul className="nav-links">
          <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </li>
          <li className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            User Registration
          </li>
          <li className={`nav-item ${activeTab === 'cameras' ? 'active' : ''}`} onClick={() => setActiveTab('cameras')}>
            Camera Network
          </li>
          <li className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            Attendance Logs
          </li>
          <li className={`nav-item ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>
            Face Verification
          </li>
          <li className={`nav-item ${activeTab === 'persons' ? 'active' : ''}`} onClick={() => setActiveTab('persons')}>
            👤 Registered Persons
          </li>
          <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Personnel Services</div>
          <li className={`nav-item ${activeTab === 'portal' ? 'active' : ''}`} onClick={() => setActiveTab('portal')}>
            🏢 My Personal Portal
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <h1 className="page-title gradient-text">
            Eyosias Attendance System for Any Organization
          </h1>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--text-main)', transition: 'all 0.3s' }}
              title="Toggle Neural Clarity (Light/Dark Mode)"
            >
              {isDarkMode ? '🌙' : '☀️'}
            </button>
            <span className="badge primary">System Admin</span>
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'users' && <UserRegistration />}
        {activeTab === 'cameras' && <CameraManagement />}
        {activeTab === 'logs' && <AttendanceLogs />}
        {activeTab === 'verification' && <FaceVerification />}
        {activeTab === 'persons' && <RegisteredPersons />}
        {activeTab === 'portal' && <PersonnelPortal />}
      </main>
    </div>
  );
}

// Subcomponents
function Dashboard() {
  const [stats, setStats] = useState({ users: 0, presentToday: 0, cameras: 0, unknownToday: 0 });
  const [cameras, setCameras] = useState([]);
  const [selectedCamId, setSelectedCamId] = useState('webcam');

  useEffect(() => {
    const load = async () => {
      try {
        const [usersR, attendR, camsR] = await Promise.all([
          fetch(`${API_BASE}/api/users`),
          fetch(`${API_BASE}/api/attendance`),
          fetch(`${API_BASE}/api/cameras`),
        ]);
        const users    = usersR.ok    ? await usersR.json()    : [];
        const logs     = attendR.ok   ? await attendR.json()   : [];
        const camsData = camsR.ok     ? await camsR.json()     : [];

        const today = new Date().toDateString();
        const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
        const uniqueToday = new Set(todayLogs.filter(l => l.user_name !== 'Unknown').map(l => l.user_name));
        const unknownCount = todayLogs.filter(l => l.user_name === 'Unknown').length;

        setStats({
          users: users.length,
          presentToday: uniqueToday.size,
          cameras: camsData.length,
          unknownToday: unknownCount,
        });
        setCameras(camsData);
      } catch (e) { console.error(e); }
    };
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  const selectedCamera = cameras.find(c => c.id === selectedCamId);

  return (
    <div className="dashboard">
      {/* ── Live Stats ── */}
      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <h3 className="stat-title">Total Registered</h3>
          <div className="stat-value">{stats.users.toLocaleString()}</div>
        </div>
        <div className="stat-card glass-panel">
          <h3 className="stat-title">Present Today</h3>
          <div className="stat-value gradient-text">{stats.presentToday}</div>
        </div>
        <div className="stat-card glass-panel">
          <h3 className="stat-title">Active Cameras</h3>
          <div className="stat-value text-success">{stats.cameras}</div>
        </div>
        <div className="stat-card glass-panel">
          <h3 className="stat-title">Unknown Attempts</h3>
          <div className="stat-value text-danger">{stats.unknownToday}</div>
        </div>
      </div>

      {/* ── Camera Picker + Stream ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
            📡 Live Recognition Stream
          </h3>
          {/* Camera selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Select Source:</label>
            <select
              value={selectedCamId}
              onChange={e => setSelectedCamId(e.target.value === 'webcam' ? 'webcam' : Number(e.target.value))}
              style={{ background: 'var(--bg-card, #1a1a2e)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="webcam">🎥 Local Webcam</option>
              {cameras.map(c => (
                <option key={c.id} value={c.id}>📡 {c.name} — {c.location}</option>
              ))}
            </select>
          </div>
        </div>

        <LiveDashboardFeed cameraId={selectedCamId === 'webcam' ? null : selectedCamId} />
      </div>
    </div>
  );
}

function UserRegistration() {
  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'Male',
    dob: '',
    address: '',
    phone_number: '',
    email: '',
    department: 'IT',
    role: 'Employee'
  });
  const [submitStatus, setSubmitStatus] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamId, setSelectedCamId] = useState('webcam');

  useEffect(() => {
    fetch(`${API_BASE}/api/cameras`)
      .then(r => r.json())
      .then(data => setCameras(data))
      .catch(e => console.error(e));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('Processing...');
    
    try {
      const resp = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setCreatedUser(data);
        
        if (photo) {
           setSubmitStatus('Encoding Face Topology...');
           const fd = new FormData();
           fd.append("file", photo);
           const uploadResp = await fetch(`${API_BASE}/api/users/embedding/${data.id}`, {
              method: 'POST',
              body: fd
           });
           
           if (!uploadResp.ok) {
               const errData = await uploadResp.json();
               setSubmitStatus(`Partial Success: User created, but face upload failed (${errData.detail || 'No face detected'}).`);
               return;
           }
        }
        setSubmitStatus('Success! Identity & Neural Data Saved.');
      } else {
        const err = await resp.json();
        setSubmitStatus(`Error: ${err.detail}`);
      }
    } catch (err) {
      setSubmitStatus(`Network Error: ${err.message}`);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Gender</label>
          <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="text" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Department</label>
          <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}>
            <option>IT</option>
            <option>HR</option>
            <option>Operations</option>
            <option>Finance</option>
          </select>
        </div>
        <div className="form-group">
          <label>Role</label>
          <input type="text" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
        </div>
        
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Neural Reference Picture (Upload or Live Capture)</label>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
               <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--primary-color)', cursor: 'pointer', flex: 1 }} />
               
               <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Source:</label>
                  <select 
                    value={selectedCamId} 
                    onChange={e => setSelectedCamId(e.target.value === 'webcam' ? 'webcam' : Number(e.target.value))}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.8rem' }}
                  >
                    <option value="webcam">Webcam</option>
                    {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
              <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
              <span>OR LIVE CAPTURE</span>
              <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
            </div>

            <CameraCaptureComponent 
              cameraId={selectedCamId === 'webcam' ? null : selectedCamId} 
              onCapture={(file) => setPhoto(file)} 
              buttonText="Capture Registration Photo" 
            />
            
            {photo && <p style={{ color: 'var(--success)', textAlign: 'center', fontWeight: 'bold', margin: 0 }}>📸 Photo ready: {photo.name}</p>}
          </div>
        </div>
        
        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <button type="submit">Register & Generate ID</button>
          {submitStatus && <p style={{ marginTop: '1rem', color: submitStatus.startsWith('Error') || submitStatus.startsWith('Partial') ? 'var(--danger)' : 'var(--success)' }}>{submitStatus}</p>}
        </div>
      </form>

      {createdUser && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: 'var(--primary-color)' }}>Registration Successful!</h3>
            <p style={{ marginTop: '0.5rem' }}><strong>Unique ID:</strong> {createdUser.unique_id}</p>
            <p><strong>Name:</strong> {createdUser.full_name}</p>
          </div>
          {createdUser.qr_code_data && (
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Automated Identity Token</p>
                <img src={`data:image/png;base64,${createdUser.qr_code_data}`} alt="QR Code" style={{ width: '120px', borderRadius: '8px' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CameraManagement() {
  const [cameras, setCameras] = useState([]);
  
  const fetchCameras = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/cameras`);
      if (resp.ok) {
        setCameras(await resp.json());
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  return (
    <div>
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Register New IP Camera</h3>
        <form className="form-grid" onSubmit={async (e) => {
          e.preventDefault();
          const formData = {
              name: e.target.name.value,
              stream_url: e.target.stream_url.value,
              location: e.target.location.value
          };
          await fetch(`${API_BASE}/api/cameras`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });
          e.target.reset();
          fetchCameras();
        }}>
          <div className="form-group">
            <label>Camera Name</label>
            <input type="text" name="name" required placeholder="e.g. Main Gate Cam" />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" name="location" required placeholder="e.g. Entrance A" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Stream URL (RTSP/HTTP)</label>
            <input type="text" name="stream_url" required placeholder="rtsp://admin:pass@192.168.1.100:554/stream1" />
          </div>
          <button type="submit">Add Device to Network</button>
        </form>
      </div>

      {/* Registered Camera Live Feed Grid */}
      {cameras.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '1.2rem', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Streams</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {cameras.map(cam => (
              <IPCameraStream key={cam.id} camera={cam} />
            ))}
          </div>
        </div>
      )}

      {/* Camera Table */}
      <div className="glass-panel table-container" style={{ marginTop: '2rem' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Stream URL</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map(cam => (
              <tr key={cam.id}>
                <td>{cam.id}</td>
                <td>{cam.name}</td>
                <td>{cam.location}</td>
                <td><code style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{cam.stream_url}</code></td>
                <td><span className="badge success">{cam.status}</span></td>
              </tr>
            ))}
            {cameras.length === 0 && (
                <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No cameras found on network.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/attendance`);
        if (resp.ok) setLogs(await resp.json());
      } catch (e) { console.error(e); }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const exportToCSV = () => {
    const headers = ["Time", "Personnel Identity", "Department", "Captured At", "Method"];
    const csvRows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user_name,
      log.department,
      log.location,
      log.method
    ].join(","));
    
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={exportToCSV} className="badge primary" style={{ cursor: 'pointer', border: 'none', padding: '0.8rem 1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📊 Export Full Dataset (CSV)
        </button>
      </div>
      <div className="glass-panel table-container">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Personnel Identity</th>
            <th>Department</th>
            <th>Captured At</th>
            <th>Method</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i}>
              <td>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
              <td style={{ fontWeight: '500' }}>{log.user_name}</td>
              <td>{log.department}</td>
              <td>{log.location}</td>
              <td>
                <span className={`badge ${log.method === 'Face' ? 'primary' : 'success'}`}>
                  {log.method} Verification
                </span>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
             <tr>
                 <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Standing by for neural verification...</td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}



function FaceVerification() {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    if (e.target.files.length === 0) return;
    setStatus('Analyzing facial architecture...');
    setResult(null);

    const fd = new FormData();
    fd.append("file", e.target.files[0]);
    
    try {
      const resp = await fetch(`${API_BASE}/api/attendance/face`, {
        method: 'POST',
        body: fd
      });
      const data = await resp.json();
      if (data.status === 'success') {
          setResult(data);
          setStatus(null);
      } else {
          setStatus(`Verification Failed: ${data.message || 'Unknown Identity'}`);
      }
    } catch (err) {
       setStatus(`Network Error: ${err.message}`);
    }
    
    // reset input so you can upload same file again
    e.target.value = null;
  };

  return (
    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
       <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '2rem' }}>Access Control Terminal</h2>
       <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem' }}>Initiate manual neural scan to verify identity and mark attendance.</p>
       
       <div style={{ marginBottom: '2.5rem' }}>
          <label className="badge primary" style={{ cursor: 'pointer', padding: '1rem 3rem', fontSize: '1.2rem', boxShadow: '0 4px 20px var(--primary-glow)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px' }}>
            <span style={{ fontSize: '1.5rem' }}>📷</span> Initialize Scan 
            {/* The 'capture' attribute enables camera natively on mobile devices */}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} capture="user" />
          </label>
       </div>
       
       {status && <p style={{ color: 'var(--text-muted)' }}>{status}</p>}
       
       {result && (
         <div className="glass-panel" style={{ padding: '2rem 4rem', display: 'inline-block', border: '1px solid var(--success)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))', marginTop: '1rem' }}>
            <h3 style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '1.5rem' }}>ACCESS GRANTED</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', letterSpacing: '1px', marginBottom: '0.5rem' }}>{result.user}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Neural Confidence Level: {(result.similarity * 100).toFixed(1)}%</p>
         </div>
       )}
    </div>
  );
}

// ── Registered Persons Directory ─────────────────────────────────────────────
function RegisteredPersons() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/users`);
        if (resp.ok) setUsers(await resp.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.unique_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.3rem' }}>🔍</span>
        <input
          type="text"
          placeholder="Search by name, ID, or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', color: 'var(--text-main)' }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {filtered.length} / {users.length} persons
        </span>
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading registry…</p>}

      {/* Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.4rem' }}>
        {filtered.map(user => (
          <div
            key={user.id}
            className="glass-panel"
            onClick={() => setSelectedUser(user)}
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            {/* Quick Print Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                generateIDCard(user);
              }}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '4px', color: 'var(--primary-color)', fontSize: '0.7rem', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}
            >
              🖨️ ID CARD
            </button>
            {/* Accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))' }} />

            {/* Avatar initials */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1.3rem', color: 'white', flexShrink: 0
              }}>
                {user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.full_name}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {user.role} · {user.department}
                </p>
              </div>
            </div>

            {/* Unique ID chip */}
            {user.unique_id && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--primary-color)', borderRadius: '20px', padding: '0.28rem 0.8rem', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.7rem' }}>🪪</span>
                <code style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: '600', letterSpacing: '0.05em' }}>{user.unique_id}</code>
              </div>
            )}

            {/* Info pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
              <span className="badge success" style={{ fontSize: '0.72rem' }}>🚹 {user.gender}</span>
              {user.dob && <span className="badge primary" style={{ fontSize: '0.72rem' }}>🎂 {user.dob}</span>}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.7rem', marginBottom: 0 }}>Click to view full profile →</p>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔍</p>
            <p>No persons match your search.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="glass-panel"
            style={{ padding: '2.5rem', maxWidth: '520px', width: '100%', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedUser(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
            >✕</button>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Left: QR */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                {selectedUser.qr_code_data
                  ? <img src={`data:image/png;base64,${selectedUser.qr_code_data}`} alt="QR" style={{ width: '110px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                  : <div style={{ width: '110px', height: '110px', background: 'var(--bg-card)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No QR</div>
                }
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Identity Token</p>
              </div>

              {/* Right: Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '1.1rem', color: 'white', flexShrink: 0
                  }}>
                    {selectedUser.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem' }}>{selectedUser.full_name}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{selectedUser.role}</p>
                  </div>
                </div>

                {selectedUser.unique_id && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--primary-color)', borderRadius: '20px', padding: '0.3rem 0.9rem', margin: '0.6rem 0' }}>
                    <span style={{ fontSize: '0.75rem' }}>🪪</span>
                    <code style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: '700' }}>{selectedUser.unique_id}</code>
                  </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.8rem', fontSize: '0.85rem' }}>
                  <tbody>
                    {[
                      ['Department', selectedUser.department],
                      ['Gender', selectedUser.gender],
                      ['Date of Birth', selectedUser.dob],
                      ['Phone', selectedUser.phone_number],
                      ['Email', selectedUser.email],
                      ['Address', selectedUser.address],
                    ].map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</td>
                        <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontWeight: '500', wordBreak: 'break-all' }}>{value || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Identity Card Rendering Engine ───────────────────────────────────────────
function generateIDCard(user) {
  const win = window.open('', '_blank');
  const primaryColor = '#3b82f6';
  
  win.document.write(`
    <html>
      <head>
        <title>Identity Card - ${user.full_name}</title>
        <style>
          body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5; }
          .id-card { width: 350px; height: 500px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); position: relative; overflow: hidden; }
          .header { height: 120px; background: linear-gradient(135deg, ${primaryColor}, #8b5cf6); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
          .photo-area { width: 130px; height: 130px; border-radius: 50%; border: 5px solid white; background: #eee; position: absolute; top: 55px; left: 110px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: bold; color: ${primaryColor}; }
          .content { margin-top: 80px; padding: 20px; text-align: center; }
          .name { font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin: 10px 0 5px 0; }
          .id-number { font-size: 0.9rem; color: ${primaryColor}; font-weight: bold; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 10px; }
          .info-item label { font-size: 0.7rem; text-transform: uppercase; color: #6b7280; font-weight: bold; }
          .info-item p { font-size: 0.85rem; color: #111827; margin: 2px 0 0 0; font-weight: bold; }
          .footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 15px; background: #f3f4f6; display: flex; align-items: center; gap: 15px; }
          .qr-token { width: 60px; height: 60px; }
          .sys-brand { font-size: 0.65rem; color: #9ca3af; flex: 1; }
          @media print { body { background: white; } .id-card { box-shadow: none; border: 1px solid #ddd; } }
        </style>
      </head>
      <body>
        <div class="id-card">
          <div class="header">
            <h2 style="margin:0; font-size:1.1rem">EYOSIAS SYSTEM</h2>
            <p style="margin:0; font-size:0.6rem; opacity:0.8">GENERIC IDENTITY CLEARANCE</p>
          </div>
          <div class="photo-area">${user.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}</div>
          <div class="content">
            <div class="name">${user.full_name}</div>
            <div class="id-number">${user.unique_id}</div>
            <div class="info-grid">
              <div class="info-item">
                <label>Department</label>
                <p>${user.department}</p>
              </div>
              <div class="info-item">
                <label>Role</label>
                <p>${user.role}</p>
              </div>
              <div class="info-item">
                <label>Authorized</label>
                <p>${new Date().getFullYear()}</p>
              </div>
              <div class="info-item">
                <label>Security</label>
                <p>LEVEL 4</p>
              </div>
            </div>
          </div>
          <div class="footer">
            <div class="sys-brand">Automated Verification Token<br />Neural ID Verified System</div>
            ${user.qr_code_data ? `<img class="qr-token" src="data:image/png;base64,${user.qr_code_data}" />` : ''}
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
    </html>
  `);
  win.document.close();
}

// ── Personnel Portal Component ──────────────────────────────────────────────
function PersonnelPortal() {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idInput, setIdInput] = useState('');

  const handleLookup = async (idValue) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/users/lookup/${idValue}`);
      if (resp.ok) {
        setUserData(await resp.json());
      } else {
        const err = await resp.json();
        setError(err.detail || 'Identity lookup failed.');
      }
    } catch (e) {
      setError('Connection refused. Is the Neural Hub online?');
    } finally {
      setLoading(false);
    }
  };

  const logoutPortal = () => {
    setUserData(null);
    setIdInput('');
  };

  if (userData) {
    const { user, logs } = userData;
    return (
      <div className="portal-dashboard">
        {/* User Profile Header */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(0,0,0,0))' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', fontWeight: 'bold' }}>
              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Welcome, {user.full_name}</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0' }}>{user.role} • {user.department}</p>
              <span className="badge success">Verified Personnel</span>
            </div>
          </div>
          <button onClick={logoutPortal} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.6rem 1.2rem', cursor: 'pointer', borderRadius: '8px' }}>
            Logout 🔒
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
          {/* Recent Activity */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🕒 Neural Scan History ({logs.length})</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Method</th>
                    <th>Node</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((L, i) => (
                    <tr key={i}>
                      <td>{new Date(L.timestamp).toLocaleString()}</td>
                      <td><span className="badge primary">{L.method}</span></td>
                      <td>{L.location || 'Local Terminal'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No attendance history found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Info & Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>IDENTITY TOKEN</h4>
                <div style={{ textAlign: 'center' }}>
                  {user.qr_code_data ? (
                    <img src={`data:image/png;base64,${user.qr_code_data}`} style={{ width: '100%', maxWidth: '200px', borderRadius: '12px', border: '8px solid white' }} alt="Token" />
                  ) : <p>Generating Token...</p>}
                  <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-muted)' }}>Scan this code at automated gateways for terminal access.</p>
                </div>
             </div>
             <button onClick={() => generateIDCard(user)} className="badge primary" style={{ width: '100%', padding: '1.2rem', cursor: 'pointer', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold' }}>
               🖨️ Open Digital ID Card
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '3rem', maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }} className="gradient-text">Personnel Self-Service Hub</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>Securely access your records using your Neural ID or manual credentials.</p>

      {error && <p style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>⚠️ {error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '3rem', alignItems: 'start' }}>
        {/* Face Access */}
        <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '3rem' }}>
           <h3 style={{ marginBottom: '1.5rem' }}>Neural Face Scan</h3>
           <CameraCaptureComponent 
             onCapture={async (file) => {
               setLoading(true);
               const fd = new FormData();
               fd.append("file", file);
               try {
                 const res = await fetch(`${API_BASE}/api/attendance/face`, { method: 'POST', body: fd });
                 const data = await res.json();
                 if (data.status === 'success' && data.matches.length > 0) {
                   // Automatically login with the first matched face for portal access
                   handleLookup(data.matches[0].unique_id);
                 } else {
                   setError("Face not recognized in neural network registry.");
                 }
               } catch(e) { setError("Camera authentication error."); }
               finally { setLoading(false); }
             }}
             buttonText="Authenticate via Biometry"
           />
        </div>

        {/* ID Access */}
        <div style={{ textAlign: 'left' }}>
           <h3 style={{ marginBottom: '1.5rem' }}>Manual Access</h3>
           <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Neural Unique Identity (e.g. USER-XXXX)</label>
           <input 
             type="text" 
             placeholder="ENTER YOUR UNIQUE ID" 
             value={idInput}
             onChange={e => setIdInput(e.target.value.toUpperCase())}
             style={{ fontSize: '1.2rem', padding: '1rem', letterSpacing: '2px', fontWeight: 'bold' }}
           />
           <button 
             onClick={() => handleLookup(idInput)} 
             disabled={loading || !idInput}
             style={{ width: '100%', marginTop: '1.5rem', padding: '1.2rem', fontSize: '1.1rem' }}
           >
             {loading ? 'Decrypting Records...' : 'Access My Profile →'}
           </button>
        </div>
      </div>
    </div>
  );
}

export default App;
