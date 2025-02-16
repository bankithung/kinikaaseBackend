package com.kinikaase;

import android.app.PictureInPictureParams;
import android.util.Rational;
import androidx.appcompat.app.AppCompatActivity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class PipModule extends ReactContextBaseJavaModule {
    PipModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "PipModule";
    }

    @ReactMethod
    public void enterPipMode() {
        AppCompatActivity activity = (AppCompatActivity) getCurrentActivity();
        if (activity != null && activity.isInPictureInPictureMode()) {
            return;
        }
        
        Rational aspectRatio = new Rational(16, 9);
        PictureInPictureParams params = new PictureInPictureParams.Builder()
            .setAspectRatio(aspectRatio)
            .build();
        activity.enterPictureInPictureMode(params);
    }
}