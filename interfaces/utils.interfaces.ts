export interface CronConfig {
    time: string;
    onTick: () => void;
    start?: boolean;
    time_zone?: string;
    onComplete?: null | (() => void);
}