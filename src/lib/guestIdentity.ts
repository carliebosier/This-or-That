import { supabase } from "@/integrations/supabase/client";

const GUEST_ID_KEY = "say_it_quick_guest_id";

/**
 * Generates a simple browser fingerprint for guest identification.
 * This is not meant to be secure or unique across all browsers,
 * but provides reasonable persistence for the same browser session.
 */
function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "unknown",
  ];

  // Create a simple hash of the components
  const str = components.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Add random component for uniqueness and convert to hex
  const random = Math.random().toString(36).substring(2, 15);
  return `${Math.abs(hash).toString(16)}_${random}_${Date.now().toString(36)}`;
}

/**
 * Gets the existing guest ID from localStorage, or creates a new one
 * and stores it in both localStorage and the database.
 */
export async function getOrCreateGuestIdentity(): Promise<string | null> {
  try {
    // First check localStorage for existing guest ID
    const existingId = localStorage.getItem(GUEST_ID_KEY);
    
    if (existingId) {
      // Verify it still exists in the database
      const { data } = await supabase
        .from("guest_identities")
        .select("id")
        .eq("id", existingId)
        .single();
      
      if (data) {
        return existingId;
      }
      // If not found in DB, we'll create a new one
    }

    // Generate a new fingerprint
    const fingerprint = generateFingerprint();

    // Check if this fingerprint already exists
    const { data: existingGuest } = await supabase
      .from("guest_identities")
      .select("id")
      .eq("fingerprint_hash", fingerprint)
      .single();

    if (existingGuest) {
      localStorage.setItem(GUEST_ID_KEY, existingGuest.id);
      return existingGuest.id;
    }

    // Create new guest identity
    const { data: newGuest, error } = await supabase
      .from("guest_identities")
      .insert({ fingerprint_hash: fingerprint })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating guest identity:", error);
      return null;
    }

    if (newGuest) {
      localStorage.setItem(GUEST_ID_KEY, newGuest.id);
      return newGuest.id;
    }

    return null;
  } catch (error) {
    console.error("Error in getOrCreateGuestIdentity:", error);
    return null;
  }
}

/**
 * Gets the current guest ID from localStorage without making any API calls.
 * Returns null if no guest ID exists.
 */
export function getGuestId(): string | null {
  return localStorage.getItem(GUEST_ID_KEY);
}

/**
 * Clears the guest identity from localStorage.
 * Useful when a user logs in and we want to use their authenticated identity.
 */
export function clearGuestIdentity(): void {
  localStorage.removeItem(GUEST_ID_KEY);
}

