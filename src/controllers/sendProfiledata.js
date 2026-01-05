const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.updateProfile = async (req, res) => {
    try {
        const clerkUserId = req.auth.userId;
        // ✅ Added email to the destructuring
        const { username, bio, email } = req.body; 

        console.log(`--- SYNC ATTEMPT: ${clerkUserId} ---`);

        // Update the 'users' table in Supabase
        const { error } = await supabase
            .from('users') 
            .upsert({ 
                user_id: clerkUserId, 
                name: username, 
                bio: bio,       
                email: email, // ✅ This saves the email to the database
                updated_at: new Date()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error("Supabase Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        console.log(`✅ SUCCESS: Updated database for ${username} (${email || 'no email'})`);
        res.status(200).json({ success: true, message: "Profile updated!" });

    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

