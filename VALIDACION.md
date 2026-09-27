# Validación — 27 de septiembre de 2026

## Comprobado en este entorno

- Extracción y revisión del ZIP original; conserva el identificador Android `com.miscuentas.pro`, con versionCode 2 y versionName 2.0.0.
- Sintaxis de los archivos JavaScript y correspondencia exacta de los recursos Android/web.
- Huellas SHA-256 de las funciones originales `vals`, `renderQuarters`, `renderCash` y `monthlyIncomeRows`: coinciden con las funciones de esta entrega.
- Casos contables concretos: base 100 y cuota IVA 21 para total 121; cálculo trimestral con importe contable distinto del original, deducciones IRPF/IVA y retenciones; caja acumulada y totales del informe mensual.
- Almacenamiento local: importación del formato original, separación de dos UID y modo local, persistencia de cambios pendientes, rechazo de estructura inválida y copia de recuperación.
- Navegador Microsoft Edge mediante Playwright: alta de movimiento y conservación tras recargar; recarga y alta de movimiento sin conexión; segunda pestaña bloqueada; sin errores JavaScript.
- Revisión visual de inicio en escritorio (1280 px) y móvil (390 px), sin desbordamiento horizontal.
- Impresión desde Ajustes: informe visible en modo impresión, PDF del navegador con una página y totales 121,00 / 100,00; llamada al puente Android comprobada con un puente simulado. La impresión Android real sigue pendiente.
- Transporte Firestore simulado ejecutando el código real de sincronización: primera subida, conflicto de revisión, resolución con nube, cambio local durante una subida, segunda subida de ese cambio, reintento tras perder respuesta y separación de cuentas. Resultado: correcto.
- Presencia de permiso INTERNET, configuración de Hosting y reglas con condición UID. Las bibliotecas Firebase están incluidas localmente.

## No ejecutado aquí

- **Compilación APK y Android Lint:** no hay SDK Android/Gradle instalado en este entorno. Existe JDK 21, pero no basta para compilar Android. El workflow ejecuta ambas comprobaciones en GitHub Actions; no se afirma que ya hayan pasado.
- **Reglas en el emulador o proyecto real y acceso real Firebase:** no se han publicado reglas, creado usuarios, desplegado Hosting ni escrito datos de producción. Las pruebas simuladas no sustituyen la validación de reglas en servidor.
- **Dispositivo Android:** pendiente probar la actualización con la misma firma, la migración de almacenamiento WebView, la impresión y los selectores nativos. El puente de impresión y sus parámetros A4 se conservan.

## Comprobación antes de utilizar datos reales

1. Exportar una copia JSON de la instalación anterior.
2. Publicar las reglas suministradas y activar Correo/contraseña.
3. Con dos cuentas de prueba, verificar que cada una accede a `users/SU_UID/state/main` y que la otra recibe acceso denegado. Una petición sin sesión también debe fallar. Comprobarlo en el simulador de reglas de Firebase.
4. Con la misma cuenta en móvil/PC, crear un movimiento y pulsar Sincronizar ahora en el otro dispositivo. Probar también una edición y un borrado.
5. Desconectar ambos, modificar datos en cada uno, reconectar y verificar el aviso de conflicto y la copia de recuperación.
6. Compilar con Actions. Instalar primero en un dispositivo de prueba, verificar migración desde v1 con igual firma, PIN, importe original/contable, informe mensual, Imprimir/Guardar PDF y exportación/importación JSON.

La sincronización por instantánea tiene límite de 850 KB y resuelve conflictos mediante elección explícita de copia; no combina cambios de dispositivos automáticamente.
