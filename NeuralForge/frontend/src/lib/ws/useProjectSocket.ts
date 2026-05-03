import { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';

export function useProjectSocket(projectId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<unknown[]>([]);
    const [lastEvent, setLastEvent] = useState<unknown | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Get store actions
    const handleSocketEvent = useProjectStore((state) => state.handleSocketEvent);

    const connect = useCallback(() => {
        if (!projectId) return;

        // Cleanup any existing connections/timeouts
        if (wsRef.current) {
            wsRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        const wsUrl = `ws://localhost:8000/ws/projects/${projectId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;

            // Setup ping interval
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Don't add pongs to state
                if (data.type !== 'pong') {
                    setLastEvent(data);
                    setEvents((prev) => [...prev, data]);
                    handleSocketEvent(data);
                }
            } catch (err) {
                console.error('Error parsing WS message:', err);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

            // Reconnect logic with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`Reconnecting in ${delay}ms...`);

            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttemptsRef.current += 1;
                connect();
            }, delay);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // close will be called automatically and trigger reconnect
        };

        wsRef.current = ws;
    }, [projectId, handleSocketEvent]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const send = useCallback((message: unknown) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message, WebSocket not open');
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return { events, isConnected, send, lastEvent };
}
