package com.ventas.repartidor;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Habilitar Chrome Remote Debugging para poder inspeccionar
        // la app desde chrome://inspect en la PC
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
