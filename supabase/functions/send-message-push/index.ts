import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { targetUserId, roomId, previewText } = await req.json();

    if (!targetUserId || !roomId || !previewText) {
      return new Response(
        JSON.stringify({ error: 'targetUserId, roomId, previewText are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !fcmServerKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or FCM_SERVER_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) 대상 유저의 FCM 토큰들 가져오기
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', targetUserId);

    if (tokenError) {
      console.error('Error loading push tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to load push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens for user', targetUserId);
      return new Response(
        JSON.stringify({ message: 'No tokens, no push sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2) FCM으로 푸시 발송
    const fcmBody = {
      notification: {
        title: '새 메시지',
        body: previewText,
      },
      data: {
        roomId: String(roomId),
      },
      registration_ids: tokens.map((t) => t.token),
    };

    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify(fcmBody),
    });

    const fcmText = await fcmRes.text();
    console.log('FCM response:', fcmRes.status, fcmText);

    if (!fcmRes.ok) {
      return new Response(
        JSON.stringify({ error: 'FCM request failed', detail: fcmText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-message-push error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});