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
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
                bsAlert.close();
            }, 5000);
        });
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

})();
