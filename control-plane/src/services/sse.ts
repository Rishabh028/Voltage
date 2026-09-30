import { Request, Response } from 'express';
import { StateService } from './state.js';
import { config } from '../config.js';
import { Redis } from 'ioredis';
import { logEmitter } from './events.js';

const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
redis.on('error', () => {});
const state = new StateService(redis);

export function streamDeploymentEvents(req: Request, res: Response): void {
  const { id } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  let isAlive = true;
  const heartbeat = setInterval(() => {
    if (isAlive) res.write(': heartbeat\n\n');
  }, 15000);

  // In-memory event emitter listener
  const onLocalLog = (message: string) => {
    if (isAlive) {
      res.write(`data: ${message}\n\n`);
    }
  };
  logEmitter.on(`log:${id}`, onLocalLog);

  const subscriber = new Redis(config.REDIS_URL, { lazyConnect: true });
  subscriber.on('error', () => {});
  const channel = `logs:${id}:channel`;
  
  const setupStream = async () => {
    try {
      const existingLogs = await state.getLogs(id);
      for (const log of existingLogs) {
        res.write(`data: ${log}\n\n`);
      }
      
      await subscriber.subscribe(channel).catch(() => {});
      subscriber.on('message', (chan, message) => {
        if (chan === channel && isAlive) {
          res.write(`data: ${message}\n\n`);
        }
      });
    } catch (err) {
      console.error('SSE setup notice:', err);
    }
  };
  
  setupStream();
  
  req.on('close', () => {
    isAlive = false;
    clearInterval(heartbeat);
    logEmitter.off(`log:${id}`, onLocalLog);
    subscriber.unsubscribe(channel).catch(() => {});
    subscriber.quit().catch(() => {});
    res.end();
  });
}
