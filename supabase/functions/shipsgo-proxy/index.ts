// supabase/functions/shipsgo-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifica autenticazione
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ottieni API keys dalle variabili ambiente
    const SHIPSGO_V1_KEY = Deno.env.get('SHIPSGO_V1_KEY')
    const SHIPSGO_V2_TOKEN = Deno.env.get('SHIPSGO_V2_TOKEN')

    // Parse request
    const { version, endpoint, method, params, data, contentType } = await req.json()

    // Costruisci URL
    let url = ''
    let headers: any = {}
    let body = null

    if (version === 'v1.2') {
      url = `https://shipsgo.com/api/v1.2${endpoint}`
      headers['Accept'] = 'application/json'
      
      if (method === 'GET') {
        // Aggiungi authCode ai params
        const urlParams = new URLSearchParams({
          authCode: SHIPSGO_V1_KEY,
          ...params
        })
        url += '?' + urlParams.toString()
      } else if (method === 'POST') {
        if (contentType === 'application/x-www-form-urlencoded') {
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
          const formData = new URLSearchParams({
            authCode: SHIPSGO_V1_KEY,
            ...data
          })
          body = formData.toString()
        } else {
          headers['Content-Type'] = 'application/json'
          body = JSON.stringify({
            authCode: SHIPSGO_V1_KEY,
            ...data
          })
        }
      }
    } else if (version === 'v2') {
      url = `https://api.shipsgo.com/api/v2${endpoint}`
      headers['Authorization'] = `Bearer ${SHIPSGO_V2_TOKEN}`
      headers['Accept'] = 'application/json'
      
      if (method === 'GET' && params) {
        const urlParams = new URLSearchParams(params)
        url += '?' + urlParams.toString()
      } else if (method === 'POST' && data) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(data)
      }
    }

    // Esegui richiesta
    const response = await fetch(url, {
      method,
      headers,
      body
    })

    const responseData = await response.json()

    // Log per debug (rimuovi in produzione)
    console.log('ShipsGo request:', { url, method, status: response.status })

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      data: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})