#!/data/data/com.termux/files/usr/bin/python3
# -*- coding: utf-8 -*-
import smtplib
import time
from datetime import datetime
from termcolor import colored
from email.mime.text import MIMEText
from email.header import Header

# ========== DEINE DATEN ==========
DEINE_EMAIL = "tskforcests@gmail.com"  # Deine Email
APP_PASSWORT = "zbdh eovg eosl ittv"    # Dein App-Passwort
LOG_DATEI = "email_log.txt"
# =================================

def logge_nachricht(nachricht, farbe='green'):
    """Schreibt Log mit Zeitstempel"""
    zeit = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_eintrag = f"[{zeit}] {nachricht}"
    
    print(colored(log_eintrag, farbe))
    
    with open(LOG_DATEI, "a", encoding='utf-8') as f:
        f.write(log_eintrag + "\n")

def sende_email(an_email, betreff, text, email_nummer):
    """Sendet eine einzelne Email MIT UTF-8 Encoding"""
    try:
        # Email mit korrektem Encoding erstellen
        msg = MIMEText(text, 'plain', 'utf-8')
        msg['Subject'] = Header(betreff, 'utf-8')
        msg['From'] = DEINE_EMAIL
        msg['To'] = an_email
        
        # Verbinde und sende
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(DEINE_EMAIL, APP_PASSWORT)
        
        server.send_message(msg)
        server.quit()
        
        logge_nachricht(f"✅ Email #{email_nummer} gesendet an {an_email}")
        return True
        
    except Exception as fehler:
        logge_nachricht(f"❌ FEHLER bei Email #{email_nummer}: {str(fehler)}", 'red')
        return False

def hauptprogramm():
    print(colored("="*50, 'cyan'))
    print(colored("TERMUX EMAIL BOT v1.0 - FIXED", 'cyan', attrs=['bold']))
    print(colored("="*50, 'cyan'))
    print(colored(f"Von: {DEINE_EMAIL}", 'yellow'))
    print()
    
    # Liste der Empfänger (ÄNDERN!)
    empfaenger = [
        "nibbafarm3@gmail.com",  # ÄNDERE HIER! Deine echte Email zum Testen
    ]
    
    # Email Text OHNE Umlaute für ersten Test
    betreff = "Test von Termux"
    text = """Hallo!

Dies ist eine Test-Email von meinem Android Handy.
Gesendet mit Termux und Python.

Funktioniert jetzt hoffentlich!

Viele Gruesse,
Dein Termux Bot
"""
    
    logge_nachricht(f"Starte Email-Versand...")
    logge_nachricht(f"Anzahl Empfänger: {len(empfaenger)}")
    
    gesendet = 0
    for i, empfaenger_email in enumerate(empfaenger, 1):
        if sende_email(empfaenger_email, betreff, text, i):
            gesendet += 1
        
        if i < len(empfaenger):
            logge_nachricht(f"⏳ Warte 3 Sekunden...", 'yellow')
            time.sleep(3)
    
    print()
    logge_nachricht(f"🎯 FERTIG! Gesendet: {gesendet}/{len(empfaenger)}", 'green')
    
    # Log anzeigen
    print()
    print(colored("Log Datei:", 'magenta'))
    try:
        with open(LOG_DATEI, "r", encoding='utf-8') as f:
            for zeile in f.readlines()[-10:]:
                print(zeile.strip())
    except:
        pass

# ========== EINFACHER TEST ==========
if __name__ == "__main__":
    # Direkt ausführen (kein extra Test Modus)
    hauptprogramm()
