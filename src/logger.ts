interface Logger {
    verbose: (message: string) => void;
    debug: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string, err?: any) => void;
}

const getLogger = (tag?: string): Logger => {
    const prefix: string = "[HoH-Helper]";

    const formatMessage = function(message: string, logLevel: string): string {
        const tagPart = tag ? `<${tag}>: ` : ":";
        logLevel = `[${logLevel}]`;
        return `${prefix} ${logLevel} ${tagPart}${message}`;
    };
    return {
        verbose(message: string): void {
            console.log(formatMessage(message, "VERBOSE"));
        },

        debug(message: string): void {
            console.debug(formatMessage(message, "DEBUG"));
        },

        info(message: string): void {
            console.info(formatMessage(message, "INFO"));
        },

        warn(message: string): void {
            console.warn(formatMessage(message, "WARN"));
        },

        error(message: string, err?: any): void {
            console.error(formatMessage(message, "ERROR"), err);
        }
    };
};


export default getLogger;
