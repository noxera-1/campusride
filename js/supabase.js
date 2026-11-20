const SUPABASE_URL = "https://hpeezwdrmtkbtjfjiagk.supabase.co";

const SUPABASE_KEY = "sb_publishable_oUnItB7yISuWar1q8r9C9Q_ztabAm8w";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
supabaseClient
    .from("drivers")
    .select("id")
    .limit(1)
    .then(({ data, error }) => {
        if (error) {
            console.error("Supabase connection error:", error.message);
        } else {
            console.log("Campus Ride connected successfully!", data);
        }
    });