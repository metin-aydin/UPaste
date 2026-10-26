import type { Messages } from './en'

export const el: Messages = {
  'popup.search': 'Αναζήτηση στο ιστορικό προχείρου',
  'popup.filterAll': 'Όλα',
  'popup.filterText': 'Κείμενο',
  'popup.filterImages': 'Εικόνες',
  'popup.filterPinned': 'Καρφιτσωμένα',
  'popup.emptyTitle': 'Το ιστορικό προχείρου είναι κενό',
  'popup.emptyBody': 'Αντιγράψτε κείμενο ή μια εικόνα και θα εμφανιστεί εδώ.',
  'popup.noResults': 'Κανένα αποτέλεσμα για «{query}»',
  'popup.noPinned': 'Καρφιτσώστε τα στοιχεία που χρησιμοποιείτε συχνά για να τα έχετε εδώ.',
  'popup.pin': 'Καρφίτσωμα',
  'popup.unpin': 'Ξεκαρφίτσωμα',
  'popup.delete': 'Διαγραφή',
  'popup.pinned': 'Καρφιτσωμένο',
  'popup.image': 'Εικόνα',
  'popup.navigate': 'Πλοήγηση',
  'popup.paste': 'Επικόλληση',
  'popup.close': 'Κλείσιμο',
  'popup.settings': 'Ρυθμίσεις',

  'notify.copiedTitle': 'Αντιγράφηκε στο πρόχειρο',
  'notify.relogin':
    'Η επέκταση GNOME του UPaste ενημερώθηκε. Αποσυνδεθείτε και συνδεθείτε ξανά για να ολοκληρωθεί.',
  'notify.copiedBody':
    'Πατήστε {paste} για επικόλληση. Ολοκληρώστε τη διαμόρφωση του UPaste για αυτόματη επικόλληση.',

  'tray.settings': 'Ρυθμίσεις',
  'tray.quit': 'Έξοδος',
  'tray.update': 'Εγκατάσταση ενημέρωσης {version}',

  'settings.title': 'Ρυθμίσεις UPaste',
  'nav.general': 'Γενικά',
  'nav.history': 'Ιστορικό',
  'nav.setup': 'Διαμόρφωση',
  'nav.updates': 'Ενημερώσεις',
  'nav.about': 'Πληροφορίες',

  'general.description': 'Γλώσσα, εμφάνιση και εκκίνηση.',
  'general.language': 'Γλώσσα',
  'general.languageHint':
    'Χρησιμοποιείται στο παράθυρο προχείρου, στις ρυθμίσεις και στο μενού της περιοχής ειδοποιήσεων.',
  'general.systemLanguage': 'Προεπιλογή συστήματος ({language})',
  'general.theme': 'Εμφάνιση',
  'general.themeSystem': 'Σύστημα',
  'general.themeLight': 'Φωτεινή',
  'general.themeDark': 'Σκοτεινή',
  'general.launchAtLogin': 'Εκκίνηση κατά τη σύνδεση',
  'general.launchAtLoginHint':
    'Το UPaste εκτελείται στην περιοχή ειδοποιήσεων και καταγράφει ό,τι αντιγράφετε.',
  'general.layout': 'Άνοιγμα ως',
  'general.layoutHint': 'Πού εμφανίζεται το ιστορικό όταν πατάτε τη συντόμευση.',
  'general.layoutAuto': 'Δίπλα στο πεδίο κειμένου',
  'general.layoutAutoHint':
    'Ένα μικρό παράθυρο κάτω από το πεδίο κειμένου όπου πληκτρολογείτε· αλλού, ένα πάνελ στο κάτω μέρος της οθόνης.',
  'general.layoutSheet': 'Κάτω πάνελ',
  'general.layoutSheetHint':
    'Πάντα ένα πάνελ στο κάτω μέρος της οθόνης με τα στοιχεία το ένα δίπλα στο άλλο.',

  'history.description': 'Τι κρατά το UPaste και για πόσο.',
  'history.items': 'Στοιχεία',
  'history.images': 'Εικόνες',
  'history.pinned': 'Καρφιτσωμένα',
  'history.disk': 'Χρήση δίσκου',
  'history.keepFor': 'Διατήρηση ιστορικού',
  'history.keepForHint':
    'Τα παλαιότερα στοιχεία διαγράφονται αυτόματα. Τα καρφιτσωμένα στοιχεία διατηρούνται πάντα.',
  'history.forever': 'Για πάντα',
  'history.days': 'ημέρες',
  'history.privacy':
    'Το ιστορικό σας δεν φεύγει ποτέ από αυτόν τον υπολογιστή. Οι κωδικοί πρόσβασης που αντιγράφονται από διαχειριστές κωδικών δεν αποθηκεύονται.',
  'history.clear': 'Εκκαθάριση ιστορικού',
  'history.clearHint': 'Διαγράφει όλα τα στοιχεία του ιστορικού προχείρου.',
  'history.clearTitle': 'Εκκαθάριση ιστορικού προχείρου;',
  'history.clearBody': 'Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
  'history.clearPinned': 'Διαγραφή και των καρφιτσωμένων στοιχείων',
  'history.cancel': 'Ακύρωση',
  'history.confirmClear': 'Εκκαθάριση',
  'history.cleared': 'Το ιστορικό προχείρου εκκαθαρίστηκε',

  'setup.description':
    'Συνδέστε το UPaste με το GNOME, ώστε η συντόμευσή σας να ανοίγει το ιστορικό ακριβώς κάτω από το πεδίο κειμένου όπου πληκτρολογείτε.',
  'setup.ready': 'Όλα έτοιμα. Πατήστε {shortcut} σε οποιοδήποτε πεδίο κειμένου.',
  'setup.notReady':
    'Ολοκληρώστε τα παρακάτω βήματα για να χρησιμοποιήσετε τη συντόμευση {shortcut}.',
  'setup.notGnome':
    'Στο Linux, το UPaste χρειάζεται την επιφάνεια εργασίας GNOME. Η επιφάνεια εργασίας σας δεν αναγνωρίστηκε.',
  'setup.extension': 'Επέκταση GNOME Shell',
  'setup.extensionHint':
    'Τοποθετεί το παράθυρο στο πεδίο κειμένου, παρακολουθεί το πρόχειρο και επικολλά το στοιχείο που επιλέγετε.',
  'setup.install': 'Εγκατάσταση',
  'setup.update': 'Ενημέρωση',
  'setup.enable': 'Ενεργοποίηση',
  'setup.logout': 'Αποσύνδεση',
  'setup.statusActive': 'Ενεργή',
  'setup.statusRelogin': 'Αποσυνδεθείτε και συνδεθείτε ξανά για ολοκλήρωση',
  'setup.statusDisabled': 'Ανενεργή',
  'setup.statusError': 'Αποτυχία φόρτωσης',
  'setup.statusMissing': 'Δεν έχει εγκατασταθεί',
  'setup.shortcut': 'Συντόμευση',
  'setup.shortcutHint': 'Ανοίγει το ιστορικό προχείρου.',
  'setup.shortcutReady': 'Αντιστοιχίστηκε στο UPaste',
  'setup.shortcutTaken': 'Χρησιμοποιείται από: {names}',
  'setup.shortcutWaiting': 'Αναμονή για την επέκταση',
  'setup.takeOver': 'Χρήση για το UPaste',
  'setup.restore': 'Επαναφορά προηγούμενης',
  'setup.restored': 'Η προηγούμενη συντόμευσή σας επαναφέρθηκε.',
  'setup.shortcutChange': 'Αλλαγή',
  'setup.shortcutRecording': 'Πατήστε τη νέα συντόμευση…',
  'setup.shortcutReset': 'Επαναφορά',
  'setup.shortcutInvalid':
    'Χρησιμοποιήστε Super, Ctrl ή Alt μαζί με ένα γράμμα, έναν αριθμό ή ένα πλήκτρο F.',
  'setup.descriptionWindows': 'Επιλέξτε τη συντόμευση που ανοίγει το ιστορικό προχείρου.',
  'setup.descriptionMac':
    'Επιτρέψτε στο UPaste να συνεργάζεται με άλλες εφαρμογές και επιλέξτε τη συντόμευση που ανοίγει το ιστορικό προχείρου.',
  'setup.shortcutHintWindows':
    'Το Win+V ανοίγει το UPaste αντί για το ιστορικό προχείρου των Windows. Επιλέξτε άλλη συντόμευση για να επιστρέψετε το Win+V στα Windows.',
  'setup.shortcutInUse': 'Μια άλλη εφαρμογή χρησιμοποιεί αυτή τη συντόμευση',
  'setup.accessibility': 'Άδεια προσβασιμότητας',
  'setup.accessibilityHint':
    'Επιτρέπει στο UPaste να ανοίγει το ιστορικό στον δρομέα κειμένου και να επικολλά το στοιχείο που επιλέγετε.',
  'setup.statusAllowed': 'Επιτρέπεται',
  'setup.statusNotAllowed': 'Δεν επιτρέπεται',
  'setup.openAccessibility': 'Άνοιγμα ρυθμίσεων απορρήτου',
  'setup.messageTray': 'Λίστα ειδοποιήσεων',

  'updates.description': 'Το UPaste ενημερώνεται αυτόματα από τα GitHub Releases.',
  'updates.version': 'Έκδοση {version}',
  'updates.check': 'Έλεγχος για ενημερώσεις',
  'updates.checking': 'Έλεγχος…',
  'updates.upToDate': 'Το UPaste είναι ενημερωμένο.',
  'updates.available': 'Η έκδοση {version} είναι διαθέσιμη.',
  'updates.download': 'Λήψη και εγκατάσταση',
  'updates.downloading': 'Λήψη… {percent}%',
  'updates.downloaded': 'Η έκδοση {version} είναι έτοιμη για εγκατάσταση.',
  'updates.install': 'Επανεκκίνηση και εγκατάσταση',
  'updates.installing': 'Εγκατάσταση… Εισαγάγετε τον κωδικό πρόσβασής σας, αν ζητηθεί.',
  'updates.openPage': 'Άνοιγμα σελίδας λήψης',
  'updates.notes': 'Σημειώσεις έκδοσης',
  'updates.failed': 'Η ενημέρωση απέτυχε: {message}',
  'updates.lastChecked': 'Τελευταίος έλεγχος: {time}',
  'updates.auto': 'Αυτόματος έλεγχος για ενημερώσεις',
  'updates.autoHint':
    'Ελέγχει λίγο μετά την εκκίνηση και κάθε 6 ώρες. Δεν γίνεται καμία λήψη χωρίς να ερωτηθείτε.',
  'updates.manualOnly':
    'Αυτό το αντίγραφο δεν μπορεί να ενημερωθεί μόνο του· οι νέες εκδόσεις ανοίγουν στη σελίδα λήψης.',
  'updates.passwordClosed': 'Το παράθυρο κωδικού πρόσβασης έκλεισε. Η ενημέρωση δεν εγκαταστάθηκε.',
  'updates.noAdmin':
    'Δεν ήταν δυνατή η απόκτηση δικαιωμάτων διαχειριστή. Η ενημέρωση δεν εγκαταστάθηκε.',
  'updates.noNewPrivs':
    'Το UPaste δεν μπορεί να ζητήσει δικαιώματα διαχειριστή σε αυτή τη συνεδρία. Κλείστε το UPaste από το μενού της περιοχής ειδοποιήσεων, ανοίξτε το ξανά και δοκιμάστε πάλι.',
  'updates.installFailed': 'Δεν ήταν δυνατή η εγκατάσταση της ενημέρωσης (κωδικός εξόδου {code}).',
  'updates.startFailed': 'Δεν ήταν δυνατή η εκκίνηση του προγράμματος εγκατάστασης: {message}',

  'about.tagline': 'Ιστορικό προχείρου με αναζήτηση για κείμενο και εικόνες.',
  'about.source': 'Πηγαίος κώδικας',
  'about.issues': 'Αναφορά προβλήματος',
  'about.license': 'Διατίθεται με την άδεια MIT.'
}
