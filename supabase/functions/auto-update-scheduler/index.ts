import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🤖 Auto-update scheduler started')

    // Ottieni tracking che necessitano aggiornamento
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const { data: trackingsToUpdate, error: fetchError } = await supabaseClient
  .from('trackings')
  .select('*')
  .eq('tracking_type', 'container')
  .or('current_status.is.null,current_status.not.in.(delivered,completed,cancelled)')  // ✅ INCLUDE NULL
  .or(`last_auto_update.is.null,last_auto_update.lt.${oneHourAgo.toISOString()}`)
  .limit(10)  // Aumenta anche il limite

    if (fetchError) {
      throw fetchError
    }

    console.log(`📋 Found ${trackingsToUpdate?.length || 0} trackings to update`)

    if (!trackingsToUpdate || trackingsToUpdate.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No trackings need updating',
        updated: 0,
        timestamp: now.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Simula aggiornamento per ora (dopo aggiungeremo la vera API call)
    let successCount = 0
    const results = []

    for (const tracking of trackingsToUpdate) {
      try {
        console.log(`🔄 Processing: ${tracking.tracking_number}`)

        // Aggiorna il tracking nel database
        const updateData = {
          last_auto_update: now.toISOString(),
          updated_by_robot: true,
          metadata: {
            ...tracking.metadata,
            last_server_update: now.toISOString(),
            simulation_mode: true
          }
        }

        const { error: updateError } = await supabaseClient
          .from('trackings')
          .update(updateData)
          .eq('id', tracking.id)

        if (updateError) {
          throw updateError
        }

        successCount++
        results.push({ 
          tracking_number: tracking.tracking_number, 
          status: 'success',
          updated_at: now.toISOString()
        })
        
        console.log(`✅ Updated: ${tracking.tracking_number}`)

      } catch (error) {
        results.push({ 
          tracking_number: tracking.tracking_number, 
          status: 'error', 
          error: error.message 
        })
        console.error(`❌ Error updating ${tracking.tracking_number}:`, error.message)
      }
    }

    console.log(`🎯 Completed: ${successCount} success`)

    return new Response(JSON.stringify({
      success: true,
      updated: successCount,
      total_processed: trackingsToUpdate.length,
      results: results,
      timestamp: now.toISOString(),
      simulation_mode: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('🚨 Scheduler error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})