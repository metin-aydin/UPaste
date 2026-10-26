import type { Messages } from './en'

export const ro: Messages = {
  'popup.search': 'Caută în istoricul clipboardului',
  'popup.filterAll': 'Toate',
  'popup.filterText': 'Text',
  'popup.filterImages': 'Imagini',
  'popup.filterPinned': 'Fixate',
  'popup.emptyTitle': 'Istoricul clipboardului este gol',
  'popup.emptyBody': 'Copiați un text sau o imagine și va apărea aici.',
  'popup.noResults': 'Niciun rezultat pentru „{query}”',
  'popup.noPinned': 'Fixați elementele pe care le folosiți des pentru a le păstra aici.',
  'popup.pin': 'Fixează',
  'popup.unpin': 'Anulează fixarea',
  'popup.delete': 'Șterge',
  'popup.pinned': 'Fixat',
  'popup.image': 'Imagine',
  'popup.navigate': 'Navighează',
  'popup.paste': 'Lipește',
  'popup.close': 'Închide',
  'popup.settings': 'Setări',

  'notify.copiedTitle': 'Copiat în clipboard',
  'notify.relogin':
    'Extensia GNOME a UPaste a fost actualizată. Deconectați-vă și reconectați-vă pentru a finaliza.',
  'notify.copiedBody':
    'Apăsați Ctrl+V pentru a lipi. Finalizați configurarea UPaste pentru lipire automată.',

  'tray.settings': 'Setări',
  'tray.quit': 'Ieșire',
  'tray.update': 'Instalează actualizarea {version}',

  'settings.title': 'Setări UPaste',
  'nav.general': 'General',
  'nav.history': 'Istoric',
  'nav.setup': 'Configurare',
  'nav.updates': 'Actualizări',
  'nav.about': 'Despre',

  'general.description': 'Limbă, aspect și pornire.',
  'general.language': 'Limbă',
  'general.languageHint':
    'Folosită în fereastra clipboardului, în setări și în meniul din bara de sistem.',
  'general.systemLanguage': 'Limba sistemului ({language})',
  'general.theme': 'Aspect',
  'general.themeSystem': 'Sistem',
  'general.themeLight': 'Luminos',
  'general.themeDark': 'Întunecat',
  'general.launchAtLogin': 'Pornește la autentificare',
  'general.launchAtLoginHint': 'UPaste rulează în bara de sistem și înregistrează tot ce copiați.',
  'general.layout': 'Deschide ca',
  'general.layoutHint': 'Unde apare istoricul când apăsați scurtătura.',
  'general.layoutAuto': 'Lângă câmpul de text',
  'general.layoutAutoHint':
    'O fereastră mică sub câmpul de text în care scrieți; în rest, un panou în partea de jos a ecranului.',
  'general.layoutSheet': 'Panou inferior',
  'general.layoutSheetHint':
    'Întotdeauna un panou în partea de jos a ecranului, cu elementele unul lângă altul.',

  'history.description': 'Ce păstrează UPaste și pentru cât timp.',
  'history.items': 'Elemente',
  'history.images': 'Imagini',
  'history.pinned': 'Fixate',
  'history.disk': 'Spațiu pe disc',
  'history.keepFor': 'Păstrează istoricul',
  'history.keepForHint':
    'Elementele mai vechi sunt șterse automat. Elementele fixate sunt păstrate întotdeauna.',
  'history.forever': 'Pentru totdeauna',
  'history.days': 'zile',
  'history.privacy':
    'Istoricul nu părăsește niciodată acest computer. Parolele copiate din managerele de parole nu sunt salvate.',
  'history.clear': 'Golește istoricul',
  'history.clearHint': 'Șterge toate elementele din istoricul clipboardului.',
  'history.clearTitle': 'Goliți istoricul clipboardului?',
  'history.clearBody': 'Această acțiune nu poate fi anulată.',
  'history.clearPinned': 'Șterge și elementele fixate',
  'history.cancel': 'Anulează',
  'history.confirmClear': 'Golește',
  'history.cleared': 'Istoricul clipboardului a fost golit',

  'setup.description':
    'Conectați UPaste la GNOME pentru ca scurtătura să deschidă istoricul chiar sub câmpul de text în care scrieți.',
  'setup.ready': 'Totul este gata. Apăsați {shortcut} în orice câmp de text.',
  'setup.notReady': 'Finalizați pașii de mai jos pentru a folosi scurtătura {shortcut}.',
  'setup.notGnome':
    'Pe Linux, UPaste are nevoie de mediul GNOME. Mediul dvs. nu a fost recunoscut.',
  'setup.extension': 'Extensie GNOME Shell',
  'setup.extensionHint':
    'Plasează fereastra lângă câmpul de text, urmărește clipboardul și lipește elementul ales.',
  'setup.install': 'Instalează',
  'setup.update': 'Actualizează',
  'setup.enable': 'Activează',
  'setup.logout': 'Deconectare',
  'setup.statusActive': 'Activă',
  'setup.statusRelogin': 'Deconectați-vă și reconectați-vă pentru a finaliza',
  'setup.statusDisabled': 'Dezactivată',
  'setup.statusError': 'Nu a putut fi încărcată',
  'setup.statusMissing': 'Neinstalată',
  'setup.shortcut': 'Scurtătură',
  'setup.shortcutHint': 'Deschide istoricul clipboardului.',
  'setup.shortcutReady': 'Atribuită lui UPaste',
  'setup.shortcutTaken': 'Folosită de {names}',
  'setup.shortcutWaiting': 'Se așteaptă extensia',
  'setup.takeOver': 'Folosește pentru UPaste',
  'setup.restore': 'Restaurează precedenta',
  'setup.restored': 'Scurtătura anterioară a fost restabilită.',
  'setup.shortcutChange': 'Schimbă',
  'setup.shortcutRecording': 'Apăsați noua scurtătură…',
  'setup.shortcutReset': 'Resetează',
  'setup.shortcutInvalid':
    'Folosiți Super, Ctrl sau Alt împreună cu o literă, o cifră sau o tastă F.',
  'setup.messageTray': 'Lista de notificări',

  'updates.description': 'UPaste se actualizează singur din GitHub Releases.',
  'updates.version': 'Versiunea {version}',
  'updates.check': 'Caută actualizări',
  'updates.checking': 'Se caută…',
  'updates.upToDate': 'UPaste este la zi.',
  'updates.available': 'Versiunea {version} este disponibilă.',
  'updates.download': 'Descarcă și instalează',
  'updates.downloading': 'Se descarcă… {percent} %',
  'updates.downloaded': 'Versiunea {version} este gata de instalare.',
  'updates.install': 'Repornește și instalează',
  'updates.installing': 'Se instalează… Introduceți parola dacă vi se cere.',
  'updates.openPage': 'Deschide pagina de descărcare',
  'updates.notes': 'Note de lansare',
  'updates.failed': 'Actualizarea a eșuat: {message}',
  'updates.lastChecked': 'Ultima verificare: {time}',
  'updates.auto': 'Caută automat actualizări',
  'updates.autoHint':
    'Verifică la scurt timp după pornire și la fiecare 6 ore. Nu se descarcă nimic fără acordul dvs.',
  'updates.manualOnly':
    'Această copie nu se poate actualiza singură; versiunile noi se deschid pe pagina de descărcare.',
  'updates.passwordClosed':
    'Fereastra pentru parolă a fost închisă. Actualizarea nu a fost instalată.',
  'updates.noAdmin':
    'Nu s-au putut obține drepturi de administrator. Actualizarea nu a fost instalată.',
  'updates.noNewPrivs':
    'UPaste nu poate cere drepturi de administrator în această sesiune. Închideți UPaste din meniul din bara de sistem, porniți-l din nou și reîncercați.',
  'updates.installFailed': 'Actualizarea nu a putut fi instalată (cod de ieșire {code}).',
  'updates.startFailed': 'Programul de instalare nu a putut fi pornit: {message}',

  'about.tagline': 'Istoric al clipboardului, cu căutare, pentru text și imagini.',
  'about.source': 'Cod sursă',
  'about.issues': 'Raportează o problemă',
  'about.license': 'Publicat sub licența MIT.'
}
