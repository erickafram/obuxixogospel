// Search Toggle Inline
const searchToggle = document.getElementById('searchToggle');
const searchForm = document.getElementById('searchForm');
const searchCloseInline = document.getElementById('searchCloseInline');

if (searchToggle) {
    searchToggle.addEventListener('click', () => {
        searchToggle.classList.add('hidden');
        searchForm.classList.add('active');
        const searchInput = searchForm.querySelector('.search-input-inline');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    });
}

if (searchCloseInline) {
    searchCloseInline.addEventListener('click', () => {
        searchForm.classList.remove('active');
        searchToggle.classList.remove('hidden');
    });
}

// Fechar busca ao clicar fora
document.addEventListener('click', (e) => {
    if (searchForm && searchToggle) {
        if (!searchForm.contains(e.target) && !searchToggle.contains(e.target)) {
            searchForm.classList.remove('active');
            searchToggle.classList.remove('hidden');
        }
    }
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const closeMenu = document.getElementById('closeMenu');
const mobileMenu = document.getElementById('mobileMenu');
const menuOverlay = document.getElementById('menuOverlay');

if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const isActive = mobileMenu.classList.contains('active');
        
        if (isActive) {
            mobileMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            mobileMenu.classList.add('active');
            menuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
}

if (closeMenu) {
    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
}

if (menuOverlay) {
    menuOverlay.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Share Buttons
const shareButtons = document.querySelectorAll('.share-btn');
shareButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = window.location.href;
        const title = document.querySelector('.article-title')?.textContent || 'Obuxixo Gospel';

        if (btn.classList.contains('facebook')) {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
        } else if (btn.classList.contains('twitter')) {
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
        } else if (btn.classList.contains('whatsapp')) {
            window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
        } else if (btn.classList.contains('linkedin')) {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
        }
    });
});

// Lazy Loading Images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Search Input Focus
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('focus', () => {
        searchInput.parentElement.style.boxShadow = '0 0 0 2px rgba(255, 107, 0, 0.3)';
    });

    searchInput.addEventListener('blur', () => {
        searchInput.parentElement.style.boxShadow = 'none';
    });
}

// Back to Top Button (Optional)
const createBackToTop = () => {
    const btn = document.createElement('button');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    btn.className = 'back-to-top';
    btn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: #FF6B00;
        color: white;
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
        z-index: 1000;
        transition: all 0.3s ease;
    `;

    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            btn.style.display = 'flex';
        } else {
            btn.style.display = 'none';
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#E65100';
        btn.style.transform = 'scale(1.1)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = '#FF6B00';
        btn.style.transform = 'scale(1)';
    });
};

// Initialize Back to Top
createBackToTop();

// Newsletter Subscription
async function subscribeNewsletter(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const button = form.querySelector('button');
    const originalHTML = button.innerHTML;
    
    // Validação básica
    if (!email || !email.includes('@')) {
        alert('⚠️ Por favor, insira um e-mail válido');
        return false;
    }
    
    // Mostrar loading
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscrevendo...';
    
    try {
        const response = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Sucesso
            button.innerHTML = '<i class="fas fa-check"></i> Inscrito!';
            button.style.background = '#4CAF50';
            
            // Limpar formulário
            form.reset();
            
            // Mostrar mensagem
            alert('✅ ' + data.message);
            
            // Restaurar botão após 3 segundos
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = originalHTML;
                button.style.background = '';
            }, 3000);
        } else {
            // Erro
            alert('⚠️ ' + data.message);
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    } catch (error) {
        console.error('Erro ao inscrever:', error);
        alert('❌ Erro ao processar inscrição. Tente novamente.');
        button.disabled = false;
        button.innerHTML = originalHTML;
    }
    
    return false;
}

// Console Log
console.log('%c🌐 Obuxixo Gospel', 'color: #FF6B00; font-size: 20px; font-weight: bold;');
console.log('%cDesenvolvido com Node.js + Express + Mysql / Erick Vinciius', 'color: #666; font-size: 12px;');
