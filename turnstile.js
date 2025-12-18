/**
 * Cloudflare Turnstile Integration for Kotlin/Wasm
 * This JavaScript file handles the Turnstile widget rendering
 */

// Global Turnstile manager
window.TurnstileManager = {
    widgets: new Map(),
    callbacks: new Map(),

    /**
     * Initialize and render a Turnstile widget
     */
    render: function(containerId, siteKey, theme, size, onVerify, onError, onExpire) {
        console.log('TurnstileManager.render called', {containerId, siteKey, theme, size});
        
        // Create container if it doesn't exist
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'turnstile-widget-container';
            container.style.cssText = `
                width: 100%;
                max-width: 400px;
                min-height: ${size === 'compact' ? '120px' : '65px'};
                margin: 0 auto;
                display: flex !important;
                justify-content: center;
                align-items: center;
                padding: 16px;
                box-sizing: border-box;
                z-index: 999999;
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.98);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                pointer-events: auto;
            `;
            
            // Look for our marker div first
            const marker = document.getElementById('marker-' + containerId);
            if (marker && marker.parentNode) {
                // Insert the container before the marker
                marker.parentNode.insertBefore(container, marker);
                console.log('Created container:', containerId, 'inserted before marker');
            } else {
                // Fallback: Try to find a good insertion point in the DOM
                const insertionPoint = this.findInsertionPoint();
                insertionPoint.appendChild(container);
                console.log('Created container:', containerId, 'appended to:', insertionPoint.tagName || 'BODY');
            }
        }

        // Store callbacks for this container
        this.callbacks.set(containerId, {
            onVerify: onVerify,
            onError: onError,
            onExpire: onExpire
        });

        // Wait for Turnstile to be ready
        if (typeof turnstile === 'undefined') {
            console.error('Turnstile not loaded yet');
            return null;
        }

        try {
            const widgetId = turnstile.render('#' + containerId, {
                sitekey: siteKey,
                theme: theme,
                size: size,
                callback: (token) => {
                    console.log('Turnstile verification successful');
                    if (onVerify) onVerify(token);
                },
                'error-callback': () => {
                    console.error('Turnstile verification error');
                    if (onError) onError();
                },
                'expired-callback': () => {
                    console.log('Turnstile token expired');
                    if (onExpire) onExpire();
                }
            });

            this.widgets.set(containerId, widgetId);
            console.log('Turnstile widget rendered successfully:', widgetId);
            
            // Force visibility of the container and its children
            setTimeout(() => {
                this.ensureVisibility(container);
            }, 200);
            
            return widgetId;
        } catch (error) {
            console.error('Error rendering Turnstile widget:', error);
            return null;
        }
    },
    
    /**
     * Ensure the widget is visible by checking all child elements
     */
    ensureVisibility: function(container) {
        if (!container) return;
        
        console.log('Ensuring visibility for container:', container.id);
        
        // Force container visibility
        container.style.display = 'flex !important';
        container.style.visibility = 'visible !important';
        container.style.opacity = '1 !important';
        
        // Find all child divs and iframes
        const children = container.querySelectorAll('*');
        children.forEach(child => {
            const computed = window.getComputedStyle(child);
            console.log('Child element:', child.tagName, 'display:', computed.display, 'visibility:', computed.visibility);
            
            // Force visibility
            child.style.display = computed.display === 'none' ? 'block' : computed.display;
            child.style.visibility = 'visible';
            child.style.opacity = '1';
            
            // Special handling for iframes
            if (child.tagName === 'IFRAME') {
                child.style.display = 'block !important';
                child.style.visibility = 'visible !important';
                child.style.opacity = '1 !important';
                child.style.width = '300px';
                child.style.height = '65px';
                child.style.border = 'none';
                console.log('Forced iframe visibility:', child.id);
            }
        });
        
        // Also check for shadow roots
        if (container.shadowRoot) {
            console.log('Found shadow root');
            const shadowChildren = container.shadowRoot.querySelectorAll('*');
            shadowChildren.forEach(child => {
                child.style.display = 'block';
                child.style.visibility = 'visible';
                child.style.opacity = '1';
            });
        }
    },

    /**
     * Find the best insertion point in the DOM
     */
    findInsertionPoint: function() {
        // Find all divs and get the deepest one that's visible
        const allDivs = Array.from(document.querySelectorAll('div'));
        
        // Filter for visible divs
        const visibleDivs = allDivs.filter(div => {
            const style = window.getComputedStyle(div);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   div.offsetParent !== null;
        });
        
        // Return the last visible div (likely the deepest in the tree)
        // or fall back to body
        return visibleDivs[visibleDivs.length - 1] || document.body;
    },

    /**
     * Remove a widget
     */
    remove: function(widgetId, containerId) {
        if (widgetId && typeof turnstile !== 'undefined') {
            try {
                turnstile.remove(widgetId);
                console.log('Removed Turnstile widget:', widgetId);
            } catch (error) {
                console.error('Error removing Turnstile widget:', error);
            }
        }

        if (containerId) {
            const container = document.getElementById(containerId);
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
                console.log('Removed container:', containerId);
            }
            this.widgets.delete(containerId);
            this.callbacks.delete(containerId);
        }
    },

    /**
     * Reset a widget
     */
    reset: function(widgetId) {
        if (widgetId && typeof turnstile !== 'undefined') {
            try {
                turnstile.reset(widgetId);
                console.log('Reset Turnstile widget:', widgetId);
            } catch (error) {
                console.error('Error resetting Turnstile widget:', error);
            }
        }
    },

    /**
     * Check if Turnstile is loaded
     */
    isLoaded: function() {
        return typeof turnstile !== 'undefined';
    },

    /**
     * Load Turnstile script
     */
    loadScript: function(onLoad) {
        if (this.isLoaded()) {
            console.log('Turnstile already loaded');
            if (onLoad) onLoad();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('Turnstile script loaded successfully');
            if (onLoad) onLoad();
        };
        script.onerror = () => {
            console.error('Failed to load Turnstile script');
        };
        document.head.appendChild(script);
    }
};

// Make it available globally
console.log('TurnstileManager initialized');

