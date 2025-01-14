/*
 * **************************************************************************************
 * Original work Copyright (C) 2024 FoE-Helper team
 * Modified work Copyright (C) 2024 Forge of Games team
 * 
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * Original source: https://github.com/mainIine/foe-helfer-extension/
 * Modified source: https://github.com/IngweLand/hoh-helper/
 *
 * This file is a modified version of the original FoE-Helper extension
 * Modified for the needs of Forge of Games
 * **************************************************************************************
 */

(function() {
    // Initialize startup data handler
    const StartupDataHandler = {
        startupData: null,

        init: function() {
            // Add raw handler to capture startup data
            HoHproxy.addRawHandler((xhr, requestData) => {
                if (xhr.responseURL.endsWith('game/startup')) {
                    this.handleStartupResponse(xhr);
                }
            });
        },

        handleStartupResponse: function(xhr) {
            if (xhr.response instanceof ArrayBuffer || xhr.response instanceof Uint8Array) {
                const bytes = new Uint8Array(xhr.response instanceof ArrayBuffer ? xhr.response : xhr.response.buffer);
                
                // Convert to base64 in chunks
                const chunkSize = 8192;
                let binary = '';
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    const chunk = bytes.slice(i, i + chunkSize);
                    binary += String.fromCharCode.apply(null, chunk);
                }
                
                try {
                    this.startupData = btoa(binary);
                    this.createCopyButton();
                } catch (err) {
                    console.error('Failed to process startup data:', err);
                }
            }
        },

        createCopyButton: function() {
            let button = document.getElementById('capture-startup-btn');
            
            if (!button) {
                button = document.createElement('div');
                button.id = 'capture-startup-btn';
                button.innerHTML = 'Copy Data';
                
                // Style the button
                Object.assign(button.style, {
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: '5px',
                    zIndex: '9999',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                });

                // Add hover effects
                button.onmouseover = () => button.style.backgroundColor = '#45a049';
                button.onmouseout = () => button.style.backgroundColor = '#4CAF50';

                document.body.appendChild(button);
            }

            // Update click handler
            button.onclick = async () => {
                if (!this.startupData) {
                    this.showButtonFeedback(button, 'No data available', '#f44336');
                    return;
                }

                try {
                    await navigator.clipboard.writeText(this.startupData);
                    this.showButtonFeedback(button, 'Copied!', '#2196F3');
                } catch (err) {
                    console.error('Failed to copy:', err);
                    this.showButtonFeedback(button, 'Failed to copy', '#f44336');
                }
            };
        },

        showButtonFeedback: function(button, text, color) {
            const originalText = button.innerHTML;
            const originalColor = '#4CAF50';
            
            button.innerHTML = text;
            button.style.backgroundColor = color;
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.backgroundColor = originalColor;
            }, 2000);
        }
    };

    // Initialize when DOM is ready
    document.addEventListener("DOMContentLoaded", function() {
        StartupDataHandler.init();
    });

})();