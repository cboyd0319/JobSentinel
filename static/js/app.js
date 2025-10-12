/**
 * JobSentinel Frontend Enhancement
 * Provides progressive enhancement for improved UX
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
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
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
