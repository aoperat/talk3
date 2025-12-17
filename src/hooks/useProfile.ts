import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { User } from '../lib/types';

export function useProfile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        // 프로필이 없으면 생성
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              name: user.email?.split('@')[0] || 'User',
            })
            .select()
            .single();
          
          if (newProfile && !insertError) {
            setProfile(newProfile as User);
          } else if (insertError) {
            console.error('Error creating profile:', insertError);
          }
        }
        setLoading(false);
        return;
      }

      if (data) {
        // name이 없으면 기본값 설정
        const profileData: User = {
          ...data,
          name: data.name || user.email?.split('@')[0] || 'User',
        };
        setProfile(profileData);
      }
      setLoading(false);
    };

    loadProfile();

    // Realtime 구독
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setProfile(payload.new as User);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const updateProfile = async (updates: { name?: string; status_msg?: string }) => {
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }

      if (data) {
        setProfile(data as User);
      }

      return { data, error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unexpected error') };
    }
  };

  return { profile, loading, updateProfile };
}

