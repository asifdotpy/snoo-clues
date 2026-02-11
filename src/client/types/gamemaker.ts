/**
 * Global type definitions for GameMaker callbacks and bridge functions
 */

declare global {
  /**
   * Triggers a mascot reaction in GameMaker
   * @param actionType The type of action to trigger (e.g., 'correct', 'wrong', 'reveal')
   */
  function gmCallback_mascot_react(actionType: string): void;

  /**
   * Sets the audio state in GameMaker
   * @param isMuted Whether audio is muted
   */
  function gmCallback_set_audio_state(isMuted: boolean): void;

  /**
   * Triggers background music playback in GameMaker
   */
  function gmCallback_play_bgm(): void;

  /**
   * Triggers background music pause in GameMaker
   */
  function gmCallback_pause_bgm(): void;

  interface Window {
    /**
     * Devvit/GameMaker Module
     */
    Module: any;

    /**
     * Dispatches a mascot action to GameMaker
     */
    dispatchMascotAction?: (actionType: string) => void;

    /**
     * Game instance exposed for testing
     */
    gameInstance?: any;

    // GameMaker runner globals
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
  }
}

export {};
