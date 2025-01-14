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

const HoHproxy = (function () {
    const requestInfoHolder = new WeakMap();
    
    function getRequestData(xhr) {
        let data = requestInfoHolder.get(xhr);
        if (data != null) return data;

        data = { url: null, method: null, postData: null };
        requestInfoHolder.set(xhr, data);
        return data;
    }

    let proxyEnabled = true;

    // Handler maps
    const proxyRaw = [];

    // Capture original XHR methods
    const XHR = XMLHttpRequest.prototype,
        open = XHR.open,
        send = XHR.send;

    // Override open method
    XHR.open = function (method, url) {
        if (proxyEnabled) {
            const data = getRequestData(this);
            data.method = method;
            data.url = url;
        }
        return open.apply(this, arguments);
    };

    // Override send method
    XHR.send = function (postData) {
        if (proxyEnabled) {
            const data = getRequestData(this);
            data.postData = postData;
            this.addEventListener('load', xhrOnLoadHandler, { capture: false, passive: true });
        }
        return send.apply(this, arguments);
    };

    function xhrOnLoadHandler() {
        if (!proxyEnabled) return;

        const requestData = getRequestData(this);
        
        // Execute raw handlers
        for (let callback of proxyRaw) {
            try {
                callback(this, requestData);
            } catch (e) {
                console.error('Error in raw handler:', e);
            }
        }
    }

    // Public API
    return {
        // Add handler for raw XHR responses
        addRawHandler: function (callback) {
            if (proxyRaw.indexOf(callback) !== -1) return; // Already registered
            proxyRaw.push(callback);
        },

        // Remove raw handler
        removeRawHandler: function (callback) {
            const index = proxyRaw.indexOf(callback);
            if (index !== -1) {
                proxyRaw.splice(index, 1);
            }
        }
    };
})();