const authErrorMap: Record<string, string> = {
  "Invalid login credentials": "Credenziali di accesso non valide.",
  "Email not confirmed": "Email non confermata.",
  "User already registered": "Utente gia registrato.",
  "Password should be at least 6 characters":
    "La password deve contenere almeno 6 caratteri.",
  "Signup is disabled": "La registrazione e disabilitata.",
  "Email rate limit exceeded": "Troppi tentativi via email. Riprova piu tardi.",
  "Too many requests": "Troppi tentativi di accesso. Riprova piu tardi.",
  "missing email or phone": "Inserisci un indirizzo email valido.",
  "missing password": "Inserisci la password.",
};

export function translateAuthError(message?: string | null) {
  if (!message) {
    return "Errore di autenticazione sconosciuto.";
  }

  return authErrorMap[message] ?? `Errore di autenticazione: ${message}`;
}
