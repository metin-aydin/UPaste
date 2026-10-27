import type { Messages } from './en'

export const de: Messages = {
  'popup.search': 'Zwischenablageverlauf durchsuchen',
  'popup.filterAll': 'Alle',
  'popup.filterText': 'Text',
  'popup.filterImages': 'Bilder',
  'popup.filterPinned': 'Angeheftet',
  'popup.emptyTitle': 'Ihr Zwischenablageverlauf ist leer',
  'popup.emptyBody': 'Kopieren Sie einen Text oder ein Bild, dann erscheint es hier.',
  'popup.noResults': 'Keine Ergebnisse für „{query}“',
  'popup.noPinned': 'Heften Sie häufig verwendete Elemente an, damit sie hier griffbereit bleiben.',
  'popup.pin': 'Anheften',
  'popup.unpin': 'Lösen',
  'popup.delete': 'Löschen',
  'popup.pinned': 'Angeheftet',
  'popup.image': 'Bild',
  'popup.navigate': 'Navigieren',
  'popup.paste': 'Einfügen',
  'popup.close': 'Schließen',
  'popup.settings': 'Einstellungen',

  'notify.copiedTitle': 'In die Zwischenablage kopiert',
  'notify.relogin':
    'Die GNOME-Erweiterung von UPaste wurde aktualisiert. Melden Sie sich ab und wieder an, um den Vorgang abzuschließen.',
  'notify.copiedBody':
    'Drücken Sie {paste} zum Einfügen. Schließen Sie die Einrichtung von UPaste ab, um automatisch einzufügen.',

  'tray.settings': 'Einstellungen',
  'tray.quit': 'Beenden',
  'tray.update': 'Update {version} installieren',

  'settings.title': 'UPaste-Einstellungen',
  'nav.general': 'Allgemein',
  'nav.history': 'Verlauf',
  'nav.setup': 'Einrichtung',
  'nav.updates': 'Updates',
  'nav.about': 'Info',

  'general.description': 'Sprache, Erscheinungsbild und Autostart.',
  'general.language': 'Sprache',
  'general.languageHint':
    'Gilt für das Zwischenablage-Fenster, die Einstellungen und das Menü im Infobereich.',
  'general.systemLanguage': 'Systemstandard ({language})',
  'general.theme': 'Erscheinungsbild',
  'general.themeSystem': 'System',
  'general.themeLight': 'Hell',
  'general.themeDark': 'Dunkel',
  'general.launchAtLogin': 'Bei der Anmeldung starten',
  'general.launchAtLoginHint': 'UPaste läuft im Infobereich und speichert alles, was Sie kopieren.',
  'general.layout': 'Öffnen als',
  'general.layoutHint': 'Wo der Verlauf erscheint, wenn Sie das Tastenkürzel drücken.',
  'general.layoutAuto': 'Neben dem Textfeld',
  'general.layoutAutoHint':
    'Ein kleines Fenster unter dem Textfeld, in dem Sie schreiben; überall sonst eine Leiste am unteren Bildschirmrand.',
  'general.layoutSheet': 'Untere Leiste',
  'general.layoutSheetHint':
    'Immer eine Leiste am unteren Bildschirmrand mit den Einträgen nebeneinander.',

  'history.description': 'Was UPaste speichert und wie lange.',
  'history.items': 'Elemente',
  'history.images': 'Bilder',
  'history.pinned': 'Angeheftet',
  'history.disk': 'Speicherplatz',
  'history.keepFor': 'Verlauf aufbewahren',
  'history.keepForHint':
    'Ältere Elemente werden automatisch gelöscht. Angeheftete Elemente bleiben immer erhalten.',
  'history.forever': 'Unbegrenzt',
  'history.days': 'Tage',
  'history.privacy':
    'Ihr Verlauf verlässt nie diesen Computer. Aus Passwortmanagern kopierte Passwörter werden nicht gespeichert.',
  'history.clear': 'Verlauf löschen',
  'history.clearHint': 'Löscht alle Elemente aus dem Zwischenablageverlauf.',
  'history.clearTitle': 'Zwischenablageverlauf löschen?',
  'history.clearBody': 'Dies kann nicht rückgängig gemacht werden.',
  'history.clearPinned': 'Auch angeheftete Elemente löschen',
  'history.cancel': 'Abbrechen',
  'history.confirmClear': 'Löschen',
  'history.cleared': 'Zwischenablageverlauf gelöscht',

  'setup.description':
    'Verbinden Sie UPaste mit GNOME, damit Ihr Tastenkürzel den Verlauf direkt unter dem Textfeld öffnet, in dem Sie gerade schreiben.',
  'setup.ready': 'Alles bereit. Drücken Sie {shortcut} in einem beliebigen Textfeld.',
  'setup.notReady': 'Führen Sie die folgenden Schritte aus, um {shortcut} zu nutzen.',
  'setup.notGnome':
    'Unter Linux benötigt UPaste den GNOME-Desktop. Ihr Desktop wurde nicht erkannt.',
  'setup.extension': 'GNOME-Shell-Erweiterung',
  'setup.extensionHint':
    'Platziert das Fenster an Ihrem Textfeld, überwacht die Zwischenablage und fügt das gewählte Element ein.',
  'setup.install': 'Installieren',
  'setup.update': 'Aktualisieren',
  'setup.enable': 'Aktivieren',
  'setup.logout': 'Abmelden',
  'setup.statusActive': 'Aktiv',
  'setup.statusRelogin': 'Zum Abschließen ab- und wieder anmelden',
  'setup.statusDisabled': 'Deaktiviert',
  'setup.statusError': 'Laden fehlgeschlagen',
  'setup.statusMissing': 'Nicht installiert',
  'setup.shortcut': 'Tastenkürzel',
  'setup.shortcutHint': 'Öffnet den Zwischenablageverlauf.',
  'setup.shortcutReady': 'UPaste zugewiesen',
  'setup.shortcutTaken': 'Belegt durch {names}',
  'setup.shortcutWaiting': 'Warten auf die Erweiterung',
  'setup.takeOver': 'Für UPaste verwenden',
  'setup.restore': 'Vorheriges wiederherstellen',
  'setup.restored': 'Ihr vorheriges Tastenkürzel wurde wiederhergestellt.',
  'setup.shortcutChange': 'Ändern',
  'setup.shortcutRecording': 'Neues Tastenkürzel drücken…',
  'setup.shortcutReset': 'Zurücksetzen',
  'setup.shortcutInvalid':
    'Verwenden Sie Super, Ctrl oder Alt zusammen mit einem Buchstaben, einer Ziffer oder einer F-Taste.',
  'setup.descriptionWindows':
    'Wählen Sie das Tastenkürzel, das Ihren Zwischenablageverlauf öffnet.',
  'setup.descriptionMac':
    'Erlauben Sie UPaste, mit anderen Apps zusammenzuarbeiten, und wählen Sie das Tastenkürzel, das Ihren Zwischenablageverlauf öffnet.',
  'setup.shortcutHintWindows':
    'Win+V öffnet UPaste statt des Windows-Zwischenablageverlaufs. Wählen Sie ein anderes Tastenkürzel, um Win+V an Windows zurückzugeben.',
  'setup.shortcutInUse': 'Eine andere App verwendet dieses Tastenkürzel',
  'setup.accessibility': 'Zugriff auf Bedienungshilfen',
  'setup.accessibilityHint':
    'Ermöglicht UPaste, den Verlauf an Ihrem Textcursor zu öffnen und das gewählte Element einzufügen.',
  'setup.statusAllowed': 'Erlaubt',
  'setup.statusNotAllowed': 'Nicht erlaubt',
  'setup.openAccessibility': 'Datenschutzeinstellungen öffnen',
  'setup.messageTray': 'Benachrichtigungsliste',

  'updates.description': 'UPaste aktualisiert sich selbst über GitHub Releases.',
  'updates.version': 'Version {version}',
  'updates.check': 'Nach Updates suchen',
  'updates.checking': 'Wird geprüft…',
  'updates.upToDate': 'UPaste ist auf dem neuesten Stand.',
  'updates.available': 'Version {version} ist verfügbar.',
  'updates.download': 'Herunterladen und installieren',
  'updates.downloading': 'Wird heruntergeladen… {percent} %',
  'updates.downloaded': 'Version {version} ist bereit zur Installation.',
  'updates.install': 'Neu starten und installieren',
  'updates.installing': 'Wird installiert… Geben Sie bei Nachfrage Ihr Passwort ein.',
  'updates.openPage': 'Downloadseite öffnen',
  'updates.notes': 'Versionshinweise',
  'updates.failed': 'Update fehlgeschlagen: {message}',
  'updates.lastChecked': 'Zuletzt geprüft: {time}',
  'updates.auto': 'Automatisch nach Updates suchen',
  'updates.autoHint':
    'Prüft kurz nach dem Start und alle 6 Stunden. Ohne Rückfrage wird nichts heruntergeladen.',
  'updates.manualOnly':
    'Diese Installation kann sich nicht selbst aktualisieren; neue Versionen werden auf der Downloadseite geöffnet.',
  'updates.passwordClosed':
    'Der Passwortdialog wurde geschlossen. Das Update wurde nicht installiert.',
  'updates.noAdmin':
    'Administratorrechte konnten nicht erlangt werden. Das Update wurde nicht installiert.',
  'updates.noNewPrivs':
    'UPaste kann in dieser Sitzung keine Administratorrechte anfordern. Beenden Sie UPaste über das Menü im Infobereich, starten Sie es erneut und versuchen Sie es noch einmal.',
  'updates.installFailed': 'Das Update konnte nicht installiert werden (Exit-Code {code}).',
  'updates.startFailed': 'Das Installationsprogramm konnte nicht gestartet werden: {message}',

  'about.tagline': 'Durchsuchbarer Zwischenablageverlauf für Texte und Bilder.',
  'about.source': 'Quellcode',
  'about.issues': 'Problem melden',
  'about.license': 'Veröffentlicht unter der MIT-Lizenz.'
}
