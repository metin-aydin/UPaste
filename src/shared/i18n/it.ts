import type { Messages } from './en'

export const it: Messages = {
  'popup.search': 'Cerca nella cronologia degli appunti',
  'popup.filterAll': 'Tutti',
  'popup.filterText': 'Testo',
  'popup.filterImages': 'Immagini',
  'popup.filterPinned': 'Fissati',
  'popup.emptyTitle': 'La cronologia degli appunti è vuota',
  'popup.emptyBody': 'Copia un testo o un’immagine e comparirà qui.',
  'popup.noResults': 'Nessun risultato per «{query}»',
  'popup.noPinned': 'Fissa gli elementi che usi spesso per tenerli sempre qui.',
  'popup.pin': 'Fissa',
  'popup.unpin': 'Non fissare più',
  'popup.delete': 'Elimina',
  'popup.pinned': 'Fissato',
  'popup.image': 'Immagine',
  'popup.navigate': 'Naviga',
  'popup.paste': 'Incolla',
  'popup.close': 'Chiudi',
  'popup.settings': 'Impostazioni',

  'notify.copiedTitle': 'Copiato negli appunti',
  'notify.relogin':
    'L’estensione GNOME di UPaste è stata aggiornata. Esci e accedi di nuovo per completare.',
  'notify.copiedBody':
    'Premi {paste} per incollare. Completa la configurazione di UPaste per incollare automaticamente.',

  'tray.settings': 'Impostazioni',
  'tray.quit': 'Esci',
  'tray.update': 'Installa l’aggiornamento {version}',

  'settings.title': 'Impostazioni di UPaste',
  'nav.general': 'Generali',
  'nav.history': 'Cronologia',
  'nav.setup': 'Configurazione',
  'nav.updates': 'Aggiornamenti',
  'nav.about': 'Informazioni',

  'general.description': 'Lingua, aspetto e avvio.',
  'general.language': 'Lingua',
  'general.languageHint':
    'Usata nella finestra degli appunti, nelle impostazioni e nel menu dell’area di notifica.',
  'general.systemLanguage': 'Lingua di sistema ({language})',
  'general.theme': 'Aspetto',
  'general.themeSystem': 'Sistema',
  'general.themeLight': 'Chiaro',
  'general.themeDark': 'Scuro',
  'general.launchAtLogin': 'Avvia all’accesso',
  'general.launchAtLoginHint': 'UPaste resta nell’area di notifica e registra tutto ciò che copi.',
  'general.layout': 'Apri come',
  'general.layoutHint': 'Dove compare la cronologia quando premi la scorciatoia.',
  'general.layoutAuto': 'Accanto al campo di testo',
  'general.layoutAutoHint':
    'Una piccola finestra sotto il campo di testo in cui stai scrivendo; altrove, un pannello nella parte inferiore dello schermo.',
  'general.layoutSheet': 'Pannello inferiore',
  'general.layoutSheetHint':
    'Sempre un pannello nella parte inferiore dello schermo, con gli elementi affiancati.',

  'history.description': 'Cosa conserva UPaste e per quanto tempo.',
  'history.items': 'Elementi',
  'history.images': 'Immagini',
  'history.pinned': 'Fissati',
  'history.disk': 'Spazio su disco',
  'history.keepFor': 'Conserva la cronologia',
  'history.keepForHint':
    'Gli elementi più vecchi vengono eliminati automaticamente. Quelli fissati vengono sempre conservati.',
  'history.forever': 'Per sempre',
  'history.days': 'giorni',
  'history.privacy':
    'La cronologia non lascia mai questo computer. Le password copiate dai gestori di password non vengono salvate.',
  'history.clear': 'Cancella cronologia',
  'history.clearHint': 'Elimina tutti gli elementi dalla cronologia degli appunti.',
  'history.clearTitle': 'Cancellare la cronologia degli appunti?',
  'history.clearBody': 'L’operazione non può essere annullata.',
  'history.clearPinned': 'Elimina anche gli elementi fissati',
  'history.cancel': 'Annulla',
  'history.confirmClear': 'Cancella',
  'history.cleared': 'Cronologia degli appunti cancellata',

  'setup.description':
    'Collega UPaste a GNOME perché la tua scorciatoia apra la cronologia proprio sotto il campo di testo in cui stai scrivendo.',
  'setup.ready': 'Tutto pronto. Premi {shortcut} in un qualsiasi campo di testo.',
  'setup.notReady': 'Completa i passaggi seguenti per usare {shortcut}.',
  'setup.notGnome':
    'Su Linux, UPaste richiede il desktop GNOME. Il tuo desktop non è stato riconosciuto.',
  'setup.extension': 'Estensione di GNOME Shell',
  'setup.extensionHint':
    'Posiziona la finestra sul campo di testo, controlla gli appunti e incolla l’elemento scelto.',
  'setup.install': 'Installa',
  'setup.update': 'Aggiorna',
  'setup.enable': 'Attiva',
  'setup.logout': 'Termina sessione',
  'setup.statusActive': 'Attiva',
  'setup.statusRelogin': 'Termina la sessione e accedi di nuovo per completare',
  'setup.statusDisabled': 'Disattivata',
  'setup.statusError': 'Caricamento non riuscito',
  'setup.statusMissing': 'Non installata',
  'setup.shortcut': 'Scorciatoia',
  'setup.shortcutHint': 'Apre la cronologia degli appunti.',
  'setup.shortcutReady': 'Assegnata a UPaste',
  'setup.shortcutTaken': 'Usata da {names}',
  'setup.shortcutWaiting': 'In attesa dell’estensione',
  'setup.takeOver': 'Usa per UPaste',
  'setup.restore': 'Ripristina precedente',
  'setup.restored': 'La scorciatoia precedente è stata ripristinata.',
  'setup.shortcutChange': 'Cambia',
  'setup.shortcutRecording': 'Premi la nuova scorciatoia…',
  'setup.shortcutReset': 'Reimposta',
  'setup.shortcutInvalid': 'Usa Super, Ctrl o Alt insieme a una lettera, un numero o un tasto F.',
  'setup.descriptionWindows': 'Scegli la scorciatoia che apre la cronologia degli appunti.',
  'setup.descriptionMac':
    'Consenti a UPaste di funzionare con le altre app e scegli la scorciatoia che apre la cronologia degli appunti.',
  'setup.shortcutHintWindows':
    'Win+V apre UPaste al posto della cronologia degli appunti di Windows. Scegli un’altra scorciatoia per restituire Win+V a Windows.',
  'setup.shortcutInUse': 'Un’altra app usa questa scorciatoia',
  'setup.accessibility': 'Permesso di accessibilità',
  'setup.accessibilityHint':
    'Consente a UPaste di aprire la cronologia in corrispondenza del cursore di testo e di incollare l’elemento scelto.',
  'setup.statusAllowed': 'Consentito',
  'setup.statusNotAllowed': 'Non consentito',
  'setup.openAccessibility': 'Apri impostazioni privacy',
  'setup.messageTray': 'Elenco delle notifiche',

  'updates.description': 'UPaste si aggiorna da solo tramite GitHub Releases.',
  'updates.version': 'Versione {version}',
  'updates.check': 'Controlla aggiornamenti',
  'updates.checking': 'Controllo in corso…',
  'updates.upToDate': 'UPaste è aggiornato.',
  'updates.available': 'È disponibile la versione {version}.',
  'updates.download': 'Scarica e installa',
  'updates.downloading': 'Download in corso… {percent}%',
  'updates.downloaded': 'La versione {version} è pronta per l’installazione.',
  'updates.install': 'Riavvia e installa',
  'updates.installing': 'Installazione in corso… Inserisci la password, se richiesta.',
  'updates.openPage': 'Apri pagina di download',
  'updates.notes': 'Note di rilascio',
  'updates.failed': 'Aggiornamento non riuscito: {message}',
  'updates.lastChecked': 'Ultimo controllo: {time}',
  'updates.auto': 'Controlla automaticamente gli aggiornamenti',
  'updates.autoHint':
    'Controlla poco dopo l’avvio e ogni 6 ore. Non viene scaricato nulla senza chiedere.',
  'updates.manualOnly':
    'Questa copia non può aggiornarsi da sola; le nuove versioni si aprono nella pagina di download.',
  'updates.passwordClosed':
    'La finestra della password è stata chiusa. L’aggiornamento non è stato installato.',
  'updates.noAdmin':
    'Impossibile ottenere i privilegi di amministratore. L’aggiornamento non è stato installato.',
  'updates.noNewPrivs':
    'UPaste non può richiedere i privilegi di amministratore in questa sessione. Esci da UPaste dal menu dell’area di notifica, riavvialo e riprova.',
  'updates.installFailed': 'Impossibile installare l’aggiornamento (codice di uscita {code}).',
  'updates.startFailed': 'Impossibile avviare il programma di installazione: {message}',

  'about.tagline': 'Cronologia degli appunti con ricerca per testo e immagini.',
  'about.source': 'Codice sorgente',
  'about.issues': 'Segnala un problema',
  'about.license': 'Distribuito con licenza MIT.'
}
