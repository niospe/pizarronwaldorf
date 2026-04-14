// Estado global
let negocios = [];
let categorias = [];
let mapa = null;
let marcadores = [];

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Los listeners se configuran primero, independiente de la carga de datos
    configurarEventListeners();
    inicializarMapa();

    cargarCategorias().then(() => cargarNegocios()).catch(err => {
        console.error('Error al inicializar:', err);
        mostrarNotificacion('Error de conexión con Firebase', 'error');
    });
});

// ============================================================
// MAPA (Leaflet + OpenStreetMap)
// ============================================================
function inicializarMapa() {
    mapa = L.map('map').setView([-31.4167, -64.1833], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);
}

function actualizarMapa(lista) {
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];

    const conUbicacion = lista.filter(n => n.lat && n.lng);

    if (conUbicacion.length === 0) return;

    conUbicacion.forEach(negocio => {
        const icono = L.divIcon({
            className: '',
            html: `<div class="marker-pin">${negocio.tipo === 'negocio' ? '🏪' : '🛠️'}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
            popupAnchor: [0, -20]
        });

        const categoriaObj = categorias.find(c => c.valor === negocio.categoria);
        const catLabel = categoriaObj ? `${categoriaObj.emoji} ${categoriaObj.nombre}` : negocio.categoria || '';
        const waLink = negocio.whatsapp
            ? `<a href="https://wa.me/${negocio.whatsapp}" target="_blank" style="color:#25D366;font-weight:600;">WhatsApp</a>`
            : '';

        const marker = L.marker([negocio.lat, negocio.lng], { icon: icono })
            .addTo(mapa)
            .bindPopup(`
                <div class="popup-negocio">
                    <strong>${negocio.titulo}</strong>
                    <p style="margin:4px 0;font-size:0.85rem;color:#888;">${catLabel}</p>
                    ${negocio.direccion ? `<p style="margin:4px 0;font-size:0.82rem;">📍 ${negocio.direccion}</p>` : ''}
                    ${waLink}
                </div>
            `);
        marcadores.push(marker);
    });

    const group = L.featureGroup(marcadores);
    mapa.fitBounds(group.getBounds().pad(0.2));
}

// ============================================================
// CATEGORÍAS
// ============================================================
async function cargarCategorias() {
    try {
        const snap = await db.collection('categorias').orderBy('nombre').get();
        categorias = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (categorias.length === 0) {
            await inicializarCategoriasPorDefecto();
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categorias = getCategoriasPorDefecto();
    }
    actualizarSelectsCategorias();
}

function getCategoriasPorDefecto() {
    return [
        { valor: 'gastronomia', nombre: 'Gastronomía', emoji: '🍔' },
        { valor: 'servicios-profesionales', nombre: 'Servicios Profesionales', emoji: '🛠️' },
        { valor: 'servicios-digitales', nombre: 'Servicios Digitales', emoji: '💻' },
        { valor: 'salud', nombre: 'Salud y Bienestar', emoji: '🏥' },
        { valor: 'automotriz', nombre: 'Automotriz', emoji: '🚗' },
        { valor: 'educacion', nombre: 'Educación', emoji: '📚' },
        { valor: 'hogar', nombre: 'Hogar', emoji: '🏡' },
        { valor: 'mascotas', nombre: 'Mascotas', emoji: '🐾' },
        { valor: 'comercios', nombre: 'Comercios', emoji: '🏪' },
        { valor: 'otros', nombre: 'Otros Servicios', emoji: '🎁' },
    ];
}

async function inicializarCategoriasPorDefecto() {
    const defaults = getCategoriasPorDefecto();
    for (const cat of defaults) {
        await db.collection('categorias').add(cat);
    }
    const snap = await db.collection('categorias').orderBy('nombre').get();
    categorias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function actualizarSelectsCategorias() {
    const selects = document.querySelectorAll('#categoria, #categoryFilter');
    selects.forEach(select => {
        const esFilter = select.id === 'categoryFilter';
        const valorActual = select.value;

        select.innerHTML = esFilter
            ? '<option value="todas">Todas las categorías</option>'
            : '<option value="">Seleccionar categoría</option>';

        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.valor;
            opt.textContent = `${cat.emoji} ${cat.nombre}`;
            select.appendChild(opt);
        });

        select.value = valorActual;
    });
}

// ============================================================
// NEGOCIOS - CARGA
// ============================================================
async function cargarNegocios() {
    mostrarLoading();
    try {
        const snap = await db.collection('negocios').get();
        negocios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        negocios = shuffleArray(negocios);
    } catch (error) {
        console.error('Error cargando negocios:', error);
        negocios = JSON.parse(localStorage.getItem('negociosWalfordf')) || [];
        mostrarNotificacion('Usando datos locales. Verificá tu conexión.', 'info');
    }

    mostrarNegocios(negocios);
    actualizarMapa(negocios);
    actualizarContador(negocios.length);
}

function shuffleArray(arr) {
    const s = [...arr];
    for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
}

// ============================================================
// NEGOCIOS - GUARDAR
// ============================================================
async function guardarNegocio(negocio) {
    try {
        let lat = null, lng = null;

        if (negocio.direccion && negocio.direccion.trim()) {
            mostrarNotificacion('Buscando ubicación en el mapa...', 'info');
            const coords = await geocodificarDireccion(negocio.direccion);
            if (coords) {
                lat = coords.lat;
                lng = coords.lng;
            }
        }

        await db.collection('negocios').add({
            ...negocio,
            lat,
            lng,
            web: formatearURL(negocio.web),
            fecha: new Date().toISOString()
        });

        await cargarNegocios();
        return true;
    } catch (error) {
        console.error('Error guardando:', error);
        const stored = JSON.parse(localStorage.getItem('negociosWalfordf')) || [];
        stored.push({ ...negocio, id: Date.now(), fecha: new Date().toISOString() });
        localStorage.setItem('negociosWalfordf', JSON.stringify(stored));
        negocios = [...negocios, { ...negocio, id: Date.now() }];
        mostrarNegocios(negocios);
        return false;
    }
}

// ============================================================
// GEOCODIFICACIÓN (Nominatim - OpenStreetMap, gratuito)
// ============================================================
async function geocodificarDireccion(direccion) {
    try {
        const query = encodeURIComponent(direccion + ', Argentina');
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'es' }
        });
        const data = await res.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error('Error geocodificando:', e);
    }
    return null;
}

// ============================================================
// DISPLAY
// ============================================================
function mostrarLoading() {
    const grid = document.getElementById('businessGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Cargando negocios...
            </div>`;
    }
}

function mostrarNegocios(lista) {
    const grid = document.getElementById('businessGrid');
    if (!grid) return;

    if (!lista || lista.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-store-alt"></i>
                <h3>No encontramos resultados</h3>
                <p>¡Sé el primero en agregar un negocio!</p>
            </div>`;
        return;
    }

    grid.innerHTML = lista.map(negocio => {
        const botones = [];
        if (negocio.whatsapp) {
            botones.push(`<a href="https://wa.me/${negocio.whatsapp}" target="_blank" class="contact-btn whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>`);
        }
        if (negocio.email) {
            botones.push(`<a href="mailto:${negocio.email}" class="contact-btn email"><i class="far fa-envelope"></i> Email</a>`);
        }
        if (negocio.web) {
            botones.push(`<a href="${formatearURL(negocio.web)}" target="_blank" class="contact-btn website"><i class="fas fa-globe"></i> Web</a>`);
        }

        const categoriaObj = categorias.find(c => c.valor === negocio.categoria);
        const catLabel = categoriaObj ? `${categoriaObj.emoji} ${categoriaObj.nombre}` : negocio.categoria || 'Sin categoría';

        const enMapa = negocio.lat && negocio.lng
            ? `<span class="city-badge en-mapa">📍 En mapa</span>`
            : '';

        return `
            <div class="business-card scroll-fade" data-id="${negocio.id}">
                <h3>${negocio.titulo}</h3>
                <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">
                    <span class="business-type ${negocio.tipo}">${negocio.tipo === 'negocio' ? '🏪 Negocio' : '🛠️ Servicio'}</span>
                    <span class="city-badge"><i class="fas fa-map-marker-alt"></i> ${formatearCiudad(negocio.ciudad)}</span>
                    <span class="category-badge"><i class="fas fa-tag"></i> ${catLabel}</span>
                    ${enMapa}
                </div>
                <p class="business-description">${negocio.descripcion}</p>
                <div class="contact-buttons">${botones.join('')}</div>
            </div>`;
    }).join('');

    observarScroll();
}

// ============================================================
// FILTROS
// ============================================================
function filtrarNegocios() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const tipo = document.querySelector('.filter-btn.active')?.dataset.filter || 'todos';
    const ciudad = document.getElementById('cityFilter')?.value || 'todas';
    const categoria = document.getElementById('categoryFilter')?.value || 'todas';

    const filtrados = negocios.filter(n => {
        if (tipo !== 'todos' && n.tipo !== tipo) return false;
        if (ciudad !== 'todas' && n.ciudad !== ciudad) return false;
        if (categoria !== 'todas' && n.categoria !== categoria) return false;
        if (search) {
            const enTitulo = n.titulo?.toLowerCase().includes(search);
            const enDesc = n.descripcion?.toLowerCase().includes(search);
            if (!enTitulo && !enDesc) return false;
        }
        return true;
    });

    mostrarNegocios(filtrados);
    actualizarMapa(filtrados);
    actualizarContador(filtrados.length);
}

function actualizarContador(n) {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = n;
}

// ============================================================
// EVENTOS
// ============================================================
function configurarEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', filtrarNegocios);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtrarNegocios();
        });
    });

    document.getElementById('cityFilter')?.addEventListener('change', filtrarNegocios);
    document.getElementById('categoryFilter')?.addEventListener('change', filtrarNegocios);

    const fab = document.getElementById('openFormBtn');
    const modal = document.getElementById('businessModal');
    fab?.addEventListener('click', () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    document.querySelector('.close')?.addEventListener('click', cerrarModal);
    window.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

    document.getElementById('businessForm')?.addEventListener('submit', handleSubmit);
}

function cerrarModal() {
    const modal = document.getElementById('businessModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('businessForm')?.reset();
        const msg = document.getElementById('formMessage');
        if (msg) { msg.style.display = 'none'; msg.innerHTML = ''; }
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');

    const negocio = {
        titulo: document.getElementById('titulo')?.value.trim() || '',
        tipo: document.querySelector('input[name="tipo"]:checked')?.value || 'negocio',
        ciudad: document.getElementById('ciudad')?.value || '',
        categoria: document.getElementById('categoria')?.value || '',
        descripcion: document.getElementById('descripcion')?.value.trim() || '',
        whatsapp: document.getElementById('whatsapp')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        web: document.getElementById('web')?.value.trim() || '',
        direccion: document.getElementById('direccion')?.value.trim() || '',
    };

    if (!negocio.titulo || !negocio.descripcion || !negocio.ciudad || !negocio.categoria) {
        mostrarMensaje('Completá todos los campos obligatorios', 'error', formMessage);
        return;
    }
    if (!negocio.whatsapp && !negocio.email && !negocio.web) {
        mostrarMensaje('Agregá al menos un medio de contacto', 'error', formMessage);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const exito = await guardarNegocio(negocio);
    mostrarMensaje(
        exito ? '¡Negocio agregado con éxito!' : 'Guardado localmente. Se sincronizará cuando haya conexión.',
        exito ? 'success' : 'info',
        formMessage
    );
    setTimeout(() => cerrarModal(), 2000);
    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Negocio';
    }, 2000);
}

// ============================================================
// HELPERS
// ============================================================
function formatearURL(url) {
    if (!url || !url.trim()) return '';
    url = url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
}

function formatearCiudad(ciudad) {
    const ciudades = {
        'cordoba': 'Córdoba',
        'rio ceballos': 'Río Ceballos',
        'tanti': 'Tanti',
        'la calera': 'La Calera',
        'saldan': 'Saldán',
        'mendiolaza': 'Mendiolaza',
        'otro': 'Otra ciudad'
    };
    return ciudades[ciudad?.toLowerCase()] || ciudad || 'Sin especificar';
}

function mostrarMensaje(texto, tipo, el) {
    if (!el) return;
    el.textContent = texto;
    el.className = `message ${tipo}`;
    el.style.display = 'block';
}

function mostrarNotificacion(texto, tipo) {
    const n = document.createElement('div');
    n.className = `message ${tipo}`;
    Object.assign(n.style, {
        position: 'fixed', top: '20px', right: '20px',
        zIndex: '3000', maxWidth: '300px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
        padding: '15px', borderRadius: '15px'
    });
    n.textContent = texto;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

function observarScroll() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
}
