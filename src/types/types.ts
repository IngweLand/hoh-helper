export interface DataCollectionCategory {
    id: string;
    label: string;
    description: string;
    gameEndpoint: string[];
}

export interface CategorizedDataCollectionEndpoint {
    urlPattern: string;
    categoryId: string;
}

export type HohRequestData = {
    url: string | URL;
    method: string;
    postData: Document | XMLHttpRequestBodyInit | null | undefined;
};

export type HohProxyData = {
    request: HohRequestData;
    response: unknown;
    responseURL: string;
};

export type WebPageMessagePayload = {
    source: string;
    event: string;
    base64RequestData: string;
    base64ResponseData: string;
    responseURL: string;
}

export interface DataCollectionSettings {
    [categoryId: string]: boolean;
}

export interface DataCollectionTimings {
    [categoryId: string]: string;
}

export type ImportInGameStartupDataRequestDto = {
    inGameStartupData: string;
}
export type ResourceCreatedResponse = {
    apiResourceUrl: string;
    resourceId: string;
    webResourceUrl: string;
}
export type HohHelperResponseDto = {
    base64ResponseData?: string;
    responseURL: string;
    collectionCategoryIds: string[];
}

