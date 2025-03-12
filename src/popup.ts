import {
    dataCollectionCategories,
    dataCollectionSettingsStorageKey, extensionHelpPage,
    fogHohApiBaseUrl,
    startupDataStorageKey
} from "./constants";
import { DataCollectionSettings, ImportInGameStartupDataRequestDto, ResourceCreatedResponse } from "./types/types";
import getLogger from "./logger";

const exportDataButtonLabel = "Export Game Data";
const waitingForDataButtonLabel = "Waiting for data...";
const exportingDataButtonLabel = "Exporting...";
const logger = getLogger("popup");
document.addEventListener("DOMContentLoaded", async function() {
    const checkboxContainer = document.getElementById("checkboxContainer") as HTMLElement;
    const exportToFogButton = document.getElementById("exportToFogButton") as HTMLButtonElement;
    const enableAllButton = document.getElementById("enableAllButton") as HTMLButtonElement;

    function createCheckboxes(): void {
        dataCollectionCategories.forEach(category => {
            const item = document.createElement("div");
            item.className = "checkbox-item";

            const container = document.createElement("div");
            container.className = "checkbox-container";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = category.id;

            const label = document.createElement("label");
            label.className = "checkbox-label";
            label.htmlFor = category.id;
            label.textContent = category.label;

            const description = document.createElement("span");
            description.className = "checkbox-description";
            description.textContent = category.description;

            container.appendChild(checkbox);
            container.appendChild(label);
            item.appendChild(container);
            label.appendChild(description);
            checkboxContainer.appendChild(item);
        });
    }

    function loadSettings(): void {
        chrome.storage.sync.get(dataCollectionSettingsStorageKey, function(result) {
            const settings: DataCollectionSettings = result[dataCollectionSettingsStorageKey] || {};

            dataCollectionCategories.forEach(category => {
                const checkbox = document.getElementById(category.id) as HTMLInputElement;
                checkbox.checked = settings[category.id] || false;
            });
        });
    }

    function attachCheckboxListeners(): void {
        dataCollectionCategories.forEach(category => {
            const checkbox = document.getElementById(category.id) as HTMLInputElement;
            if (checkbox) {
                checkbox.addEventListener("change", function(e: Event) {
                    const target = e.target as HTMLInputElement;

                    chrome.storage.sync.get(dataCollectionSettingsStorageKey, async function(result) {
                        const settings: DataCollectionSettings = result[dataCollectionSettingsStorageKey] || {};
                        settings[category.id] = target.checked;
                        await chrome.storage.sync.set({ [dataCollectionSettingsStorageKey]: settings });
                    });
                });
            }
        });
    }

    async function updateExportDataState(): Promise<void> {
        if (await hasStartupData()) {
            enableExportButton();
        } else {
            exportToFogButton.disabled = true;
            exportToFogButton.textContent = waitingForDataButtonLabel;
        }
    }

    chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area === "local") {
            if (await hasStartupData()) {
                enableExportButton();
            }
        }
    });

    exportToFogButton.addEventListener("click", async function() {
        exportToFogButton.disabled = true;
        exportToFogButton.textContent = exportingDataButtonLabel;

        const data = await getStartupData();
        if (data === null) {
            return;
        }
        try {
            logger.info("Exporting startup data");
            const payload: ImportInGameStartupDataRequestDto = {
                inGameStartupData: data
            };
            const apiResponse = await fetch(`${fogHohApiBaseUrl}/inGameData`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const response: ResourceCreatedResponse = await apiResponse.json();
            if (response.webResourceUrl) {
                await chrome.tabs.create({ url: response.webResourceUrl });
                logger.info("Exported startup data");
            }
        } catch (error) {
            logger.error("Failed exporting startup data:", error);
        }
        enableExportButton();
    });

    async function hasStartupData(): Promise<boolean> {
        const startupData = await getStartupData();
        return startupData !== null;
    }

    async function getStartupData(): Promise<string | null> {
        const result = await chrome.storage.local.get([startupDataStorageKey]);
        return result[startupDataStorageKey] || null;
    }

    function enableExportButton(): void {
        exportToFogButton.textContent = exportDataButtonLabel;
        exportToFogButton.disabled = false;
    }

    enableAllButton.addEventListener("click", async function() {
        dataCollectionCategories.forEach(category => {
            const checkbox = document.getElementById(category.id) as HTMLInputElement;
            checkbox.checked = true;
        });

        const newSettings: DataCollectionSettings = dataCollectionCategories.reduce((settings, category) => {
            settings[category.id] = true;
            return settings;
        }, {} as DataCollectionSettings);

        await chrome.storage.sync.set({ [dataCollectionSettingsStorageKey]: newSettings });
    });

    document.getElementById("helpButton")?.addEventListener("click", async function() {
        await chrome.tabs.create({ url: extensionHelpPage });
    });

    createCheckboxes();
    loadSettings();
    attachCheckboxListeners();
    await updateExportDataState();
});