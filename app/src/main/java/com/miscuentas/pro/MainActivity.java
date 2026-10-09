package com.miscuentas.pro;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.view.WindowInsets;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/index.html";
    private static final String OLD = "file:///android_asset/index.html";
    private WebView webView;
    private boolean migrating;
    private String legacy = "{}";
    private ValueCallback<Uri[]> upload;
    private byte[] pendingFile;
    private String pendingFileName;
    private int bottomInsetCssPx = 0;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::onBackPressed
            );
        }


        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            int left;
            int top;
            int right;
            int bottom;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                Insets gestures = insets.getInsets(WindowInsets.Type.systemGestures());

                left = bars.left;
                top = bars.top;
                right = bars.right;
                bottom = Math.max(bars.bottom, gestures.bottom);
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
            }

            float density = getResources().getDisplayMetrics().density;
            bottomInsetCssPx = Math.max(0, Math.round(bottom / density));

            // Arriba/laterales se respetan de forma nativa.
            // El espacio inferior lo aplica la propia página para que los
            // botones fijos no queden debajo de la barra de gestos.
            v.setPadding(left, top, right, 0);
            applyBottomInsetToPage();

            return insets;
        });

        migrating = !getPreferences(MODE_PRIVATE)
                .getBoolean("httpsMigrationV2", false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(migrating);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        WebViewAssetLoader loader =
                new WebViewAssetLoader.Builder()
                        .addPathHandler(
                                "/assets/",
                                new WebViewAssetLoader.AssetsPathHandler(this)
                        )
                        .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                if (OLD.equals(request.getUrl().toString())) {
                    return new WebResourceResponse(
                            "text/html",
                            "UTF-8",
                            new ByteArrayInputStream(
                                    "<!doctype html><meta charset='utf-8'><p>Preparando tu copia local…</p>"
                                            .getBytes(java.nio.charset.StandardCharsets.UTF_8)
                            )
                    );
                }

                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    WebResourceRequest request
            ) {
                String url = request.getUrl().toString();
                Uri destination = request.getUrl();
                boolean callLink = "tel".equals(destination.getScheme())
                        && destination.getSchemeSpecificPart().matches("\\+?[0-9]{7,15}");
                boolean whatsappLink = "https".equals(destination.getScheme())
                        && "wa.me".equals(destination.getHost())
                        && destination.getPath() != null
                        && destination.getPath().matches("/[0-9]{7,15}")
                        && (destination.getQuery() == null || (destination.getQueryParameterNames().size() == 1 && destination.getQueryParameterNames().contains("text")));
                if (request.isForMainFrame() && request.hasGesture() && (callLink || whatsappLink)) {
                    try {
                        startActivity(new Intent(callLink ? Intent.ACTION_DIAL : Intent.ACTION_VIEW, destination));
                    } catch (android.content.ActivityNotFoundException e) {
                        new AlertDialog.Builder(MainActivity.this)
                            .setMessage(callLink ? "No se encontró una aplicación para llamar." : "No se pudo abrir WhatsApp o el navegador.")
                            .setPositiveButton("Aceptar", null).show();
                    }
                    return true;
                }

                if (request.isForMainFrame() && (url.equals("mailto:raulito-sp@hotmail.com") || url.startsWith("mailto:raulito-sp@hotmail.com?"))) {
                    try {
                        startActivity(new Intent(Intent.ACTION_SENDTO, Uri.parse(url)));
                    } catch (android.content.ActivityNotFoundException e) {
                        new AlertDialog.Builder(MainActivity.this)
                            .setMessage("Escribe a raulito-sp@hotmail.com desde tu correo. Asunto: Eliminar cuenta Mis Cuentas PRO.")
                            .setPositiveButton("Aceptar", null).show();
                    }
                    return true;
                }


                return !url.equals(HOME)
                        && !(migrating && url.equals(OLD));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                applyBottomInsetToPage();

                if (!migrating) return;

                if (OLD.equals(url)) {
                    view.evaluateJavascript(
                            "JSON.stringify({mis_cuentas_pro_web_v1:localStorage.getItem('mis_cuentas_pro_web_v1'),mcp_pin_hash:localStorage.getItem('mcp_pin_hash')})",
                            result -> {
                                try {
                                    Object parsed =
                                            new JSONTokener(result).nextValue();

                                    if (!(parsed instanceof String)) {
                                        throw new Exception(
                                                "No se pudo leer el almacenamiento anterior"
                                        );
                                    }

                                    legacy =
                                            new JSONObject((String) parsed)
                                                    .toString();

                                    view.loadUrl(
                                            ORIGIN + "/assets/migrate.html"
                                    );

                                } catch (Exception e) {
                                    migrationError();
                                }
                            }
                    );

                } else if (
                        url.equals(ORIGIN + "/assets/migrate.html")
                ) {
                    view.evaluateJavascript(
                            "(function(){try{const d="
                                    + legacy
                                    + ";for(const k of Object.keys(d)){if(d[k]!==null&&localStorage.getItem(k)===null)localStorage.setItem(k,d[k]);}return true}catch(e){return false}})()",
                            result -> {
                                if (!"true".equals(result)) {
                                    migrationError();
                                    return;
                                }

                                getPreferences(MODE_PRIVATE)
                                        .edit()
                                        .putBoolean(
                                                "httpsMigrationV2",
                                                true
                                        )
                                        .apply();

                                migrating = false;
                                settings.setAllowFileAccess(false);

                                view.loadUrl(HOME);
                                view.clearHistory();
                            }
                    );
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (upload != null) {
                    upload.onReceiveValue(null);
                }

                upload = callback;

                String[] accepted = params.getAcceptTypes();
                boolean images = false;
                for (String type : accepted) if (type != null && type.startsWith("image/")) images = true;
                Intent intent =
                        new Intent(Intent.ACTION_GET_CONTENT)
                                .setType(images ? "image/*" : "application/json")
                                .addCategory(
                                        Intent.CATEGORY_OPENABLE
                                );

                try {
                    startActivityForResult(intent, 42);
                } catch (Exception e) {
                    upload.onReceiveValue(null);
                    upload = null;
                }

                return true;
            }

            @Override
            public boolean onJsConfirm(
                    WebView view,
                    String url,
                    String message,
                    JsResult result
            ) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(
                                "Aceptar",
                                (d, w) -> result.confirm()
                        )
                        .setNegativeButton(
                                "Cancelar",
                                (d, w) -> result.cancel()
                        )
                        .setOnCancelListener(
                                d -> result.cancel()
                        )
                        .show();

                return true;
            }
        });

        webView.addJavascriptInterface(new ContactBridge(), "AndroidContacts");
        webView.addJavascriptInterface(
                new PrintBridge(),
                "AndroidPrint"
        );

        webView.addJavascriptInterface(
                new FileBridge(),
                "AndroidFiles"
        );

        webView.loadUrl(migrating ? OLD : HOME);
    }

    private void applyBottomInsetToPage() {
        if (webView == null) return;

        webView.evaluateJavascript(
                "document.documentElement.style.setProperty('--android-bottom-inset','"
                        + bottomInsetCssPx
                        + "px');",
                null
        );
    }

    private void migrationError() {
        new AlertDialog.Builder(this)
                .setTitle("No se pudo migrar la copia local")
                .setMessage(
                        "Los datos originales siguen intactos. Cierra y vuelve a abrir la app. No borres sus datos ni la desinstales."
                )
                .setPositiveButton(
                        "Cerrar",
                        (d, w) -> finish()
                )
                .show();
    }

    private class ContactBridge {
        @JavascriptInterface
        public void openWhatsApp(String phone, String message) {
            runOnUiThread(() -> {
                if (!HOME.equals(webView.getUrl()) || phone == null || !phone.matches("[0-9]{7,15}") || message == null || message.length() > 4000) return;
                Uri destination = new Uri.Builder().scheme("https").authority("wa.me").appendPath(phone).appendQueryParameter("text", message).build();
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, destination));
                } catch (android.content.ActivityNotFoundException e) {
                    new AlertDialog.Builder(MainActivity.this).setMessage("No se pudo abrir WhatsApp o el navegador.").setPositiveButton("Aceptar", null).show();
                }
            });
        }
    }

    private class PrintBridge {
        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                if (!HOME.equals(webView.getUrl())) return;

                PrintManager pm =
                        (PrintManager) getSystemService(
                                PRINT_SERVICE
                        );

                PrintDocumentAdapter adapter =
                        webView.createPrintDocumentAdapter(
                                "Mis_Cuentas_PRO"
                        );

                PrintAttributes attrs =
                        new PrintAttributes.Builder()
                                .setMediaSize(
                                        PrintAttributes.MediaSize.ISO_A4
                                )
                                .setMinMargins(
                                        PrintAttributes.Margins.NO_MARGINS
                                )
                                .build();

                pm.print(
                        "Mis Cuentas PRO",
                        adapter,
                        attrs
                );
            });
        }
    }

    private class FileBridge {
        @JavascriptInterface
        public void saveFile(
                String base64,
                String name,
                String mime
        ) {
            runOnUiThread(() -> {
                if (!HOME.equals(webView.getUrl())
                        || pendingFile != null) {
                    notifyFileSaved(false, name);
                    return;
                }

                try {
                    pendingFileName = name;
                    pendingFile =
                            Base64.decode(
                                    base64,
                                    Base64.DEFAULT
                            );

                    Intent intent =
                            new Intent(
                                    Intent.ACTION_CREATE_DOCUMENT
                            )
                                    .addCategory(
                                            Intent.CATEGORY_OPENABLE
                                    )
                                    .setType(
                                            "application/pdf".equals(mime)
                                                    ? "application/pdf"
                                                    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".equals(mime)
                                                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                    : "application/json"
                                    )
                                    .putExtra(
                                            Intent.EXTRA_TITLE,
                                            name.replaceAll(
                                                    "[^a-zA-Z0-9_.-]",
                                                    "_"
                                            )
                                    );

                    startActivityForResult(intent, 43);

                } catch (Exception e) {
                    pendingFile = null;
                    fileError();
                }
            });
        }
    }

    private void notifyFileSaved(boolean saved, String name) {
        webView.evaluateJavascript("window.CABackups && window.CABackups.nativeSaved(" + saved + "," + org.json.JSONObject.quote(name == null ? "" : name) + ");", null);
    }

    private void fileError() {
        notifyFileSaved(false, pendingFileName);
        new AlertDialog.Builder(this)
                .setMessage(
                        "No se pudo guardar el archivo. Vuelve a intentarlo."
                )
                .setPositiveButton("Aceptar", null)
                .show();
    }

    @Override
    protected void onActivityResult(
            int request,
            int result,
            Intent intent
    ) {
        super.onActivityResult(
                request,
                result,
                intent
        );

        if (request == 42 && upload != null) {
            upload.onReceiveValue(
                    WebChromeClient.FileChooserParams
                            .parseResult(result, intent)
            );
            upload = null;
        }

        if (request == 43) {
            boolean saved = false;
            if (result == RESULT_OK
                    && intent != null
                    && intent.getData() != null
                    && pendingFile != null) {

                try (
                        OutputStream out =
                                getContentResolver()
                                        .openOutputStream(
                                                intent.getData()
                                        )
                ) {
                    if (out == null) throw new java.io.IOException("No se pudo abrir el destino");
                    out.write(pendingFile);
                    out.flush();

                    saved = true;
                } catch (Exception e) {
                    saved = false;
                    fileError();
                }
            }

            pendingFile = null;
            notifyFileSaved(saved, pendingFileName);
            pendingFileName = null;
        }
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript(
                "(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return 'preview';}var o=document.getElementById('pdfPreviewOverlay');"
                        + "if(o){o.remove();return 'preview';}"
                        + "var p=document.querySelector('.page.active');return p?p.id:'home';})()",
                value -> {
                    if ("\"preview\"".equals(value)) {
                        return;
                    }

                    if (!"\"home\"".equals(value)) {
                        webView.evaluateJavascript(
                                "returnToPreviousPage();",
                                null
                        );
                        return;
                    }

                    new AlertDialog.Builder(
                            MainActivity.this
                    )
                            .setMessage(
                                    "¿Quieres salir de Mis Cuentas PRO?"
                            )
                            .setPositiveButton(
                                    "Aceptar",
                                    (d, w) -> finish()
                            )
                            .setNegativeButton(
                                    "Cancelar",
                                    null
                            )
                            .show();
                }
        );
    }
}
