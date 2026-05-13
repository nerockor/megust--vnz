import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutGrid, Link as LinkIcon, Send, CheckCircle2, AlertCircle, Search, Trash2, X, Image as ImageIcon, Edit3, Save, Upload, User, Phone, Mail, Calendar, Award, ChevronDown, ChevronUp, MapPin, Tag, Download, Shield, Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';
import { generateCertificate } from './utils/certificateUtils';

const SECTORS = [
  { id: 'superior-izquierdo', label: 'Sup. Izq.' },
  { id: 'superior-centro', label: 'Sup. Centro' },
  { id: 'superior-derecho', label: 'Sup. Der.' },
  { id: 'centro-izquierdo', label: 'Centro Izq.' },
  { id: 'centro', label: 'Centro' },
  { id: 'centro-derecho', label: 'Centro Der.' },
  { id: 'inferior-izquierdo', label: 'Inf. Izq.' },
  { id: 'inferior-centro', label: 'Inf. Centro' },
  { id: 'inferior-derecho', label: 'Inf. Der.' },
];

const RUBROS = [
  'Celulares y Teléfonos', 'Computación', 'Electrodomésticos', 'Hogar, Muebles y Jardín',
  'Moda', 'Ferreteria', 'Deportes y Fitness', 'Juguetes y Bebés', 'Joyas y Relojes',
  'Instrumentos Musicales', 'Libros, Revistas y Comics', 'lavanderia', 'Repuestos de autos',
  'Gimnasio', 'Mascotas', 'supermercado', 'Productos de limpieza', 'Cafeteria',
  'Artículos de cocina', 'Calzado', 'Perfumeria', 'Reparaciones de celular',
  'Mudanzas y fletes', 'Instalación de electrodomésticos', 'peluqueria, Barberia',
  'Restaurante', 'Heladeria', 'Pintureria'
];

const ZONAS_POR_CIUDAD = {
  'La Guaira (La Guaira)': [
    'Catia La Mar', 'Maiquetía', 'Macuto', 'Caraballeda', 'Caribe', 
    'Tanaguarena', 'Camurí Chico', 'Naiguatá', 'Camurí Grande', 
    'Los Caracas', 'Playa Grande', 'Carayaca', 'Puerto Cruz', 
    'Chichiriviche', 'Oricao'
  ],
  'Distrito Capital (Caracas)': [
    'Propatria', 'Agua Salud', 'Capitolio', 'La Hoyada', 'Bellas Artes', 
    'Plaza Venezuela', 'Sabana Grande', 'Chacaíto', 'Chacao', 'Altamira', 
    'Miranda', 'Los Dos Caminos', 'Los Cortijos', 'Petare', 'Palo Verde',
    'La Paz', 'Artigas', 'Maternidad', 'El Silencio', 'Zona Rental'
  ],
  'Miranda (Los Teques)': [
    'Los Teques', 'San Antonio de los Altos', 'Guarenas', 'Guatire', 
    'Charallave', 'Cúa', 'Santa Teresa', 'Ocumare del Tuy', 
    'Higuerote', 'Río Chico', 'Baruta', 'El Hatillo'
  ],
  'Carabobo (Valencia)': [
    'Valencia', 'Puerto Cabello', 'Guacara', 'Mariara', 
    'San Joaquín', 'Naguanagua', 'San Diego', 'Morón'
  ],
  'Nueva Esparta (La Asunción)': [
    'Porlamar', 'Pampatar', 'La Asunción', 'Juan Griego', 'El Valle'
  ]
};

const BARRIOS = [
  'Amazonas (Puerto Ayacucho)', 'Anzoátegui (Barcelona)', 'Apure (San Fernando de Apure)',
  'Aragua (Maracay)', 'Barinas (Barinas)', 'Bolívar (Ciudad Bolívar)', 'Carabobo (Valencia)',
  'Cojedes (San Carlos)', 'Delta Amacuro (Tucupita)', 'Falcón (Coro)', 'Guárico (San Juan de los Morros)',
  'Lara (Barquisimeto)', 'Mérida (Mérida)', 'Miranda (Los Teques)', 'Monagas (Maturín)',
  'Nueva Esparta (La Asunción)', 'Portuguesa (Guanare)', 'Sucre (Cumaná)', 'Táchira (San Cristóbal)',
  'Trujillo (Trujillo)', 'La Guaira (La Guaira)', 'Yaracuy (San Felipe)', 'Zulia (Maracaibo)',
  'Distrito Capital (Caracas)'
];

const AdminPanel = () => {
  const [url, setUrl] = useState('');
  const [base64Image, setBase64Image] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState(RUBROS[0]);
  const [barrio, setBarrio] = useState('');
  const [zona, setZona] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [size, setSize] = useState('10');
  const [selectedSector, setSelectedSector] = useState('centro');
  const [ads, setAds] = useState([]);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');
  const [username, setUsername] = useState(localStorage.getItem('admin_username') || '');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState(localStorage.getItem('admin_role') || '');
  const [systemUsers, setSystemUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [showUsersModal, setShowUsersModal] = useState(false);
  
  const [visitors, setVisitors] = useState([]);
  const [activeTab, setActiveTab] = useState('ads');

  const fetchVisitors = async (token) => {
    try {
      const res = await axios.get('/api/admin/visitors', { headers: { 'x-admin-token': token } });
      setVisitors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingAd, setEditingAd] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (adminToken) {
      setIsAuthenticated(true);
      fetchAds(adminToken);
      if (userRole === 'admin') {
        fetchUsers(adminToken);
        fetchVisitors(adminToken);
      }
    }
  }, []);

  const handleLogin = async () => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { token, role, username: resUsername } = res.data;
      setAdminToken(token);
      setUserRole(role);
      setUsername(resUsername);
      setIsAuthenticated(true);
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_role', role);
      localStorage.setItem('admin_username', resUsername);
      fetchAds(token);
      if (role === 'admin') {
        fetchUsers(token);
        fetchVisitors(token);
      }
      setLoginError(false);
    } catch (err) {
      setIsAuthenticated(false);
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_username');
    setAdminToken('');
    setUserRole('');
    setUsername('');
    setPassword('');
    setIsAuthenticated(false);
  };

  const fetchAds = async (token = adminToken) => {
    try {
      const res = await axios.get('/api/ads', {
        headers: { 'x-admin-token': token }
      });
      setAds(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) handleLogout();
      console.error('Error fetching ads', err);
    }
  };

  const fetchUsers = async (token = adminToken) => {
    try {
      const res = await axios.get('/api/users', { headers: { 'x-admin-token': token } });
      setSystemUsers(res.data);
    } catch (err) { console.error('Error fetching users', err); }
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleFileChange = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Máximo 2MB.");
      return;
    }
    const base64 = await toBase64(file);
    if (isEdit) {
      setEditingAd({ ...editingAd, image: base64 });
    } else {
      setBase64Image(base64);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setStatus('loading');
    try {
      const resp = await axios.post('/api/ads', {
        url, sector: selectedSector, image: base64Image,
        name, phone, email, location, category, barrio, zona, description, lat, lng, expiration_date: expirationDate, size
      }, {
        headers: { 'x-admin-token': adminToken }
      });
      
      setStatus('success');
      setMessage('Publicidad colocada correctamente!');
      
      generateCertificate({
          id: resp.data.id,
          x: resp.data.x,
          y: resp.data.y,
          width: resp.data.width,
          height: resp.data.height,
          name: name,
          url: url,
          sector: selectedSector,
          image: base64Image,
          expiration_date: expirationDate
      });

      setUrl(''); setBase64Image(''); setName(''); setPhone(''); setEmail(''); setLocation(''); setCategory(RUBROS[0]); setBarrio(''); setZona(''); setDescription(''); setLat(''); setLng(''); setExpirationDate(''); setSize('10');
      fetchAds();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Error al conectar con el servidor');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/ads/${editingAd.id}`, editingAd, {
        headers: { 'x-admin-token': adminToken }
      });
      setEditingAd(null);
      fetchAds();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar. Verifique su token.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este anuncio?')) return;
    try {
      await axios.delete(`/api/ads/${id}`, {
        headers: { 'x-admin-token': adminToken }
      });
      fetchAds();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar. Verifique su token.');
    }
  };

  const handleExport = () => {
    window.open(`/api/ads/export/csv?token=${adminToken}`, '_blank');
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) return;
    try {
      await axios.post('/api/users', newUser, { headers: { 'x-admin-token': adminToken } });
      setNewUser({ username: '', password: '' });
      fetchUsers(adminToken);
    } catch (err) { alert('Error al crear usuario. Puede que ya exista.'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('¿Eliminar vendedor?')) return;
    try {
      await axios.delete(`/api/users/${id}`, { headers: { 'x-admin-token': adminToken } });
      fetchUsers(adminToken);
    } catch (err) { console.error('Error', err); }
  };

  const getSectorColor = (sectorId, isSelected) => {
    if (sectorId.startsWith('superior')) {
      return isSelected 
        ? { background: '#0ea5e9', color: 'white', boxShadow: '0 4px 16px rgba(14,165,233,0.35)' } 
        : { background: 'rgba(14,165,233,0.08)', color: '#38bdf8' };
    } else if (sectorId.startsWith('centro') || sectorId === 'centro') {
      return isSelected 
        ? { background: '#9ca3af', color: 'white', boxShadow: '0 4px 16px rgba(156,163,175,0.35)' } 
        : { background: 'rgba(156,163,175,0.08)', color: '#cbd5e1' };
    } else {
      return isSelected 
        ? { background: '#f59e0b', color: 'white', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' } 
        : { background: 'rgba(245,158,11,0.08)', color: '#fbbf24' };
    }
  };

  const displayAds = searchQuery.trim()
    ? ads.filter(ad => 
        ad.url.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
        (ad.name || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
      ).reverse()
    : ads.length > 0 ? [ads[ads.length - 1]] : [];

  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="admin-card" style={{ maxWidth: '400px', width: '90%', padding: '40px', textAlign: 'center' }}>
          <Shield size={48} color="#9ca3af" style={{ marginBottom: '20px' }} />
          <h2 className="admin-title">Acceso al Sistema</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '30px' }}>Ingrese sus credenciales para continuar.</p>
          <input 
            type="text" 
            className="admin-input" 
            placeholder="Usuario" 
            value={username}
            onChange={(e) => { setUsername(e.target.value); setLoginError(false); }}
            style={{ marginBottom: '15px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <input 
            type="password" 
            className="admin-input" 
            placeholder="Contraseña" 
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {loginError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px' }}>Credenciales incorrectas. Reintente.</p>}
          <button onClick={handleLogin} className="submit-btn" style={{ marginTop: '20px' }}>Ingresar al Sistema</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Panel de Control de Anunciantes</h1>
          <p className="admin-subtitle">Gestión estratégica de la grilla de Buenos Aires</p>
        </div>
        {userRole === 'admin' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setActiveTab('ads')} className={`cyber-btn ${activeTab === 'ads' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '10px' }}>Anuncios</button>
            <button onClick={() => setActiveTab('visitors')} className={`cyber-btn ${activeTab === 'visitors' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '10px' }}>Usuarios Registrados</button>
          </div>
        )}
      </header>

      <div style={{ display: activeTab === 'ads' ? 'block' : 'none' }}>

      {/* ===== EDIT MODAL (Bottom Sheet) ===== */}
      {editingAd && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">
                <Edit3 size={18} style={{ color: '#cbd5e1' }} /> Editar Anuncio
              </h3>
              <button className="modal-close" onClick={() => setEditingAd(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-row">
                <div className="field-group">
                  <label className="admin-label">Nombre</label>
                  <input type="text" className="admin-input" value={editingAd.name || ''} onChange={(e) => setEditingAd({ ...editingAd, name: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="admin-label">Teléfono</label>
                  <input type="tel" className="admin-input" value={editingAd.phone || ''} onChange={(e) => setEditingAd({ ...editingAd, phone: e.target.value })} />
                </div>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label className="admin-label">Email</label>
                  <input type="email" className="admin-input" value={editingAd.email || ''} onChange={(e) => setEditingAd({ ...editingAd, email: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="admin-label">Rubro</label>
                  <select className="admin-input" value={editingAd.category || ''} onChange={(e) => setEditingAd({ ...editingAd, category: e.target.value })}>
                    {RUBROS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label className="admin-label">Vencimiento</label>
                  <input type="date" className="admin-input" value={editingAd.expiration_date || ''} onChange={(e) => setEditingAd({ ...editingAd, expiration_date: e.target.value })} />
                </div>
              <div className="field-row">
                <div className="field-group">
                  <label className="admin-label">Descripción Marquee (Máx 30 car.)</label>
                  <input 
                    type="text" 
                    className="admin-input" 
                    value={editingAd.description || ''} 
                    onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value.substring(0, 30) })} 
                    placeholder="Slogan o noticia..." 
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label className="admin-label">Latitud</label>
                  <input type="text" className="admin-input" value={editingAd.lat || ''} onChange={(e) => setEditingAd({ ...editingAd, lat: e.target.value })} placeholder="-34.6..." />
                </div>
                <div className="field-group">
                  <label className="admin-label">Longitud</label>
                  <input type="text" className="admin-input" value={editingAd.lng || ''} onChange={(e) => setEditingAd({ ...editingAd, lng: e.target.value })} placeholder="-58.4..." />
                </div>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label className="admin-label">Ciudad</label>
                  <select className="admin-input" value={editingAd.barrio || ''} onChange={(e) => setEditingAd({ ...editingAd, barrio: e.target.value })}>
                    <option value="">Seleccionar Ciudad...</option>
                    {BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {ZONAS_POR_CIUDAD[editingAd.barrio] && (
                  <div className="field-group">
                    <label className="admin-label">Zona</label>
                    <select className="admin-input" value={editingAd.zona || ''} onChange={(e) => setEditingAd({ ...editingAd, zona: e.target.value })}>
                      <option value="">Seleccionar Zona...</option>
                      {ZONAS_POR_CIUDAD[editingAd.barrio].map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                )}
                <div className="field-group">
                  <label className="admin-label">Ubicación</label>
                  <input type="text" className="admin-input" value={editingAd.location || ''} onChange={(e) => setEditingAd({ ...editingAd, location: e.target.value })} placeholder="Dirección..." />
                </div>
              </div>
              </div>

              <div className="field-group">
                <label className="admin-label">Enlace destino</label>
                <input type="text" className="admin-input" value={editingAd.url} onChange={(e) => setEditingAd({ ...editingAd, url: e.target.value })} />
              </div>

              <div className="field-group">
                <label className="admin-label">Imagen</label>
                <div className="edit-image-row">
                  <div className="edit-image-preview">
                    {editingAd.image ? (
                      <>
                        <img src={editingAd.image} alt="" />
                        <button type="button" onClick={() => setEditingAd({ ...editingAd, image: null })} className="edit-image-remove"><X size={10} /></button>
                      </>
                    ) : <ImageIcon size={18} style={{ color: '#334155' }} />}
                  </div>
                  <label className="edit-upload-label">
                    <Upload size={16} style={{ color: '#475569' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cambiar</span>
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileChange(e, true)} />
                  </label>
                </div>
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: 8, background: '#9ca3af' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Save size={18} /> Guardar Cambios</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== STICKY STATUS BAR ===== */}
      <div className="admin-statusbar">
        <div className="admin-statusbar-left">
          <div className="admin-statusbar-icon">
            <LayoutGrid size={20} />
          </div>
          <div>
            <div className="admin-statusbar-title">Admin Panel</div>
            <div className="admin-statusbar-sub">Gestión de ventas</div>
          </div>
        </div>
        <div className="admin-counter">
          {ads.length.toLocaleString()} / 10,000
        </div>
      </div>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <div className="admin-content">

        {/* ===== STATUS TOAST ===== */}
        {status !== 'idle' && (
          <div className={`status-toast ${status === 'success' ? 'status-toast--success' : 'status-toast--error'}`}>
            {status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message}</span>
          </div>
        )}

        {/* ===== FORM TOGGLE ===== */}
        <div className="glass-card" style={{ overflow: 'hidden', border: '1px solid rgba(30,41,59,0.6)' }}>
          <button type="button" onClick={() => setIsFormOpen(!isFormOpen)} className="toggle-btn">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              <Send size={14} /> Nueva Venta
            </span>
            {isFormOpen ? <ChevronUp size={18} style={{ color: '#cbd5e1' }} /> : <ChevronDown size={18} style={{ color: '#cbd5e1' }} />}
          </button>

          {isFormOpen && (
            <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* ── ETAPA 1: Datos del Cliente ── */}
              <div className="stage-card stage-card--indigo">
                <h3 className="stage-header" style={{ color: '#cbd5e1' }}>
                  <User size={14} /> Etapa 1 — Datos del Cliente
                </h3>
                <div className="field-stack">
                  <div className="field-row">
                    <div className="field-group">
                      <label className="admin-label"><User size={10} /> Marca</label>
                      <input type="text" className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: TechStore" />
                    </div>
                    <div className="field-group">
                      <label className="admin-label"><Calendar size={10} /> Culminación</label>
                      <input type="date" className="admin-input" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="admin-label"><Phone size={10} /> Teléfono</label>
                      <input type="tel" className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54..." />
                    </div>
                    <div className="field-group">
                      <label className="admin-label"><Mail size={10} /> Email</label>
                      <input type="email" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@..." />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="admin-label"><Tag size={10} /> Rubro</label>
                      <select className="admin-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {RUBROS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="admin-label"><MapPin size={10} /> Descripción Marquee (30 car.)</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value.substring(0, 30))} 
                        placeholder="Mensaje que se mueve..." 
                      />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="admin-label"><MapPin size={10} /> Lat / Lng</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input type="text" className="admin-input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Lat" />
                        <input type="text" className="admin-input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Lng" />
                        <button type="button" onClick={() => {
                          navigator.geolocation.getCurrentPosition(pos => {
                            setLat(pos.coords.latitude.toFixed(6));
                            setLng(pos.coords.longitude.toFixed(6));
                          });
                        }} className="admin-input" style={{ width: 'auto', background: '#334155', color: 'white', border: 'none', padding: '0 8px' }}>
                          <MapPin size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="admin-label"><MapPin size={10} /> Ciudad</label>
                      <select className="admin-input" value={barrio} onChange={(e) => setBarrio(e.target.value)}>
                        <option value="">Sin definir</option>
                        {BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    {ZONAS_POR_CIUDAD[barrio] && (
                      <div className="field-group">
                        <label className="admin-label"><MapPin size={10} /> Zona</label>
                        <select className="admin-input" value={zona} onChange={(e) => setZona(e.target.value)}>
                          <option value="">Sin definir</option>
                          {ZONAS_POR_CIUDAD[barrio].map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="field-group">
                      <label className="admin-label"><MapPin size={10} /> Ubicación</label>
                      <input type="text" className="admin-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dirección..." />
                    </div>
                  </div>
                  </div>

                  <div className="field-group">
                    <label className="admin-label"><LinkIcon size={10} /> Enlace Destino</label>
                    <input type="url" className="admin-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ejemplo.com" required />
                  </div>

                  <div className="field-group">
                    <label className="admin-label"><ImageIcon size={10} /> Logo / Imagen</label>
                    <label className={`upload-zone ${base64Image ? 'upload-zone--filled' : ''}`}>
                      {base64Image ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img src={base64Image} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '2px solid #9ca3af' }} alt="" />
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase' }}>Imagen lista ✓</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={22} style={{ color: '#475569' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Toca para Subir Logo</span>
                        </>
                      )}
                      <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileChange(e)} />
                    </label>
                  </div>
                </div>
              </div>

              {/* ── ETAPA 2: Configuración del Mapa ── */}
              <div className="stage-card stage-card--emerald">
                <h3 className="stage-header" style={{ color: '#34d399' }}>
                  <LayoutGrid size={14} /> Etapa 2 — Mapa
                </h3>
                <div className="field-stack">
                  <div className="field-group">
                    <label className="admin-label"><LayoutGrid size={10} /> Dimensiones</label>
                    <div className="size-picker">
                      <button type="button" onClick={() => setSize('10')} className={`size-btn ${size === '10' ? 'size-btn--active' : ''}`}>
                        <span>10×10</span><span>BÁSICO</span>
                      </button>
                      <button type="button" onClick={() => setSize('20')} className={`size-btn ${size === '20' ? 'size-btn--active' : ''}`}>
                        <span>20×20</span><span>COMBO</span>
                      </button>
                      <button type="button" onClick={() => setSize('50')} className={`size-btn ${size === '50' ? 'size-btn--active' : ''}`}>
                        <span>50×50</span><span>PREMIUM</span>
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="admin-label"><LayoutGrid size={10} /> Sector</label>
                    <div className="sector-grid">
                      {SECTORS.map((sector) => {
                        const isSelected = selectedSector === sector.id;
                        const style = getSectorColor(sector.id, isSelected);
                        return (
                          <button
                            key={sector.id}
                            type="button"
                            onClick={() => setSelectedSector(sector.id)}
                            className="sector-btn"
                            style={{
                              ...style,
                              opacity: isSelected ? 1 : 0.7,
                              transform: isSelected ? 'scale(1)' : 'scale(0.97)',
                            }}
                          >
                            {sector.label.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ETAPA 3: Publicar ── */}
              <div className="stage-card stage-card--violet">
                <h3 className="stage-header" style={{ color: '#a78bfa' }}>
                  <CheckCircle2 size={14} /> Etapa 3 — Publicar
                </h3>
                <button type="submit" disabled={!url || !selectedSector || status === 'loading'} className="submit-btn">
                  {status === 'loading' ? (
                    <span style={{ fontSize: 28, padding: '4px 0' }}>⏳</span>
                  ) : (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Send size={18} /> PUBLICAR + CERTIFICADO
                      </span>
                      <span className="submit-btn-sub">Sube automáticamente al lienzo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ===== HISTORY / DATABASE ===== */}
        <div className="glass-card" style={{ overflow: 'hidden', border: '1px solid rgba(30,41,59,0.6)' }}>
          <div className="section-tab-bar">
            <div className="section-tab section-tab--active" style={{ flex: 'none' }}>
              <span className="section-tab-dot" />
              Panel General
            </div>
            <div className="section-tab" style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <span>Ventas</span>
              <span className="admin-counter" style={{ fontSize: 10, padding: '4px 10px' }}>
                {ads.length.toLocaleString()} / 10,000
              </span>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
              {searchQuery.trim() ? `Filtrando: ${displayAds.length} encontrados` : 'Última Edición'}
            </p>

            <div className="search-bar">
              <Search className="search-bar-icon" size={16} />
              <input type="text" placeholder="Buscar cliente, marca o enlace..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayAds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>No hay registros</div>
              ) : displayAds.map(ad => (
                <div key={ad.id} className="history-card">
                  <div className="history-card-header">
                    <div className="history-brand">
                      <div className="history-thumb">
                        {ad.image ? <img src={ad.image} alt="" /> : <ImageIcon size={18} style={{ color: '#1e293b' }} />}
                        <div className="history-thumb-badge">{ad.width}x{ad.height}</div>
                      </div>
                      <div className="history-info">
                        <span className="history-name">{ad.name || 'Sin Nombre'}</span>
                        <div className="history-meta">
                          <span className="history-tag">{ad.category || 'Rubro'}</span>
                          <span className="history-tag" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>{ad.barrio || 'Sin Ciudad'}</span>
                          {ad.zona && <span className="history-tag" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{ad.zona}</span>}
                          <span className="history-url">{ad.url}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <span className="badge-sector">{ad.sector?.split('-')[1] || 'CENTRO'}</span>
                      {ad.expiration_date && (
                        <span className="badge-expiry">Vence: {ad.expiration_date}</span>
                      )}
                    </div>
                  </div>

                  {(ad.phone || ad.email || ad.location) && (
                    <div className="history-details">
                      {ad.phone && <div className="history-detail-item"><Phone size={10} /> {ad.phone}</div>}
                      {ad.email && <div className="history-detail-item" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mail size={10} /> {ad.email}</div>}
                      {ad.location && <div className="history-detail-item history-detail-item--full" style={{ color: '#cbd5e1' }}><MapPin size={10} /> {ad.location}</div>}
                    </div>
                  )}

                  <div className="action-row">
                    <button onClick={() => setEditingAd(ad)} className="action-btn action-btn--edit">
                      <Edit3 size={13} /> Editar
                    </button>
                    <button onClick={() => generateCertificate(ad)} className="action-btn action-btn--cert">
                      <Award size={13} /> Certif.
                    </button>
                    <button onClick={() => setDeleteConfirm(ad.id)} className="action-btn action-btn--delete">
                      <Trash2 size={13} /> Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '40px' }}>
          {userRole === 'admin' && (
            <>
              <button
                onClick={handleExport}
                className="submit-btn"
                style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)', boxShadow: '0 8px 32px rgba(14, 165, 233, 0.3)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={18} /> EXPORTAR BASE DE DATOS (CSV)
                </span>
                <span className="submit-btn-sub">Descarga completa con todos los datos de contacto</span>
              </button>
              
              <button
                onClick={() => setShowUsersModal(true)}
                className="submit-btn"
                style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', boxShadow: '0 8px 32px rgba(217, 70, 239, 0.3)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} /> GESTIÓN DE VENDEDORES
                </span>
                <span className="submit-btn-sub">Crear y administrar accesos de sistema</span>
              </button>
            </>
          )}

        </div> {/* END of ADS TAB */}

        <div style={{ display: activeTab === 'visitors' ? 'block' : 'none' }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <h2 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} style={{ color: '#00e5ff' }} />
              Usuarios Registrados ({visitors.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visitors.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No hay usuarios registrados aún.</p>
              ) : visitors.map(v => (
                <div key={v.id} className="history-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <p style={{ color: 'white', fontSize: '15px', fontWeight: '800' }}>{v.name}</p>
                      <p style={{ color: '#94a3b8', fontSize: '12px' }}>{v.email} • {v.phone}</p>
                      <p style={{ color: '#64748b', fontSize: '10px', marginTop: '4px' }}>Registrado: {new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', textAlign: 'center' }}>
                    <div>
                      <p style={{ color: '#a5b4fc', fontSize: '18px', fontWeight: '900' }}>{v.click_count}</p>
                      <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Clicks</p>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div>
                      <p style={{ color: '#34d399', fontSize: '18px', fontWeight: '900' }}>{v.rating_count}</p>
                      <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Valoraciones</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={() => navigate('/')} className="back-btn" style={{ flex: 1 }}>
              VOLVER A LA ESFERA
            </button>
            <button 
              onClick={() => { handleLogout(); window.location.reload(); }} 
              className="back-btn" 
              style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <X size={16} /> CERRAR SESIÓN ({username})
            </button>
          </div>
        </div>

        {/* ===== USERS MODAL ===== */}
        {showUsersModal && userRole === 'admin' && (
          <div className="modal-overlay">
            <div className="modal-sheet" style={{ height: '70vh' }}>
              <div className="modal-header">
                <h3 className="modal-title"><Users size={18} style={{ color: '#d946ef' }} /> Gestión de Vendedores</h3>
                <button onClick={() => setShowUsersModal(false)} className="close-btn"><X size={20} /></button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                  <h4 style={{ color: 'white', marginBottom: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={16} /> Nuevo Vendedor</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" className="admin-input" placeholder="Nombre de Usuario" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} style={{ flex: 1 }} />
                    <input type="password" className="admin-input" placeholder="Contraseña" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} style={{ flex: 1 }} />
                    <button onClick={createUser} className="submit-btn" style={{ width: 'auto', padding: '0 20px', background: '#3b82f6' }}>Crear</button>
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px' }}>Cuentas Activas</h4>
                  {systemUsers.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No hay vendedores registrados.</p>
                  ) : systemUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '15px', background: 'rgba(217, 70, 239, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d946ef' }}>
                          <User size={14} />
                        </div>
                        <div>
                          <p style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{u.username}</p>
                          <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>
                            Rol: {u.role} • <span style={{ color: u.ads_last_month > 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>{u.ads_last_month} Negocios</span> este mes
                          </p>
                        </div>
                      </div>
                      <button onClick={() => deleteUser(u.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
