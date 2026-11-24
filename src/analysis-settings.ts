export const DEFAULT_WORKERS=16;
export const MAX_WORKERS=32;
export function isWorkerCount(value:unknown):value is number {
 return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=MAX_WORKERS;
}
