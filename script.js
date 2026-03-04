// Configuración de Google Apps Script - ¡REEMPLAZAR CON TU URL!
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXHmghEH5CpCKr5ZGKixQ5KLXP9J_mgnK8S-TZPmPd3ML_0yzsugmrSdtret_gysFV/exec';

// Estado de la aplicación
let negocios = [];
let cargando = false;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    configurarEventListeners();
});

async function inicializarApp() {
    mostrarLoading();
    await cargarNegocios();
    ocultarLoading();
    observarScroll();
}

function mostrarLoading() {
    const grid = document.getElementById('businessGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Cargando negocios...
            </div>
        `;
    }
}

function ocultarLoading() {
    // El loading se reemplaza cuando se muestran los negocios
}

// ============================================
// NUEVA FUNCIÓN: Formatear URLs automáticamente
// ============================================
function formatearURL(url) {
    if (!url || url.trim() === '') return '';
    
    // Limpiar espacios
    url = url.trim();
    
    // Si ya tiene http:// o https://, la dejamos como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // Si no tiene protocolo, agregamos https://
    return 'https://' + url;
}
function formatearCategoria(categoria) {
    if (!categoria) return 'Sin categoría';
    
    const categorias = {
        'gastronomia': '🍔 Gastronomía',
        'comercios': '🏪 Comercios',
        'servicios profesionales': '🛠️ Servicios Profesionales',
        'servicios digitales': '💻 Servicios Digitales',
        'salud y bienestar': '🏥 Salud y Bienestar',
        'automotriz': '🚗 Automotriz',
        'educacion': '📚 Educación',
        'hogar': '🏡 Hogar',
        'mascotas': '🐾 Mascotas',
        'otros servicios': '🎁 Otros Servicios'
    };
    
    return categorias[categoria.toLowerCase()] || categoria;
}

// Cargar negocios desde Google Sheets
a// Cargar negocios desde Google Sheets - VERSIÓN CORREGIDA
async function cargarNegocios() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get`);
        const data = await response.json();
        
        console.log('📥 Datos crudos de Google Sheets:', data); // DEBUG
        
        if (data.success && data.negocios) {
            // Verificar si data.negocios es un array de objetos o de arrays
            if (Array.isArray(data.negocios) && data.negocios.length > 0) {
                
                // CASO 1: Si son arrays (como viene de Excel)
                if (Array.isArray(data.negocios[0])) {
                    console.log('📊 Formato: Array de arrays');
                    negocios = data.negocios.map((fila, index) => {
                        // Mapear según las columnas de tu Excel:
                        // [fecha, titulo, tipo, ciudad, categoria, descripcion, whatsapp, email, web]
                        return {
                            id: index + 1,
                            fecha: fila[0] || '',
                            titulo: fila[1] || 'Sin título',
                            tipo: fila[2] || 'negocio',
                            ciudad: fila[3] || 'Córdoba',
                            categoria: fila[4] || 'Otros Servicios',  // <-- COLUMNA DE CATEGORÍA
                            descripcion: fila[5] || '',
                            whatsapp: fila[6] || '',
                            email: fila[7] || '',
                            web: formatearURL(fila[8] || '')
                        };
                    });
                } 
                // CASO 2: Si ya son objetos
                else {
                    console.log('📊 Formato: Array de objetos');
                    negocios = data.negocios.map(negocio => ({
                        id: negocio.id || Date.now(),
                        titulo: negocio.titulo || negocio[1] || 'Sin título',
                        tipo: negocio.tipo || negocio[2] || 'negocio',
                        ciudad: negocio.ciudad || negocio[3] || 'Córdoba',
                        categoria: negocio.categoria || negocio[4] || 'Otros Servicios',  // <-- CATEGORÍA
                        descripcion: negocio.descripcion || negocio[5] || '',
                        whatsapp: negocio.whatsapp || negocio[6] || '',
                        email: negocio.email || negocio[7] || '',
                        web: formatearURL(negocio.web || negocio[8] || '')
                    }));
                }
                
                console.log('✅ Negocios procesados:', negocios);
            } else {
                negocios = [];
            }
        } else {
            // Fallback a localStorage
            negocios = JSON.parse(localStorage.getItem('negociosWalfordf')) || [];
            console.log('📦 Usando localStorage:', negocios);
        }
    } catch (error) {
        console.error('❌ Error cargando desde Google Sheets:', error);
        negocios = JSON.parse(localStorage.getItem('negociosWalfordf')) || [];
        mostrarNotificacion('Usando datos locales. Verifica tu conexión a internet.', 'info');
    }
    
    // Asegurar que todos tengan categoría
    negocios = negocios.map(n => ({
        ...n,
        categoria: n.categoria || 'Otros Servicios'
    }));
    
    mostrarNegocios(negocios);
    actualizarContador(negocios.length);
}

// Guardar negocio en Google Sheets
async function guardarNegocio(negocio) {
    try {
        const webFormateada = formatearURL(negocio.web);
        
        // Crear FormData
        const formData = new FormData();
        formData.append('action', 'add');
        formData.append('titulo', negocio.titulo);
        formData.append('tipo', negocio.tipo);
        formData.append('ciudad', negocio.ciudad);
        formData.append('categoria', negocio.categoria); // <-- SIMPLE Y DIRECTO
        formData.append('descripcion', negocio.descripcion);
        formData.append('whatsapp', negocio.whatsapp || '');
        formData.append('email', negocio.email || '');
        formData.append('web', webFormateada);
        
        console.log('📤 Enviando categoría:', negocio.categoria);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('📥 Respuesta:', result);
        
        if (result.success) {
            guardarEnLocalStorage({...negocio, web: webFormateada});
            mostrarNotificacion('¡Negocio agregado correctamente!', 'success');
            await cargarNegocios();
            return true;
        } else {
            throw new Error(result.error || 'Error al guardar');
        }
        
    } catch (error) {
        console.error('Error:', error);
        guardarEnLocalStorage({...negocio, web: formatearURL(negocio.web)});
        mostrarNotificacion('Guardado localmente', 'info');
        negocios = [...negocios, {...negocio, id: Date.now()}];
        mostrarNegocios(negocios);
        actualizarContador(negocios.length);
        return false;
    }
}

function guardarEnLocalStorage(negocio) {
    const negociosGuardados = JSON.parse(localStorage.getItem('negociosWalfordf')) || [];
    negociosGuardados.push({
        ...negocio,
        web: formatearURL(negocio.web), // <-- Formatear antes de guardar
        id: Date.now(),
        fecha: new Date().toISOString()
    });
    localStorage.setItem('negociosWalfordf', JSON.stringify(negociosGuardados));
}

// Mostrar negocios en el grid
function mostrarNegocios(negociosAMostrar) {
    const grid = document.getElementById('businessGrid');
    
    if (!grid) return;
    
    if (!negociosAMostrar || negociosAMostrar.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-store-alt"></i>
                <h3>No encontramos resultados</h3>
                <p>¡Sé el primero en agregar un negocio!</p>
            </div>
        `;
        return;
    }

    // Generar HTML de las tarjetas (UNA SOLA VEZ)
    const tarjetasHTML = negociosAMostrar.map(negocio => {
        // Construir botones de contacto (SOLO UNA VEZ CADA UNO)
        const botones = [];
        
        // Botón WhatsApp (UNA SOLA VEZ)
        if (negocio.whatsapp) {
            botones.push(`
                <a href="https://wa.me/${negocio.whatsapp}" target="_blank" class="contact-btn whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </a>
            `);
        }
        
        // Botón Email (UNA SOLA VEZ)
        if (negocio.email) {
            botones.push(`
                <a href="mailto:${negocio.email}" class="contact-btn email">
                    <i class="far fa-envelope"></i> Email
                </a>
            `);
        }
        
        // Botón Web (UNA SOLA VEZ) - Usar URL formateada
        if (negocio.web) {
            const urlFormateada = formatearURL(negocio.web); // <-- Asegurar formato
            botones.push(`
                <a href="${urlFormateada}" target="_blank" class="contact-btn website">
                    <i class="fas fa-globe"></i> Web
                </a>
            `);
        }
        
        // Retornar la tarjeta completa
        return `
            <div class="business-card scroll-fade" data-id="${negocio.id || Date.now()}">
                <h3>${negocio.titulo}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                    <span class="business-type ${negocio.tipo}">${negocio.tipo === 'negocio' ? '🏪 Negocio' : '🛠️ Servicio'}</span>
                    <span class="city-badge"><i class="fas fa-map-marker-alt"></i> ${formatearCiudad(negocio.ciudad)}</span>
                    <span class="category-badge"><i class="fas fa-tag"></i> ${formatearCategoria(negocio.categoria)}</span>
                </div>
                <p class="business-description">${negocio.descripcion}</p>
                <div class="contact-buttons">
                    ${botones.join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Insertar en el grid (UNA SOLA VEZ)
    grid.innerHTML = tarjetasHTML;
    
    // Re-inicializar animaciones de scroll
    observarScroll();
}

function formatearCiudad(ciudad) {
    if (!ciudad) return 'Sin especificar';
    
    const ciudades = {
        'cordoba': 'Córdoba',
        'rio ceballos': 'Río Ceballos',
        'tanti': 'Tanti',
        'la calera': 'La Calera',
        'saldan': 'Saldán',
        'mendiolaza': 'Mendiolaza',
        'otro': 'Otra ciudad'
    };
    
    return ciudades[ciudad.toLowerCase()] || ciudad;
}

// Filtrar negocios
function filtrarNegocios() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filtroActivo = document.querySelector('.filter-btn.active')?.dataset.filter || 'todos';
    const ciudadFiltro = document.getElementById('cityFilter')?.value || 'todas';
    const categoriaFiltro = document.getElementById('categoryFilter')?.value || 'todas';
    
    let negociosFiltrados = negocios.filter(negocio => {
        // Filtrar por tipo
        if (filtroActivo !== 'todos' && negocio.tipo !== filtroActivo) {
            return false;
        }
        
        // Filtrar por ciudad
        if (ciudadFiltro !== 'todas' && negocio.ciudad !== ciudadFiltro) {
            return false;
        }
        
        // Filtrar por categoría
        if (categoriaFiltro !== 'todas' && negocio.categoria !== categoriaFiltro) {
            return false;
        }
        
        // Buscar por término
        if (searchTerm) {
            return negocio.titulo.toLowerCase().includes(searchTerm) ||
                   negocio.descripcion.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
    
    mostrarNegocios(negociosFiltrados);
    actualizarContador(negociosFiltrados.length);
}

function actualizarContador(cantidad) {
    const contador = document.getElementById('resultsCount');
    if (contador) {
        contador.textContent = cantidad;
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarNegocios);
    }
    
    // Filtros de tipo
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtrarNegocios();
        });
    });
    
    // Filtro de ciudad
    const cityFilter = document.getElementById('cityFilter');
    if (cityFilter) {
        cityFilter.addEventListener('change', filtrarNegocios);
    }
    
    // Filtro de categoría
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filtrarNegocios);
    }
    
    // Modal
    const modal = document.getElementById('businessModal');
    const fab = document.getElementById('openFormBtn');
    const closeBtn = document.querySelector('.close');
    
    if (fab) {
        fab.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModal);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
    
    // Formulario
    const form = document.getElementById('businessForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

function cerrarModal() {
    const modal = document.getElementById('businessModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        const form = document.getElementById('businessForm');
        if (form) form.reset();
        
        const messageDiv = document.getElementById('formMessage');
        if (messageDiv) {
            messageDiv.style.display = 'none';
            messageDiv.innerHTML = '';
        }
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
    
    if (!submitBtn || !formMessage) return;
    
    // Recoger datos - SIN MODIFICACIONES RARAS
    const negocio = {
        titulo: document.getElementById('titulo')?.value || '',
        tipo: document.querySelector('input[name="tipo"]:checked')?.value || 'negocio',
        ciudad: document.getElementById('ciudad')?.value || '',
        categoria: document.getElementById('categoria')?.value || '', // Tal cual del select
        descripcion: document.getElementById('descripcion')?.value || '',
        whatsapp: document.getElementById('whatsapp')?.value || '',
        email: document.getElementById('email')?.value || '',
        web: document.getElementById('web')?.value || '',
        fecha: new Date().toISOString()
    };
    
    console.log('📝 Datos del formulario:', negocio);
    
    // Validaciones
    if (!negocio.titulo || !negocio.descripcion || !negocio.ciudad) {
        mostrarMensaje('Por favor completá los campos obligatorios', 'error', formMessage);
        return;
    }
    
    if (!negocio.categoria) {
        mostrarMensaje('Por favor seleccioná una categoría', 'error', formMessage);
        return;
    }
    
    if (!negocio.whatsapp && !negocio.email && !negocio.web) {
        mostrarMensaje('Debés proporcionar al menos un medio de contacto', 'error', formMessage);
        return;
    }
    
    // Deshabilitar botón
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    // Guardar
    const exito = await guardarNegocio(negocio);
    
    if (exito) {
        mostrarMensaje('¡Negocio agregado con éxito!', 'success', formMessage);
        document.getElementById('businessForm').reset();
        setTimeout(() => cerrarModal(), 2000);
    } else {
        mostrarMensaje('Negocio guardado localmente. Se sincronizará automáticamente.', 'info', formMessage);
        setTimeout(() => cerrarModal(), 2000);
    }
    
    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Negocio';
    }, 2000);
}

function mostrarMensaje(texto, tipo, elemento) {
    if (!elemento) return;
    
    elemento.textContent = texto;
    elemento.className = `message ${tipo}`;
    elemento.style.display = 'block';
}

function mostrarNotificacion(texto, tipo) {
    // Crear notificación flotante temporal
    const notificacion = document.createElement('div');
    notificacion.className = `message ${tipo}`;
    notificacion.style.position = 'fixed';
    notificacion.style.top = '20px';
    notificacion.style.right = '20px';
    notificacion.style.zIndex = '3000';
    notificacion.style.maxWidth = '300px';
    notificacion.style.boxShadow = '0 5px 20px rgba(0,0,0,0.2)';
    notificacion.textContent = texto;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.remove();
    }, 5000);
}

// Observador de scroll para animaciones
function observarScroll() {
    const elementos = document.querySelectorAll('.scroll-fade');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    elementos.forEach(elemento => observer.observe(elemento));
}
setTimeout(() => {
    console.log('📊 NEGOCIOS EN MEMORIA:');
    negocios.forEach((n, i) => {
        console.log(`${i + 1}. ${n.titulo} - Categoría: "${n.categoria}"`);
    });
}, 2000);