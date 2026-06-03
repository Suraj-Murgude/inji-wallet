# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep the NPrime SDK classes and native methods intact
-keep class in.nprime.** { *; }
-dontwarn in.nprime.**

# Keep your React Native integration wrapper code
-keep class io.mosip.residentapp.** { *; }

# Protect OpenCV classes since NPrime relies heavily on it
-keep class org.opencv.** { *; }
-dontwarn org.opencv.**

# Maintain native JNI method names for bridge callbacks
-keepclasseswithmembernames class * {
    native <methods>;
}
