/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, DataConnection } from 'peerjs';
import { GameEvent } from '../types/game';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export class PeerService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private isHost = false;
  private currentSessionId = '';
  private state: ConnectionState = 'disconnected';
  private onStateChangeCb?: (state: ConnectionState) => void;
  private onEventCb?: (event: GameEvent) => void;
  private reconnectTimer: number | null = null;

  public getState(): ConnectionState {
    return this.state;
  }

  public getSessionId(): string {
    return this.currentSessionId;
  }

  public isConnected(): boolean {
    return this.state === 'connected' && this.conn?.open === true;
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
    if (this.onStateChangeCb) {
      this.onStateChangeCb(newState);
    }
  }

  /**
   * Initialize as Desktop Host
   */
  public initHost(
    onEvent: (event: GameEvent) => void,
    onStateChange: (state: ConnectionState) => void
  ): Promise<string> {
    this.isHost = true;
    this.onEventCb = onEvent;
    this.onStateChangeCb = onStateChange;
    this.setState('connecting');

    // Generate readable random session ID
    const randomHex = Math.random().toString(36).substring(2, 8);
    const hostPeerId = `toddler-drive-${randomHex}`;
    this.currentSessionId = hostPeerId;

    return new Promise((resolve, reject) => {
      this.peer = new Peer(hostPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        this.currentSessionId = id;
        this.setState('disconnected'); // Waiting for client to connect
        resolve(id);
      });

      this.peer.on('connection', (connection) => {
        this.setupConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS Host Error:', err);
        // If ID taken, retry with new random
        if (err.type === 'unavailable-id') {
          const fallbackHex = Math.random().toString(36).substring(2, 9);
          this.currentSessionId = `toddler-drive-${fallbackHex}`;
          this.peer?.destroy();
          this.initHost(onEvent, onStateChange).then(resolve).catch(reject);
          return;
        }
        reject(err);
      });
    });
  }

  /**
   * Initialize as Mobile Controller connecting to host session
   */
  public initClient(
    hostSessionId: string,
    onEvent: (event: GameEvent) => void,
    onStateChange: (state: ConnectionState) => void
  ): void {
    this.isHost = false;
    this.currentSessionId = hostSessionId;
    this.onEventCb = onEvent;
    this.onStateChangeCb = onStateChange;
    this.setState('connecting');

    const clientPeerId = `mobile-ctrl-${Math.random().toString(36).substring(2, 8)}`;
    this.peer = new Peer(clientPeerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    this.peer.on('open', () => {
      this.connectToHost();
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS Client Error:', err);
      this.scheduleReconnect();
    });

    this.peer.on('disconnected', () => {
      this.scheduleReconnect();
    });
  }

  private connectToHost(): void {
    if (!this.peer || this.peer.destroyed || !this.currentSessionId) return;

    this.setState('connecting');
    const connection = this.peer.connect(this.currentSessionId, {
      reliable: false, // Low-latency UDP-like mode for 60Hz motion data
    });

    this.setupConnection(connection);
  }

  private setupConnection(connection: DataConnection): void {
    if (this.conn) {
      try {
        this.conn.close();
      } catch {
        // ignore
      }
    }

    this.conn = connection;

    connection.on('open', () => {
      if (this.reconnectTimer) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.setState('connected');
    });

    connection.on('data', (data) => {
      if (this.onEventCb && data) {
        this.onEventCb(data as GameEvent);
      }
    });

    connection.on('close', () => {
      this.setState('disconnected');
      if (!this.isHost) {
        this.scheduleReconnect();
      }
    });

    connection.on('error', (err) => {
      console.warn('DataConnection Error:', err);
      this.setState('disconnected');
      if (!this.isHost) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.isHost || this.reconnectTimer) return;
    this.setState('reconnecting');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          this.peer.reconnect();
        } else {
          this.connectToHost();
        }
      }
    }, 2000);
  }

  /**
   * Broadcast game event across the data channel
   */
  public send(event: GameEvent): boolean {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(event);
        return true;
      } catch (err) {
        console.warn('Failed to send packet over WebRTC:', err);
        return false;
      }
    }
    return false;
  }

  public destroy(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.conn) {
      try {
        this.conn.close();
      } catch {
        // ignore
      }
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
    this.setState('disconnected');
  }
}
