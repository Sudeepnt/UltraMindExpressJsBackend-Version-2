const { Webhook } = require("svix");
const supabase = require("../config/supabase");

exports.handleClerkWebhook = async (req, res) => {
  const payload = req.body; // Expecting raw body from server.js
  const headers = req.headers;
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  let evt;

  try {
    evt = webhook.verify(payload, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"],
    });
  } catch (err) {
    console.error("❌ Clerk Verification Failed:", err.message);
    return res.status(400).send("Invalid signature");
  }

  const { type, data } = evt;

  try {
    if (type === "user.created") {
      const { id, email_addresses, first_name, last_name } = data;
      const email = email_addresses?.[0]?.email_address;
      const fullName = `${first_name || ""} ${last_name || ""}`.trim() || "User";

      const { error } = await supabase.from("users").upsert({
        user_id: id,
        email: email,
        name: fullName,
        plan_active: false,
        plan_type: 'free',
        joined_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      console.log(`✅ User Created in Supabase: ${id}`);
    }

    if (type === "user.deleted") {
      const { error } = await supabase.from("users").delete().eq("user_id", data.id);
      if (error) throw error;
      console.log(`🗑 User Deleted from Supabase: ${data.id}`);
    }
  } catch (err) {
    console.error("❌ Database Error during Clerk Webhook:", err.message);
  }

  return res.status(200).json({ received: true });
};

