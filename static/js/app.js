/**
 * JobSentinel Frontend Enhancement - World-Class Edition
 * Provides progressive enhancement for improved UX
 * WCAG 2.2 AA Compliant | Performance Optimized | User-Centric
 */

(function() {
    'use strict';

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        enhanceNavigation();
        enhanceForms();
        enhanceAlerts();
        initAccessibility();
        addLoadingStates();
        enhanceCards();
        initTooltips();
        logPerformanceMetrics();
        initScrollReveal();
        initStickyNav();
        initMagneticCards();
        initParallax();
        detectMotionPreference();
        initNavbarToggle();
    }
    
    /**
     * Initialize navbar toggle functionality (Bootstrap replacement)
     */
    function initNavbarToggle() {
        const toggler = document.querySelector('.navbar-toggler');
        const collapse = document.querySelector('.navbar-collapse');
        
        if (!toggler || !collapse) return;
        
        toggler.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                collapse.classList.remove('show');
                this.setAttribute('aria-expanded', 'false');
            } else {
                collapse.classList.add('show');
                this.setAttribute('aria-expanded', 'true');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!toggler.contains(e.target) && !collapse.contains(e.target)) {
                if (collapse.classList.contains('show')) {
                    collapse.classList.remove('show');
                    toggler.setAttribute('aria-expanded', 'false');
                }
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && collapse.classList.contains('show')) {
                collapse.classList.remove('show');
                toggler.setAttribute('aria-expanded', 'false');
                toggler.focus();
            }
        });
    }

    /**
     * Enhance navigation with active state management
     */
    function enhanceNavigation() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    /**
     * Enhance forms with validation and feedback
     */
    function enhanceForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                const submitBtn = form.querySelector('button[type="submit"]');
                
                if (submitBtn) {
                    // Add loading state
                    submitBtn.disabled = true;
                    const originalText = submitBtn.textContent;
                    submitBtn.innerHTML = '<span class="loading"></span> Saving...';
                    
                    // Re-enable after a delay (form will submit before this)
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }, 3000);
                }
            });
        });

        // Auto-resize textareas
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        });
    }

    /**
     * Auto-dismiss alerts after 5 seconds
     */
    function enhanceAlerts() {
        const alerts = document.querySelectorAll('.alert:not(.alert-danger)');
        
        alerts.forEach(alert => {
            setTimeout(() => {
                closeAlert(alert);
            }, 5000);
        });
        
        // Handle manual close buttons
        const closeButtons = document.querySelectorAll('.alert .btn-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const alert = this.closest('.alert');
                if (alert) {
                    closeAlert(alert);
                }
            });
        });
    }
    
    /**
     * Close alert with fade effect
     */
    function closeAlert(alert) {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }

    /**
     * Initialize accessibility features
     */
    function initAccessibility() {
        // Add keyboard navigation for custom elements
        const clickables = document.querySelectorAll('[role="button"]:not(button):not([tabindex])');
        clickables.forEach(el => {
            el.setAttribute('tabindex', '0');
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });

        // Announce page changes for screen readers
        const main = document.querySelector('main');
        if (main) {
            main.setAttribute('aria-live', 'polite');
        }
    }

    /**
     * Add smooth scrolling for skip links
     */
    const skipLink = document.querySelector('.skip-to-main');
    if (skipLink) {
        skipLink.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.setAttribute('tabindex', '-1');
                target.focus();
                
                // Respect reduced motion preference
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                target.scrollIntoView({ 
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start' 
                });
            }
        });
    }

    /**
     * Add loading states to async operations
     */
    function addLoadingStates() {
        // Show loading indicator for page navigation
        document.body.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]:not([target="_blank"])');
            if (link && !link.href.startsWith('#')) {
                const loader = document.createElement('div');
                loader.className = 'loading-overlay';
                loader.innerHTML = '<div class="loading loading-lg"></div>';
                loader.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                `;
                document.body.appendChild(loader);
            }
        });
    }

    /**
     * Enhance card interactions
     */
    function enhanceCards() {
        const cards = document.querySelectorAll('.card, .job-card');
        
        cards.forEach(card => {
            // Add subtle animation on scroll into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.animation = 'fadeInUp 0.5s ease-out';
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(card);
        });
    }

    /**
     * Initialize tooltips
     */
    function initTooltips() {
        const tooltipTriggers = document.querySelectorAll('[data-tooltip]');
        
        tooltipTriggers.forEach(trigger => {
            trigger.addEventListener('mouseenter', showTooltip);
            trigger.addEventListener('mouseleave', hideTooltip);
            trigger.addEventListener('focus', showTooltip);
            trigger.addEventListener('blur', hideTooltip);
        });
        
        function showTooltip(e) {
            const tooltip = e.target.getAttribute('data-tooltip');
            e.target.setAttribute('aria-label', tooltip);
        }
        
        function hideTooltip(e) {
            e.target.removeAttribute('aria-label');
        }
    }

    /**
     * Log performance metrics (for monitoring)
     */
    function logPerformanceMetrics() {
        if ('performance' in window && 'getEntriesByType' in window.performance) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                        console.log('Performance Metrics:', {
                            'DOM Content Loaded': Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart) + 'ms',
                            'Page Load': Math.round(perfData.loadEventEnd - perfData.loadEventStart) + 'ms',
                            'First Paint': Math.round(perfData.responseEnd - perfData.requestStart) + 'ms'
                        });
                    }
                }, 0);
            });
        }
    }

    /**
     * Add fade-in animation CSS if not exists
     */
    if (!document.querySelector('#dynamic-animations')) {
        const style = document.createElement('style');
        style.id = 'dynamic-animations';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @media (prefers-reduced-motion: reduce) {
                @keyframes fadeInUp {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Add copy to clipboard functionality for config/logs
     */
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block.parentNode);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-sm btn-secondary';
        copyBtn.style.position = 'absolute';
        copyBtn.style.top = '10px';
        copyBtn.style.right = '10px';
        copyBtn.textContent = '📋 Copy';
        copyBtn.setAttribute('aria-label', 'Copy code to clipboard');

        copyBtn.addEventListener('click', async function() {
            const text = block.textContent;
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            } catch (err) {
                copyBtn.textContent = '❌ Failed';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            }
        });

        wrapper.insertBefore(copyBtn, block.parentNode);
    });

    /**
     * Scroll-based reveal animations
     */
    function initScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal');
        
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        revealElements.forEach(el => revealObserver.observe(el));
    }

    /**
     * Sticky navigation with scroll effects
     */
    function initStickyNav() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        let lastScroll = 0;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (!prefersReducedMotion) {
                if (currentScroll > 100) {
                    navbar.style.backdropFilter = 'blur(12px) saturate(180%)';
                    navbar.style.background = 'rgba(33, 37, 41, 0.9)';
                    navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    navbar.style.padding = '0.5rem 0';
                } else {
                    navbar.style.backdropFilter = 'none';
                    navbar.style.background = '';
                    navbar.style.boxShadow = 'none';
                    navbar.style.padding = '';
                }
                
                // Hide nav on scroll down, show on scroll up
                if (currentScroll > lastScroll && currentScroll > 500) {
                    navbar.style.transform = 'translateY(-100%)';
                } else {
                    navbar.style.transform = 'translateY(0)';
                }
            }
            
            lastScroll = currentScroll;
        }, { passive: true });
        
        navbar.style.transition = 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    }

    /**
     * Magnetic hover effect for cards
     */
    function initMagneticCards() {
        const cards = document.querySelectorAll('.card');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) return;
        
        cards.forEach(card => {
            card.classList.add('magnetic');
            
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    /**
     * Parallax effect for hero sections
     */
    function initParallax() {
        const parallaxLayers = document.querySelectorAll('.parallax-layer');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion || parallaxLayers.length === 0) return;
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            parallaxLayers.forEach((layer, index) => {
                const speed = (index + 1) * 0.3;
                const yPos = -(scrolled * speed);
                layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
            });
        }, { passive: true });
    }

    /**
     * Detect and respect motion preferences
     */
    function detectMotionPreference() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        function handleMotionPreference(e) {
            if (e.matches) {
                document.body.classList.add('reduce-motion');
                console.log('Motion preference: Reduced motion enabled');
            } else {
                document.body.classList.remove('reduce-motion');
                console.log('Motion preference: Full motion enabled');
            }
        }
        
        handleMotionPreference(mediaQuery);
        mediaQuery.addEventListener('change', handleMotionPreference);
    }

    /**
     * Confetti animation for success states
     */
    window.showConfetti = function() {
        const colors = ['#0f8a4f', '#0056b3', '#0073e6', '#1a8cff'];
        const confettiCount = 30;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                confetti.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 3000);
            }, i * 30);
        }
    };

    /**
     * Smooth scroll to section
     */
    window.smoothScrollTo = function(target) {
        const element = document.querySelector(target);
        if (!element) return;
        
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({ 
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start' 
        });
    };

    /**
     * Dynamic theme switching
     */
    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Announce to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = `Theme switched to ${newTheme} mode`;
        document.body.appendChild(announcement);
        
        setTimeout(() => announcement.remove(), 1000);
    };

    /**
     * Initialize theme from localStorage
     */
    (function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    })();

    /**
     * Add visual feedback for copy operations
     */
    window.copyToClipboard = async function(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.classList.add('success');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('success');
            }, 2000);
            
            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            button.textContent = '❌ Failed';
            
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
            
            return false;
        }
    };

})();
