import type { Messages } from './en'

export const es: Messages = {
  'popup.search': 'Buscar en el historial del portapapeles',
  'popup.filterAll': 'Todo',
  'popup.filterText': 'Texto',
  'popup.filterImages': 'Imágenes',
  'popup.filterPinned': 'Anclados',
  'popup.emptyTitle': 'El historial del portapapeles está vacío',
  'popup.emptyBody': 'Copia un texto o una imagen y aparecerá aquí.',
  'popup.noResults': 'No hay resultados para «{query}»',
  'popup.noPinned': 'Ancla los elementos que usas a menudo para tenerlos siempre aquí.',
  'popup.pin': 'Anclar',
  'popup.unpin': 'Desanclar',
  'popup.delete': 'Eliminar',
  'popup.pinned': 'Anclado',
  'popup.image': 'Imagen',
  'popup.navigate': 'Navegar',
  'popup.paste': 'Pegar',
  'popup.close': 'Cerrar',
  'popup.settings': 'Configuración',

  'notify.copiedTitle': 'Copiado en el portapapeles',
  'notify.relogin':
    'Se actualizó la extensión de GNOME de UPaste. Cierra la sesión y vuelve a iniciarla para terminar.',
  'notify.copiedBody':
    'Pulsa {paste} para pegar. Completa la instalación de UPaste para pegar automáticamente.',

  'tray.settings': 'Configuración',
  'tray.quit': 'Salir',
  'tray.update': 'Instalar la actualización {version}',

  'settings.title': 'Configuración de UPaste',
  'nav.general': 'General',
  'nav.history': 'Historial',
  'nav.setup': 'Instalación',
  'nav.updates': 'Actualizaciones',
  'nav.about': 'Acerca de',

  'general.description': 'Idioma, apariencia e inicio.',
  'general.language': 'Idioma',
  'general.languageHint':
    'Se usa en la ventana del portapapeles, la configuración y el menú de la bandeja del sistema.',
  'general.systemLanguage': 'Predeterminado del sistema ({language})',
  'general.theme': 'Apariencia',
  'general.themeSystem': 'Sistema',
  'general.themeLight': 'Claro',
  'general.themeDark': 'Oscuro',
  'general.launchAtLogin': 'Abrir al iniciar sesión',
  'general.launchAtLoginHint':
    'UPaste se ejecuta en la bandeja del sistema y guarda todo lo que copias.',
  'general.layout': 'Abrir como',
  'general.layoutHint': 'Dónde aparece el historial al pulsar el atajo.',
  'general.layoutAuto': 'Junto al campo de texto',
  'general.layoutAutoHint':
    'Una ventana pequeña bajo el campo de texto en el que escribes; en los demás casos, un panel en la parte inferior de la pantalla.',
  'general.layoutSheet': 'Panel inferior',
  'general.layoutSheetHint':
    'Siempre un panel en la parte inferior de la pantalla, con los elementos uno al lado del otro.',

  'history.description': 'Qué guarda UPaste y durante cuánto tiempo.',
  'history.items': 'Elementos',
  'history.images': 'Imágenes',
  'history.pinned': 'Anclados',
  'history.disk': 'Uso de disco',
  'history.keepFor': 'Conservar el historial',
  'history.keepForHint':
    'Los elementos más antiguos se eliminan automáticamente. Los anclados se conservan siempre.',
  'history.forever': 'Siempre',
  'history.days': 'días',
  'history.privacy':
    'Tu historial nunca sale de este equipo. Las contraseñas copiadas desde gestores de contraseñas no se guardan.',
  'history.clear': 'Borrar historial',
  'history.clearHint': 'Elimina todos los elementos del historial del portapapeles.',
  'history.clearTitle': '¿Borrar el historial del portapapeles?',
  'history.clearBody': 'Esta acción no se puede deshacer.',
  'history.clearPinned': 'Eliminar también los elementos anclados',
  'history.cancel': 'Cancelar',
  'history.confirmClear': 'Borrar',
  'history.cleared': 'Historial del portapapeles borrado',

  'setup.description':
    'Conecta UPaste con GNOME para que tu atajo abra el historial justo debajo del campo de texto en el que escribes.',
  'setup.ready': 'Todo listo. Pulsa {shortcut} en cualquier campo de texto.',
  'setup.notReady': 'Completa los pasos siguientes para usar {shortcut}.',
  'setup.notGnome': 'En Linux, UPaste necesita el escritorio GNOME. No se reconoció tu escritorio.',
  'setup.extension': 'Extensión de GNOME Shell',
  'setup.extensionHint':
    'Coloca la ventana junto a tu campo de texto, vigila el portapapeles y pega el elemento que elijas.',
  'setup.install': 'Instalar',
  'setup.update': 'Actualizar',
  'setup.enable': 'Activar',
  'setup.logout': 'Cerrar sesión',
  'setup.statusActive': 'Activa',
  'setup.statusRelogin': 'Cierra sesión y vuelve a entrar para terminar',
  'setup.statusDisabled': 'Desactivada',
  'setup.statusError': 'Error al cargar',
  'setup.statusMissing': 'No instalada',
  'setup.shortcut': 'Atajo',
  'setup.shortcutHint': 'Abre el historial del portapapeles.',
  'setup.shortcutReady': 'Asignado a UPaste',
  'setup.shortcutTaken': 'En uso por {names}',
  'setup.shortcutWaiting': 'Esperando a la extensión',
  'setup.takeOver': 'Usar para UPaste',
  'setup.restore': 'Restaurar anterior',
  'setup.restored': 'Se restauró tu atajo anterior.',
  'setup.shortcutChange': 'Cambiar',
  'setup.shortcutRecording': 'Pulsa el nuevo atajo…',
  'setup.shortcutReset': 'Restablecer',
  'setup.shortcutInvalid': 'Usa Super, Ctrl o Alt junto con una letra, un número o una tecla F.',
  'setup.descriptionWindows': 'Elige el atajo que abre el historial del portapapeles.',
  'setup.descriptionMac':
    'Permite que UPaste funcione con otras aplicaciones y elige el atajo que abre el historial del portapapeles.',
  'setup.shortcutHintWindows':
    'Win+V abre UPaste en lugar del historial del portapapeles de Windows. Elige otro atajo para devolverle Win+V a Windows.',
  'setup.shortcutInUse': 'Otra aplicación usa este atajo',
  'setup.accessibility': 'Permiso de accesibilidad',
  'setup.accessibilityHint':
    'Permite que UPaste abra el historial junto al cursor de texto y pegue el elemento que elijas.',
  'setup.statusAllowed': 'Permitido',
  'setup.statusNotAllowed': 'No permitido',
  'setup.openAccessibility': 'Abrir ajustes de privacidad',
  'setup.messageTray': 'Lista de notificaciones',

  'updates.description': 'UPaste se actualiza solo desde GitHub Releases.',
  'updates.version': 'Versión {version}',
  'updates.check': 'Buscar actualizaciones',
  'updates.checking': 'Buscando…',
  'updates.upToDate': 'UPaste está actualizado.',
  'updates.available': 'La versión {version} está disponible.',
  'updates.download': 'Descargar e instalar',
  'updates.downloading': 'Descargando… {percent} %',
  'updates.downloaded': 'La versión {version} está lista para instalarse.',
  'updates.install': 'Reiniciar e instalar',
  'updates.installing': 'Instalando… Escribe tu contraseña si se te pide.',
  'updates.openPage': 'Abrir página de descarga',
  'updates.notes': 'Notas de la versión',
  'updates.failed': 'Error al actualizar: {message}',
  'updates.lastChecked': 'Última comprobación: {time}',
  'updates.auto': 'Buscar actualizaciones automáticamente',
  'updates.autoHint':
    'Comprueba poco después del inicio y cada 6 horas. No se descarga nada sin preguntar.',
  'updates.manualOnly':
    'Esta copia no puede actualizarse sola; las nuevas versiones se abren en la página de descarga.',
  'updates.passwordClosed':
    'Se ha cerrado la ventana de contraseña. No se ha instalado la actualización.',
  'updates.noAdmin':
    'No se han podido obtener permisos de administrador. No se ha instalado la actualización.',
  'updates.noNewPrivs':
    'UPaste no puede pedir permisos de administrador en esta sesión. Sal de UPaste desde el menú de la bandeja del sistema, vuelve a abrirlo e inténtalo de nuevo.',
  'updates.installFailed': 'No se ha podido instalar la actualización (código de salida {code}).',
  'updates.startFailed': 'No se ha podido iniciar el instalador: {message}',

  'about.tagline': 'Historial del portapapeles con búsqueda para texto e imágenes.',
  'about.source': 'Código fuente',
  'about.issues': 'Informar de un problema',
  'about.license': 'Publicado bajo la licencia MIT.'
}
