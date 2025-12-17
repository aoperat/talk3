import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { roomId } = await req.json();

    if (!roomId) {
      return new Response(
        JSON.stringify({ error: 'roomId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // OpenAI API 키 확인
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 번역되지 않은 메시지 조회
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id, content_ko')
      .eq('room_id', roomId)
      .is('content_en', null)
      .not('content_ko', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No messages to translate', translated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OpenAI API로 번역 요청
    const translatedMessages = [];
    for (const msg of messages) {
      if (!msg.content_ko) continue;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content:
                  'You are a professional translator. Translate the following Korean text to English. Only return the translation, no explanations.',
              },
              {
                role: 'user',
                content: msg.content_ko,
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('OpenAI API error:', errorData);
          continue;
        }

        const data = await response.json();
        const translatedText = data.choices[0]?.message?.content?.trim();

        if (translatedText) {
          // DB에 번역 결과 업데이트
          const { error: updateError } = await supabase
            .from('messages')
            .update({ content_en: translatedText })
            .eq('id', msg.id);

          if (!updateError) {
            translatedMessages.push(msg.id);
          } else {
            console.error('Error updating message:', updateError);
          }
        }
      } catch (error) {
        console.error('Error translating message:', error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Translation completed',
        translated: translatedMessages.length,
        total: messages.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

