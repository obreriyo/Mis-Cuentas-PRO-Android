package com.miscuentas.pro;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
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

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        migrating = !getPreferences(MODE_PRIVATE).getBoolean("httpsMigrationV2", false);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(migrating);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (OLD.equals(request.getUrl().toString())) {
                    return new WebResourceResponse("text/html", "UTF-8", new ByteArrayInputStream(
                            "<!doctype html><meta charset='utf-8'><p>Preparando tu copia local…</p>".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                }
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return !url.equals(HOME) && !(migrating && url.equals(OLD));
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!migrating) return;
                if (OLD.equals(url)) {
                    view.evaluateJavascript("JSON.stringify({mis_cuentas_pro_web_v1:localStorage.getItem('mis_cuentas_pro_web_v1'),mcp_pin_hash:localStorage.getItem('mcp_pin_hash')})", result -> {
                        try {
                            Object parsed = new JSONTokener(result).nextValue();
                            if (!(parsed instanceof String)) throw new Exception("No se pudo leer el almacenamiento anterior");
                            legacy = new JSONObject((String) parsed).toString();
                            view.loadUrl(ORIGIN + "/assets/migrate.html");
                        } catch (Exception e) { migrationError(); }
                    });
                } else if (url.equals(ORIGIN + "/assets/migrate.html")) {
                    view.evaluateJavascript("(function(){try{const d=" + legacy + ";for(const k of Object.keys(d)){if(d[k]!==null&&localStorage.getItem(k)===null)localStorage.setItem(k,d[k]);}return true}catch(e){return false}})()", result -> {
                        if (!"true".equals(result)) { migrationError(); return; }
                        getPreferences(MODE_PRIVATE).edit().putBoolean("httpsMigrationV2", true).apply();
                        migrating = false;
                        settings.setAllowFileAccess(false);
                        view.loadUrl(HOME);
                        view.clearHistory();
                    });
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (upload != null) upload.onReceiveValue(null);
                upload = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(intent, 42); }
                catch (Exception e) { upload.onReceiveValue(null); upload = null; }
                return true;
            }
        });
        webView.addJavascriptInterface(new PrintBridge(), "AndroidPrint");
        webView.addJavascriptInterface(new FileBridge(), "AndroidFiles");
        webView.loadUrl(migrating ? OLD : HOME);
    }
    private void migrationError() {
        new AlertDialog.Builder(this).setTitle("No se pudo migrar la copia local")
                .setMessage("Los datos originales siguen intactos. Cierra y vuelve a abrir la app. No borres sus datos ni la desinstales.")
                .setPositiveButton("Cerrar", (d,w) -> finish()).show();
    }
    private class PrintBridge {
        @JavascriptInterface public void printPage() {
            runOnUiThread(() -> {
                if (!HOME.equals(webView.getUrl())) return;
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("Mis_Cuentas_PRO");
                PrintAttributes attrs = new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS).build();
                pm.print("Mis Cuentas PRO", adapter, attrs);
            });
        }
    }
    private class FileBridge {
        @JavascriptInterface public void saveFile(String base64, String name, String mime) {
            runOnUiThread(() -> {
                if (!HOME.equals(webView.getUrl()) || pendingFile != null) return;
                try {
                    pendingFile = Base64.decode(base64, Base64.DEFAULT);
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                            .setType("application/pdf".equals(mime) ? "application/pdf" : "application/json")
                            .putExtra(Intent.EXTRA_TITLE, name.replaceAll("[^a-zA-Z0-9_.-]", "_"));
                    startActivityForResult(intent, 43);
                } catch (Exception e) { pendingFile = null; fileError(); }
            });
        }
    }
    private void fileError() {
        new AlertDialog.Builder(this).setMessage("No se pudo guardar el archivo. Vuelve a intentarlo.").setPositiveButton("Aceptar", null).show();
    }
    @Override protected void onActivityResult(int request, int result, Intent intent) {
        super.onActivityResult(request, result, intent);
        if (request == 42 && upload != null) {
            upload.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, intent)); upload = null;
        }
        if (request == 43) {
            if (result == RESULT_OK && intent != null && intent.getData() != null && pendingFile != null) {
                try (OutputStream out = getContentResolver().openOutputStream(intent.getData())) { out.write(pendingFile); }
                catch (Exception e) { fileError(); }
            }
            pendingFile = null;
        }
    }
    @Override public void onBackPressed() {
        webView.evaluateJavascript("(function(){var o=document.getElementById('pdfPreviewOverlay');if(o){o.remove();return 'closed';}return 'none';})()", value -> {
            if ("\"none\"".equals(value)) {
                if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
            }
        });
    }
}
