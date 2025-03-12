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

import { HohProxyData, HohRequestData } from "../types/types";

const HohProxy = (() => {
    const requestInfoHolder = new WeakMap<XMLHttpRequest, HohRequestData>();

    function getRequestData(xhr: XMLHttpRequest): HohRequestData {
        let data = requestInfoHolder.get(xhr);
        if (data) return data;

        data = { url: "", method: "", postData: null };
        requestInfoHolder.set(xhr, data);
        return data;
    }

    // Handler maps
    const proxyRaw: ((data: HohProxyData) => void)[] = [];

    // Capture original XHR methods
    const XHR = XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;

    // Override open method
    XHR.open = function(
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async: boolean = true,
        username?: string | null,
        password?: string | null
    ): void {
        const data = getRequestData(this);
        data.method = method;
        data.url = url;
        return originalOpen.apply(this, [method, url, async, username, password]);
    };

    // Override send method
    XHR.send = function(postData?: Document | XMLHttpRequestBodyInit | null): void {
        const data = getRequestData(this);
        data.postData = postData;
        this.addEventListener("load", xhrOnLoadHandler, {
            capture: false,
            passive: true
        });
        return originalSend.apply(this, [postData]);
    };

    function xhrOnLoadHandler(this: XMLHttpRequest): void {
        const data: HohProxyData = {
            request: getRequestData(this),
            response: this.response,
            responseURL: this.responseURL
        };

        // Execute raw handlers
        for (const callback of proxyRaw) {
            try {
                callback(data);
            } catch (e) {
                console.error("[HoH-helper] Error in raw handler:", e);
            }
        }
    }

    return {
        // Add handler for raw XHR responses
        addRawHandler: (callback: (data: HohProxyData) => void): void => {
            if (!proxyRaw.includes(callback)) {
                proxyRaw.push(callback);
            }
        },

        // Remove raw handler
        removeRawHandler: (callback: (data: HohProxyData) => void): void => {
            const index = proxyRaw.indexOf(callback);
            if (index !== -1) {
                proxyRaw.splice(index, 1);
            }
        }
    };
})();

export default HohProxy;
