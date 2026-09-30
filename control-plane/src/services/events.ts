import { EventEmitter } from 'events';

export const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(100);