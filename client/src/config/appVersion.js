// Keep in sync with client/android/app/build.gradle (versionName & versionCode)
export const APP_VERSION = '1.0.1';
export const APP_VERSION_CODE = 2;

export function isNativeApk() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      (window.location.hostname === 'localhost' &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ''))
  );
}

function compareSemver(a = '0.0.0', b = '0.0.0') {
  const pa = String(a).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isNewerApkVersion(remote) {
  if (!remote) return false;
  if (typeof remote.versionCode === 'number' && remote.versionCode > APP_VERSION_CODE) {
    return true;
  }
  if (remote.latestVersion && compareSemver(remote.latestVersion, APP_VERSION) > 0) {
    return true;
  }
  return false;
}
