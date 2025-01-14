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

// separate code from global scope
{
let scripts = {
	main: ["once", "primed"],
	proxy: ["once", "primed"],
	vendor: ["once", "primed"],
	internal: ["once", "primed"]
};
	
function scriptLoaded (src, base) {
	scripts[base].splice(scripts[base].indexOf(src),1);
	if (scripts.internal.length == 1) {
		scripts.internal.splice(scripts.internal.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('hoh-helper#loaded'));
	}
	if (scripts.main.length == 1) {
		scripts.main.splice(scripts.main.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('hoh-helper#mainloaded'));
	}
	if (scripts.proxy.length == 1) {
		scripts.proxy.splice(scripts.proxy.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('hoh-helper#proxyloaded'));
	}
	if (scripts.vendor.length == 1) {
		scripts.vendor.splice(scripts.vendor.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('hoh-helper#vendors-loaded'));
	}
};

inject();


function inject (loadBeta = false, extUrl = chrome.runtime.getURL(''), betaDate='') {
	/**
	 * Loads a JavaScript in the website. The returned promise will be resolved once the code has been loaded.
	 * @param {string} src the URL to load
	 * @param base
	 * @returns {Promise<void>}
	 */
	 function promisedLoadCode(src, base="base") {
		return new Promise(async (resolve, reject) => {
			let sc = document.createElement('script');
			sc.src = src;
			if (scripts[base]) {
				scripts[base].push(src);
			}
			sc.addEventListener('load', function() {
				if (scripts[base]) scriptLoaded(src, base);
				this.remove();
				resolve();
			});
			sc.addEventListener('error', function() {
				console.error('error loading script '+src);
				this.remove();
				reject();
			});
			while (!document.head && !document.documentElement) await new Promise((resolve) => {
				// @ts-ignore
				requestIdleCallback(resolve);
			});
			(document.head || document.documentElement).appendChild(sc);
		});
	}
	
	async function loadJsonResource(file) {
		const response = await fetch(file);
		if (response.status !== 200) {
			throw "Error loading json file "+file;
		}
		return response.json();
	}
	
	// check whether jQuery has been loaded in the DOM
	// => Catch jQuery Loaded event
	const jQueryLoading = new Promise(resolve => {
		window.addEventListener('hoh-helper#jQuery-loaded', evt => {
			resolve();
		}, {capture: false, once: true, passive: true});
	});
	const mainLoaded = new Promise(resolve => {
		window.addEventListener('hoh-helper#mainloaded', evt => {
			resolve();
		}, {capture: false, once: true, passive: true});
	});
	const proxyLoaded = new Promise(resolve => {
		window.addEventListener('hoh-helper#proxyloaded', evt => {
			resolve();
		}, {capture: false, once: true, passive: true});
	});

	
	const v = chrome.runtime.getManifest().version + (loadBeta ? '-beta-'+ betaDate:'');

	let   lng = "en";
	
	InjectCode(loadBeta, extUrl);

	async function InjectCode(loadBeta, extUrl) {
	 	try {
			// set some global variables
			localStorage.setItem("HelperBaseData", JSON.stringify({
				extID: chrome.runtime.id,
				extUrl: extUrl,
				GuiLng: lng,
				extVersion: v,
				isRelease: true,
				devMode: `${!('update_url' in chrome.runtime.getManifest())}`,
				loadBeta: loadBeta
			}));
			
			// Firefox does not support direct communication with background.js but API injections
			// So the the messages have to be forwarded and this exports an API-Function to do so
			if (window.navigator.userAgent.indexOf("Firefox") > -1 && exportFunction && window.wrappedJSObject) {
				function callBgApi(data) {
					return new window.Promise(
						exportFunction(
							function (resolve, reject) {
								if (typeof data !== 'object' || typeof data.type !== 'string') {
									reject('invalid request, data has to be of sceme: {type: string, ...}');
									return;
								}
								// Note: the message is packed, so background.js knows it is an external message, even though it is sent by inject.js
								browser.runtime.sendMessage(chrome.runtime.id, {type: 'packed', data: data})
									.then(
										data => {
											resolve(cloneInto(data, window));
										},
										error => {
											console.error('FoeHelper BgAPI error', error);
											reject("An error occurred while sending the message to the extension");
										}
									);
							}
							, window
						)
					);
				}
				exportFunction(callBgApi, window, {defineAs: 'foeHelperBgApiHandler'});
			}
			// start loading both script-lists
			const vendorListPromise = loadJsonResource(`${extUrl}js/vendor.json`);
			const scriptListPromise = loadJsonResource(`${extUrl}js/internal.json`);
			
			// load foe-Proxy
			await promisedLoadCode(chrome.runtime.getURL('')+`js/hohproxy.js`,"proxy");
			scriptLoaded("primed", "proxy");
			await proxyLoaded;
			// load the main
			await promisedLoadCode(`${extUrl}js/web/_main/js/_main.js`,"main");
			scriptLoaded("primed", "main");
			await mainLoaded;
			
			// wait for ant and i18n to be loaded
			await jQueryLoading;

			// load all vendor scripts first (unknown order)
			const vendorScriptsToLoad = await vendorListPromise;
			for (let i = 0; i < vendorScriptsToLoad.length; i++){
				await promisedLoadCode(`${extUrl}vendor/${vendorScriptsToLoad[i]}.js?v=${v}`,"vendor");
			}
			//await Promise.all(vendorScriptsToLoad.map(vendorScript => promisedLoadCode(`${extUrl}vendor/${vendorScript}.js?v=${v}`,"vendor")));
			
			scriptLoaded("primed", "vendor");
			
			// load scripts (one after the other)
			const internalScriptsToLoad = await scriptListPromise;

			for (let i = 0; i < internalScriptsToLoad.length; i++){
				await promisedLoadCode(`${extUrl}js/web/${internalScriptsToLoad[i]}/js/${internalScriptsToLoad[i]}.js?v=${v}`, "internal");
			}
					
			scriptLoaded("primed", "internal");

		} catch (err) {
			// make sure that the packet buffer in the FoEproxy does not fill up in the event of an incomplete loading.
			window.dispatchEvent(new CustomEvent('hoh-helper#error-loading'));
		}
	}

}
	// End of the separation from the global scope
}
