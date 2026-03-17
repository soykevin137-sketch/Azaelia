# Bot Azaelia

Este es un bot de WhatsApp llamado Azaelia con los siguientes comandos:

- `.menu` - Muestra el menú con todos los comandos y una imagen.
- `.todos` - Menciona a todos los miembros del grupo.
- `.n` - Hidetag (menciona a todos los miembros del grupo sin texto visible).
- `.cerrar grupo` - Cierra el grupo (solo admins).
- `.abrir grupo` - Abre el grupo (solo admins).
- `.kick` - Expulsa a un usuario mencionado (solo admins).
- `.promote` - Promueve a un usuario a admin (solo admins).
- `.despromote` - Quita admin a un usuario (solo admins).

## Instalación

1. Asegúrate de tener Node.js instalado.
2. Ejecuta `npm install` en la carpeta del proyecto.

## Ejecución

Ejecuta `node index.js` para iniciar el bot. Escanea el código QR con WhatsApp Web para conectar.

## Notas

- El bot debe ser admin en el grupo para comandos de administración.
- Para comandos como kick, promote, etc., menciona al usuario con @.