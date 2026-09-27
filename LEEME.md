# Mis Cuentas PRO 2.0.0 — Android + Web

Versión preparada a partir de `Mis_Cuentas_PRO_Android_Nativo_v1.zip`.

## Puesta en marcha de Firebase

1. Abre https://console.firebase.google.com/ y selecciona **mis-cuentas-pro-b565d**.
2. En **Authentication → Sign-in method**, activa **Correo electrónico/contraseña**. No necesitas activar enlaces de acceso por correo.
3. En **Firestore Database**, crea la base de datos **(default)** si todavía no existe. Elige su ubicación antes de crearla.
4. En **Firestore Database → Reglas**, sustituye TODO el contenido por `firestore.rules` de este proyecto y pulsa **Publicar**. No combines estas reglas con una regla anterior que permita acceso global: las reglas permisivas se acumulan.
5. En **Authentication → Settings → Authorized domains**, incluye `mis-cuentas-pro-b565d.web.app`, `mis-cuentas-pro-b565d.firebaseapp.com` y `appassets.androidplatform.net`. Añade cualquier dominio propio que utilices. Para desarrollo local, añade `localhost` si lo necesitas.
6. Publica la web con las instrucciones siguientes. Registra una cuenta desde Ajustes y utiliza el mismo correo en el móvil y el ordenador.

La configuración pública facilitada ya está en `cloud.js`. No contiene claves privadas de administrador. La protección del acceso depende de publicar las reglas. No hace falta un `google-services.json`: Android utiliza el SDK web dentro de WebView.

## Publicar la web y las reglas

Instala Node.js 22 LTS y la CLI oficial de Firebase, abre una terminal **en esta carpeta** y ejecuta:

```text
npm install -g firebase-tools
firebase login
node tools/prepare-web.cjs
node tests/verify.cjs
firebase deploy --only firestore:rules,hosting --project mis-cuentas-pro-b565d
```

Tras publicar, la dirección será https://mis-cuentas-pro-b565d.web.app/ . El proyecto no se ha publicado desde esta entrega. `web/` ya contiene la copia completa lista para Hosting. No abras `index.html` directamente con doble clic: usa Hosting o un servidor HTTP local.

Abre la web con conexión la primera vez y espera a que termine de cargar. Su service worker guarda los archivos de la aplicación, incluidas las bibliotecas Firebase, para poder volver a abrirla offline. El primer acceso o registro de una cuenta sí necesita conexión. No se requiere un proceso de empaquetado npm para ejecutar la app.

## Datos existentes y copia local

- Los datos antiguos permanecen en el **modo local**. Para llevarlos a tu cuenta: inicia sesión → Ajustes → **Copiar datos del modo local a esta cuenta**. Esta operación pide confirmación, conserva una copia de recuperación de los datos sustituidos y no borra el modo local.
- Cada UID tiene un almacenamiento local independiente. Cerrar sesión vuelve al modo local; la copia de la cuenta permanece en ese dispositivo para el próximo acceso con esa misma cuenta.
- Android intenta copiar los datos y el PIN del origen `file:///android_asset/index.html` anterior al nuevo origen HTTPS interno, sin borrar el original. Es una migración local y no requiere conexión.
- **Antes de actualizar una instalación Android, exporta una copia JSON.** Para instalar encima y conservar los datos necesitas la misma firma que utilizó el APK anterior. El ZIP original no incluye esa firma. Desinstalar la app elimina sus datos: si no puedes actualizar directamente, conserva primero la copia y después impórtala en la nueva instalación.
- El PIN sigue siendo una protección local de interfaz, no un cifrado del archivo. Las copias locales se guardan en el almacenamiento del perfil del navegador/app; no se borran al cerrar sesión. En dispositivos compartidos utiliza un perfil separado y protege el dispositivo.
- Exportar/importar JSON, vista PDF, generación PDF, impresión nativa, ajustes, gestoría y caja/banco siguen disponibles. Android incorpora selectores nativos para importar y guardar archivos.

## Cómo funciona la sincronización

Se guarda un documento en `users/{uid}/state/main`, con la copia contable serializada, una revisión y un identificador de operación. Las reglas solo permiten que `request.auth.uid == uid`. No permiten listar cuentas ni acceder a otras rutas.

Cada edición se guarda primero localmente. Se agrupan los cambios durante 3 segundos antes de intentar subirlos. Se consulta la nube al iniciar sesión, recuperar conexión o volver a la pestaña (con un intervalo mínimo de 60 segundos para consultas sin cambios). **Sincronizar ahora** permite forzar una consulta. No hay un sondeo periódico ni un listener permanente: si mantienes dos pantallas abiertas, pulsa ese botón en la receptora para ver inmediatamente los cambios de la otra.

Una consulta habitual lee un único documento. Una subida usa una transacción que lee y, si no hay conflicto, escribe un documento; Firestore puede repetir esa lectura si hay concurrencia. Esto reduce el número de lecturas a cambio de transferir toda la copia. El límite de sincronización es **850 KB de JSON UTF-8 por cuenta**; si se supera, la app lo indica y conserva los datos localmente. Para grandes historiales habría que evolucionar a documentos por registro.

Si ambos dispositivos cambian datos desde la misma revisión, la app **no sustituye silenciosamente ninguna copia**. En Ajustes podrás exportar la copia actual y elegir la local o la de la nube. Antes de sustituir se guarda una copia de recuperación. No existe mezcla automática de movimientos: combina manualmente las copias si necesitas conservar cambios de ambas.

**Exportar copias de recuperación** descarga un JSON con un mapa de copias. Para recuperar una concreta, extrae el objeto de esa entrada a un JSON independiente e impórtalo con Importar copia. Se guardan por cuenta y dispositivo, sin borrado automático; exporta periódicamente las copias. Si no hay espacio local para conservar una copia de recuperación, la sustitución se cancela.

Los cambios pendientes sobreviven al cierre y vuelven a intentarse al reconectar, volver a la app o pulsar Sincronizar ahora. Un fallo de red no equivale a una subida confirmada. El identificador de operación reconoce una subida que llegó al servidor aunque se perdiera su respuesta. Se permite una sola pestaña editora por origen para evitar sobrescrituras locales; mantén actualizado el navegador o Android System WebView.

## Compilar Android en GitHub Actions

1. Sube **el contenido de esta carpeta** a la raíz del repositorio, incluyendo `.github/`, `.firebaserc` y `gradle.properties`. No dejes el proyecto dentro de una subcarpeta.
2. Abre **Actions → Validar y compilar Mis Cuentas PRO → Run workflow**. También se ejecuta en push a `main`/`master` y en pull requests.
3. Descarga `Mis-Cuentas-PRO-2.0.0-APK-debug` desde Artifacts del trabajo completado.

El flujo instala Java 17, Android SDK 35 y Gradle 8.9, valida JavaScript y ejecuta `assembleDebug lintDebug`. El plugin Android es 8.7.3. El proyecto original no incluía Gradle Wrapper; el flujo instala Gradle expresamente, por lo que no depende de `gradlew`.

Se entrega un **APK debug de prueba al ejecutar Actions**, no un APK firmado de distribución. Para estabilizar la firma debug entre compilaciones, puedes configurar el secreto de repositorio `ANDROID_DEBUG_KEYSTORE_BASE64` con tu keystore debug existente en base64 (alias y contraseña debug estándar). El flujo lo restaura sin imprimirlo. Solo preserva instalaciones previas si corresponde a su firma. Para distribución final configura tu firma release privada fuera del repositorio.

En un equipo con JDK 17, Gradle 8.9 y SDK Android 35 instalados:

```text
gradle assembleDebug lintDebug
```

## Desarrollo y pruebas

El código fuente común está en `app/src/main/assets/`. Tras modificarlo ejecuta `node tools/prepare-web.cjs` para actualizar `web/`. No edites ambas copias por separado. El test comprueba que sean iguales.

```text
node tests/verify.cjs
```

La prueba del navegador es opcional y requiere Playwright instalado y Chromium descargado:

```text
npm install --no-save playwright@1.62.1
npx playwright install chromium
node tests/browser.cjs
```

También puede utilizar Edge instalado con la variable de entorno `MCP_BROWSER_CHANNEL=msedge`. Guarda las capturas en `test-results/`. Las pruebas usan datos ficticios; no crean cuentas ni escriben en el Firebase real. La conexión a Firestore se sustituye por un servidor simulado para verificar la lógica de sincronización.

Consulta `VALIDACION.md` para conocer los resultados y las comprobaciones pendientes en un dispositivo real.

## Referencias de implementación

- Firebase: https://firebase.google.com/docs/firestore/manage-data/transactions
- SDK web y distribución oficial: https://firebase.google.com/docs/web/alt-setup
- Origen HTTPS para recursos locales Android: https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader
- Bibliotecas incluidas: Firebase JavaScript SDK 12.19.0, descargadas de `https://www.gstatic.com/firebasejs/12.19.0/`. Sus avisos de licencia se conservan en los archivos.
