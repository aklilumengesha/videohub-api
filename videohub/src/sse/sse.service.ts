import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

export interface SseEvent {
  type: string;
  data: unknown;
}

@Injectable()
export class SseService {
  // Map of userId → active SSE response
  private clients = new Map<string, Response>();

  /**
   * Register a new SSE client connection.
   * Sets up keep-alive ping every 25s to prevent proxy timeouts.
   */
  addClient(userId: string, res: Response): void {
    // Close any existing connection for this user
    this.removeClient(userId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    this.clients.set(userId, res);

    // Send a connected confirmation
    this.sendToUser(userId, { type: 'connected', data: { userId } });

    // Keep-alive ping every 25 seconds
    const ping = setInterval(() => {
      if (this.clients.has(userId)) {
        res.write(': ping\n\n');
      } else {
        clearInterval(ping);
      }
    }, 25000);

    // Clean up when client disconnects
    res.on('close', () => {
      clearInterval(ping);
      this.clients.delete(userId);
    });
  }

  removeClient(userId: string): void {
    const existing = this.clients.get(userId);
    if (existing) {
      try { existing.end(); } catch { /* already closed */ }
      this.clients.delete(userId);
    }
  }

  sendToUser(userId: string, event: SseEvent): void {
    const res = this.clients.get(userId);
    if (!res) return;

    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    } catch {
      // Client disconnected mid-write
      this.clients.delete(userId);
    }
  }

  get connectedCount(): number {
    return this.clients.size;
  }
}
