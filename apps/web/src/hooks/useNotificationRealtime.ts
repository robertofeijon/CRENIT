'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

/**
 * Subscribes to INSERT/UPDATE on the user's notifications row (requires migration 0035 + authenticated session).
 */
export function useNotificationRealtime(
  userId: string | undefined,
  onChange: (event: 'insert' | 'update', row: NotificationRow) => void,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!userId) return;

    const dispatch = (event: 'insert' | 'update', row: NotificationRow) => onChangeRef.current(event, row);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => dispatch('insert', payload.new as NotificationRow),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => dispatch('update', payload.new as NotificationRow),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
