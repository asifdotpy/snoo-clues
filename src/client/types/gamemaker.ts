/**
 * GameMaker Runtime Type Definitions
 *
 * This module contains type declarations for the GameMaker HTML5 runtime
 * and its integration with the browser environment.
 */

declare global {
    interface Window {
        Module: any;
        GM_tick?: (time: number) => void;
        onGameSetWindowSize?: (width: number, height: number) => void;
        manifestFiles?: () => string;
        manifestFilesMD5?: () => string[];
        log_next_game_state?: () => void;
        wallpaper_update_config?: (config: string) => void;
        wallpaper_reset_config?: () => void;
        setAddAsyncMethod?: (method: any) => void;
        setJSExceptionHandler?: (handler: any) => void;
        hasJSExceptionHandler?: () => boolean;
        doJSExceptionHandler?: (exceptionJSON: string) => void;
        setWadLoadCallback?: (callback: any) => void;
        onFirstFrameRendered?: () => void;
        triggerAd?: (adId: string, ...callbacks: any[]) => void;
        triggerPayment?: (itemId: string, callback: any) => void;
        toggleElement?: (id: string) => void;
        set_acceptable_rollback?: (frames: number) => void;
        report_stats?: (statsData: any) => void;
        g_pAddAsyncMethod?: any;
        g_pJSExceptionHandler?: any;
        g_pWadLoadCallback?: any;
        dispatchMascotAction?: (actionType: string) => void;
    }
}

/**
 * GameMaker callback function for mascot reactions
 * This is called from the HTML5/JavaScript layer to trigger animations in GameMaker
 */
declare function gmCallback_mascot_react(actionType: string): void;

export { };
