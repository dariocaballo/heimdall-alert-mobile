import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('verify_user_code function starting up...')

serve(async (req) => {
  console.log('Request received:', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('Supabase client created')

    console.log('Reading request body...')
    const requestText = await req.text()
    console.log('Request body text:', requestText)
    
    let code
    try {
      const body = JSON.parse(requestText)
      code = body.code
      console.log('Parsed code from body:', code)
    } catch (e) {
      console.error('Failed to parse JSON:', e)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ogiltig JSON i förfrågan' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    console.log('Verifying user code:', code)

    if (!code || typeof code !== 'string' || code.length !== 6) {
      console.log('Invalid code format:', code)
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

    console.log('Checking if code exists in user_codes table...')
    // Check if code exists in user_codes table
    const { data: codeData, error: codeError } = await supabase
      .from('user_codes')
      .select('user_code')
      .eq('user_code', code.toUpperCase())
      .single()

    console.log('Code check result:', { codeData, codeError })

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

    console.log('Getting devices for code...')
    // Get all devices for this code
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('user_code', code.toUpperCase())

    console.log('Devices query result:', { devices, devicesError })

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