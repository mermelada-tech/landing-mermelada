import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(url: string, serviceRoleKey: string) {
	return createClient(url, serviceRoleKey, {
		auth: { persistSession: false },
	});
}
