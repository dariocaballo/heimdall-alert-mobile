import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('verify_user_code function starting up...')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code } = await req.json()
    
    console.log('Verifying user code:', code)

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kod måste vara exakt 6 tecken lång' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Check if code exists in user_codes table
    const { data: codeData, error: codeError } = await supabase
      .from('user_codes')
      .select('user_code')
      .eq('user_code', code.toUpperCase())
      .single()

    if (codeError || !codeData) {
      console.log('Code not found:', code)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ogiltig kod' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Get all devices for this code
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('user_code', code.toUpperCase())

    if (devicesError) {
      console.error('Error fetching devices:', devicesError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fel vid hämtning av enheter' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const deviceIds = devices?.map(d => d.device_id) || []
    
    console.log('Code verified successfully:', code, 'Devices:', deviceIds)

    return new Response(
      JSON.stringify({ 
        success: true, 
        device_ids: deviceIds 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in verify_user_code:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Serverfel' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})