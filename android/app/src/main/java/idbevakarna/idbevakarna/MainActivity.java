package idbevakarna.idbevakarna;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.capacitorjs.plugins.network.NetworkPlugin;
import com.capacitorcommunity.bluetoothle.BluetoothLe;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initializes the Bridge
        this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
            // Additional plugins you've installed go here
            add(PushNotificationsPlugin.class);
            add(NetworkPlugin.class);
            add(BluetoothLe.class);
        }});
    }
}