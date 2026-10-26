import type { Messages } from './en'

export const fr: Messages = {
  'popup.search': 'Rechercher dans l’historique du presse-papiers',
  'popup.filterAll': 'Tout',
  'popup.filterText': 'Texte',
  'popup.filterImages': 'Images',
  'popup.filterPinned': 'Épinglés',
  'popup.emptyTitle': 'Votre historique du presse-papiers est vide',
  'popup.emptyBody': 'Copiez du texte ou une image : il apparaîtra ici.',
  'popup.noResults': 'Aucun résultat pour « {query} »',
  'popup.noPinned': 'Épinglez les éléments que vous utilisez souvent pour les garder ici.',
  'popup.pin': 'Épingler',
  'popup.unpin': 'Désépingler',
  'popup.delete': 'Supprimer',
  'popup.pinned': 'Épinglé',
  'popup.image': 'Image',
  'popup.navigate': 'Naviguer',
  'popup.paste': 'Coller',
  'popup.close': 'Fermer',
  'popup.settings': 'Paramètres',

  'notify.copiedTitle': 'Copié dans le presse-papiers',
  'notify.relogin':
    'L’extension GNOME d’UPaste a été mise à jour. Déconnectez-vous puis reconnectez-vous pour terminer.',
  'notify.copiedBody':
    'Appuyez sur Ctrl+V pour coller. Terminez la configuration d’UPaste pour coller automatiquement.',

  'tray.settings': 'Paramètres',
  'tray.quit': 'Quitter',
  'tray.update': 'Installer la mise à jour {version}',

  'settings.title': 'Paramètres d’UPaste',
  'nav.general': 'Général',
  'nav.history': 'Historique',
  'nav.setup': 'Configuration',
  'nav.updates': 'Mises à jour',
  'nav.about': 'À propos',

  'general.description': 'Langue, apparence et démarrage.',
  'general.language': 'Langue',
  'general.languageHint':
    'Utilisée dans la fenêtre du presse-papiers, les paramètres et le menu de la zone de notification.',
  'general.systemLanguage': 'Langue du système ({language})',
  'general.theme': 'Apparence',
  'general.themeSystem': 'Système',
  'general.themeLight': 'Clair',
  'general.themeDark': 'Sombre',
  'general.launchAtLogin': 'Lancer à l’ouverture de session',
  'general.launchAtLoginHint':
    'UPaste s’exécute dans la zone de notification et enregistre tout ce que vous copiez.',
  'general.layout': 'Mode d’ouverture',
  'general.layoutHint': 'Où l’historique s’affiche lorsque vous appuyez sur le raccourci.',
  'general.layoutAuto': 'À côté du champ de texte',
  'general.layoutAutoHint':
    'Une petite fenêtre sous le champ de texte où vous écrivez, ou un panneau en bas de l’écran partout ailleurs.',
  'general.layoutSheet': 'Panneau inférieur',
  'general.layoutSheetHint':
    'Toujours un panneau en bas de l’écran, avec les éléments côte à côte.',

  'history.description': 'Ce qu’UPaste conserve, et pendant combien de temps.',
  'history.items': 'Éléments',
  'history.images': 'Images',
  'history.pinned': 'Épinglés',
  'history.disk': 'Espace disque',
  'history.keepFor': 'Conserver l’historique',
  'history.keepForHint':
    'Les éléments plus anciens sont supprimés automatiquement. Les éléments épinglés sont toujours conservés.',
  'history.forever': 'Indéfiniment',
  'history.days': 'jours',
  'history.privacy':
    'Votre historique ne quitte jamais cet ordinateur. Les mots de passe copiés depuis un gestionnaire de mots de passe ne sont pas enregistrés.',
  'history.clear': 'Effacer l’historique',
  'history.clearHint': 'Supprime tous les éléments de l’historique du presse-papiers.',
  'history.clearTitle': 'Effacer l’historique du presse-papiers ?',
  'history.clearBody': 'Cette action est irréversible.',
  'history.clearPinned': 'Supprimer aussi les éléments épinglés',
  'history.cancel': 'Annuler',
  'history.confirmClear': 'Effacer',
  'history.cleared': 'Historique du presse-papiers effacé',

  'setup.description':
    'Connectez UPaste à GNOME pour que votre raccourci ouvre l’historique juste sous le champ de texte où vous écrivez.',
  'setup.ready': 'Tout est prêt. Appuyez sur {shortcut} dans n’importe quel champ de texte.',
  'setup.notReady': 'Suivez les étapes ci-dessous pour utiliser {shortcut}.',
  'setup.notGnome':
    'Sous Linux, UPaste nécessite le bureau GNOME. Votre bureau n’a pas été reconnu.',
  'setup.extension': 'Extension GNOME Shell',
  'setup.extensionHint':
    'Place la fenêtre au niveau de votre champ de texte, surveille le presse-papiers et colle l’élément choisi.',
  'setup.install': 'Installer',
  'setup.update': 'Mettre à jour',
  'setup.enable': 'Activer',
  'setup.logout': 'Fermer la session',
  'setup.statusActive': 'Active',
  'setup.statusRelogin': 'Fermez puis rouvrez la session pour terminer',
  'setup.statusDisabled': 'Désactivée',
  'setup.statusError': 'Échec du chargement',
  'setup.statusMissing': 'Non installée',
  'setup.shortcut': 'Raccourci',
  'setup.shortcutHint': 'Ouvre l’historique du presse-papiers.',
  'setup.shortcutReady': 'Attribué à UPaste',
  'setup.shortcutTaken': 'Utilisé par {names}',
  'setup.shortcutWaiting': 'En attente de l’extension',
  'setup.takeOver': 'Utiliser pour UPaste',
  'setup.restore': 'Restaurer le précédent',
  'setup.restored': 'Votre raccourci précédent a été rétabli.',
  'setup.shortcutChange': 'Modifier',
  'setup.shortcutRecording': 'Appuyez sur le nouveau raccourci…',
  'setup.shortcutReset': 'Réinitialiser',
  'setup.shortcutInvalid':
    'Utilisez Super, Ctrl ou Alt avec une lettre, un chiffre ou une touche F.',
  'setup.messageTray': 'Liste des notifications',

  'updates.description': 'UPaste se met à jour lui-même depuis GitHub Releases.',
  'updates.version': 'Version {version}',
  'updates.check': 'Rechercher des mises à jour',
  'updates.checking': 'Recherche en cours…',
  'updates.upToDate': 'UPaste est à jour.',
  'updates.available': 'La version {version} est disponible.',
  'updates.download': 'Télécharger et installer',
  'updates.downloading': 'Téléchargement… {percent} %',
  'updates.downloaded': 'La version {version} est prête à être installée.',
  'updates.install': 'Redémarrer et installer',
  'updates.installing': 'Installation… Saisissez votre mot de passe si on vous le demande.',
  'updates.openPage': 'Ouvrir la page de téléchargement',
  'updates.notes': 'Notes de version',
  'updates.failed': 'Échec de la mise à jour : {message}',
  'updates.lastChecked': 'Dernière vérification : {time}',
  'updates.auto': 'Rechercher automatiquement les mises à jour',
  'updates.autoHint':
    'Vérifie peu après le démarrage, puis toutes les 6 heures. Rien n’est téléchargé sans votre accord.',
  'updates.manualOnly':
    'Cette copie ne peut pas se mettre à jour elle-même ; les nouvelles versions s’ouvrent sur la page de téléchargement.',
  'updates.passwordClosed':
    'La fenêtre du mot de passe a été fermée. La mise à jour n’a pas été installée.',
  'updates.noAdmin':
    'Impossible d’obtenir les droits d’administrateur. La mise à jour n’a pas été installée.',
  'updates.noNewPrivs':
    'UPaste ne peut pas demander les droits d’administrateur dans cette session. Quittez UPaste depuis le menu de la zone de notification, relancez-le et réessayez.',
  'updates.installFailed': 'La mise à jour n’a pas pu être installée (code de sortie {code}).',
  'updates.startFailed': 'Impossible de lancer le programme d’installation : {message}',

  'about.tagline': 'Historique du presse-papiers consultable pour le texte et les images.',
  'about.source': 'Code source',
  'about.issues': 'Signaler un problème',
  'about.license': 'Publié sous licence MIT.'
}
