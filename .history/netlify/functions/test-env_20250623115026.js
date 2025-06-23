exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      urlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...'
    })
  };
};