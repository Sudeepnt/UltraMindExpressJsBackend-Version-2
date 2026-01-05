const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.updateSubscription = async (req, res) => {
    try {
        const clerkUserId = req.auth.userId;
        const { plan_active, plan_type, plan_expires_at, email, apple_original_transaction_id } = req.body;

        // 1. Fetch the CURRENT status from the database first
        const { data: currentUser } = await supabase
            .from('users')
            .select('plan_active, plan_expires_at')
            .eq('user_id', clerkUserId)
            .single();

        // 2. LOGIC: Is the user already Premium in our DB?
        const dbIsPremium = currentUser?.plan_active || false;
        const dbExpiry = currentUser?.plan_expires_at ? new Date(currentUser.plan_expires_at) : null;
        const now = new Date();

        let finalActiveStatus = plan_active;
        let finalExpiryDate = plan_expires_at || null;

        // ✅ THE PROTECTOR: If the phone says "Basic" (false) 
        // BUT the Database says "Premium" (true) and it hasn't expired yet...
        // We KEEP them as Premium. This fixes the multi-device/reinstall issue.
        if (!plan_active && dbIsPremium && dbExpiry && dbExpiry > now) {
            console.log(`🛡️ PROTECT: Keeping ${email} as Premium (Server-side Truth)`);
            finalActiveStatus = true;
            finalExpiryDate = currentUser.plan_expires_at;
        }

        // 3. Handle Apple ID Transfer (Moving subscription between accounts if needed)
        if (apple_original_transaction_id && plan_active) {
            await supabase
                .from('users')
                .update({ apple_original_transaction_id: null, plan_active: false })
                .eq('apple_original_transaction_id', apple_original_transaction_id)
                .neq('user_id', clerkUserId);
        }

        // 4. Update the User
        const { error } = await supabase
            .from('users')
            .update({ 
                plan_active: finalActiveStatus, 
                plan_type: plan_type, 
                plan_expires_at: finalExpiryDate,
                email: email,
                apple_original_transaction_id: apple_original_transaction_id || currentUser?.apple_original_transaction_id,
                updated_at: new Date()
            })
            .eq('user_id', clerkUserId);

        if (error) throw error;

        res.status(200).json({ success: true, is_premium: finalActiveStatus });

    } catch (err) {
        console.error("Sub Controller Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
