import { useEffect, useRef } from 'react';
import socketService from '../services/socket';

export const useSocket = (events = {}) => {
  const savedEvents = useRef(events);

  useEffect(() => {
    savedEvents.current = events;
  });

  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (!socket) return;

    const wrappers = {};
    Object.keys(savedEvents.current).forEach((eventName) => {
      wrappers[eventName] = (...args) => {
        if (savedEvents.current[eventName]) {
          savedEvents.current[eventName](...args);
        }
      };
      socket.on(eventName, wrappers[eventName]);
    });

    return () => {
      Object.keys(wrappers).forEach((eventName) => {
        socket.off(eventName, wrappers[eventName]);
      });
    };
  }, []); // Only bind listeners once

  return {
    emit: (event, data) => socketService.emit(event, data),
    socket: socketService.getSocket(),
  };
};
