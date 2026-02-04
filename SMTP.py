#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
from datetime import datetime
from termcolor import colored
import sys

# ========== DEINE DATEN ==========
DEINE_EMAIL = "nibbafarm3@gmal.com"  # HIER DEINE GMAIL EINTRAGEN
APP_PASSWORT = "zbdh eovg eosl ittv"    # Dein App-Passwort (genau so mit Leerzeichen!)
LOG_DATEI = "email_log.txt"
# =================================

def logge_nachricht(nachricht, farbe='green'):
    """Schreibt Log mit Zeitstempel"""
    zeit = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_eintrag = f"[{zeit}] {nachricht}"
    
    # Zeige farbig an
    print(colored(log_eintrag, farbe))
    
    # Speichere in Datei
    with open(LOG_DATEI, "a", encoding='utf-8') as f:
        f.write(log_eintrag + "\n")

def sende_email(an_email, betreff, text, email_nummer):
    """Sendet eine einzelne Email"""
    try:
        # Verbinde mit Gmail
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        
        # Einloggen mit App-Passwort
        server.login(DEINE_EMAIL, APP_PASSWORT)
        
        # Email erstellen
        nachricht = f"Subject: {betreff}\n\n{text}"
        server.sendmail(DEINE_EMAIL, an_email, nachricht)
        
        # Verbindung beenden
        server.quit()
        
        logge_nachricht(f"✅ Email #{email_nummer} gesendet an {an_email}")
        return True
        
    except Exception as fehler:
        logge_nachricht(f"❌ FEHLER bei Email #{email_nummer}: {str(fehler)}", 'red')
        return False

def hauptprogramm():
    print(colored("="*50, 'cyan'))
    print(colored("TERMUX EMAIL BOT v1.0", 'cyan', attrs=['bold']))
    print(colored("="*50, 'cyan'))
    print(colored(f"Von: {DEINE_EMAIL}", 'yellow'))
    print()
    
    # Liste der Empfänger (ÄNDERE DAS!)
    empfaenger = [
        "deine.andere@email.com",  # Ersetze mit DEINER Test-Email
        "test@example.com"         # Optional: zweiter Empfänger
    ]
    
    # Email Vorlage
    betreff = "Test von Termux"
    text = """Hallo!

Dies ist eine Test-Email die von meinem Android Handy 
mit Termux gesendet wurde.

Funktioniert super!

Viele Grüße,
Dein Termux Bot
"""
    
    logge_nachricht(f"Starte Email-Versand...")
    logge_nachricht(f"Anzahl Empfänger: {len(empfaenger)}")
    
    gesendet = 0
    for i, empfaenger_email in enumerate(empfaenger, 1):
        if sende_email(empfaenger_email, betreff, text, i):
            gesendet += 1
        
        # Warte zwischen Emails (Anti-Spam)
        if i < len(empfaenger):
            logge_nachricht(f"⏳ Warte 3 Sekunden...", 'yellow')
            time.sleep(3)
    
    # Zusammenfassung
    print()
    logge_nachricht(f"🎯 FERTIG! Gesendet: {gesendet}/{len(empfaenger)}", 'green')
    logge_nachricht(f"📁 Log gespeichert in: {LOG_DATEI}", 'blue')
    
    # Zeige Log an
    print()
    print(colored("Letzte 5 Log-Einträge:", 'magenta'))
    try:
        with open(LOG_DATEI, "r", encoding='utf-8') as f:
            zeilen = f.readlines()
            for zeile in zeilen[-5:]:
                print(zeile.strip())
    except:
        pass

# ========== TEST MODUS ==========
def test_modus():
    """Testet nur die Verbindung"""
    print(colored("🔄 TEST MODUS - Verbindung testen...", 'yellow'))
    
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(DEINE_EMAIL, APP_PASSWORT)
        server.quit()
        print(colored("✅ VERBINDUNG ERFOLGREICH!", 'green'))
        return True
    except Exception as e:
        print(colored(f"❌ VERBINDUNG FEHLGESCHLAGEN: {e}", 'red'))
        return False

# ========== HAUPTPROGRAMM ==========
if __name__ == "__main__":
    # Erstmal testen
    if test_modus():
        print()
        hauptprogramm()
    else:
        print()
        print(colored("⚠️  PROBLEME:", 'red'))
        print("1. Prüfe ob DEINE_EMAIL richtig ist")
        print("2. Prüfe APP_PASSWORT (16 Zeichen mit Leerzeichen)")
        print("3. Internet-Verbindung prüfen")
        print("4. 2FA muss mit Authenticator App aktiviert sein")
