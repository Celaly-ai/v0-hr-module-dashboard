/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.feyroute.ik",
  appName: "FeyRoute IK",
  webDir: "public",
  server: {
    url: "https://ik.feyroute.com/portal/personel-paneli",
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#ffffff",
    },
  },
}

export default config
