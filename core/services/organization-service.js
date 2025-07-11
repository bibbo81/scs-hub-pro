export async function getMyOrganizationId(supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);
    if (error) {
        throw error;
    }
    if (!data || data.length === 0) {
        throw new Error('No organization found');
    }
    return data[0].organization_id;
}

export default { getMyOrganizationId };
