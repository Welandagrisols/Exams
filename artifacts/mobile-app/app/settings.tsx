import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, useColorScheme,
} from "react-native";
import WebView from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import palette from "@/constants/colors";

// ─── Inline HTML canvas signature pad (blue ink) ─────────────────────────────
const SIGNATURE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:#fff}
canvas{display:block;touch-action:none}
.hint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  color:#94a3b8;font-size:14px;font-family:sans-serif;pointer-events:none;white-space:nowrap}
.bar{display:flex;gap:8px;padding:10px 12px;background:#f8fafc;border-top:1px solid #e2e8f0}
button{flex:1;padding:11px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
.clr{background:#fee2e2;color:#991b1b}
.sav{background:#1e40af;color:#fff}
</style>
</head>
<body>
<div style="position:relative">
  <canvas id="c"></canvas>
  <div class="hint" id="h">Sign with your finger</div>
</div>
<div class="bar">
  <button class="clr" onclick="clr()">Clear</button>
  <button class="sav" onclick="sav()">Save</button>
</div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),h=document.getElementById('h');
var dpr=window.devicePixelRatio||1,drawing=false,hasDrawing=false,lx,ly;
function resize(){
  var w=window.innerWidth,ht=180;
  c.width=w*dpr; c.height=ht*dpr;
  c.style.width=w+'px'; c.style.height=ht+'px';
  ctx.scale(dpr,dpr);
}
resize();
function pos(e){var r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return[t.clientX-r.left,t.clientY-r.top]}
function start(e){e.preventDefault();drawing=true;var p=pos(e);lx=p[0];ly=p[1];h.style.display='none'}
function move(e){
  e.preventDefault();if(!drawing)return;
  var p=pos(e);
  ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(p[0],p[1]);
  ctx.strokeStyle='#1a56db';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  lx=p[0];ly=p[1];hasDrawing=true;
}
function end(){drawing=false}
function clr(){ctx.clearRect(0,0,c.width/dpr,c.height/dpr);hasDrawing=false;h.style.display='';window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'clear'}))}
function sav(){if(!hasDrawing)return;window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'save',data:c.toDataURL('image/png')}))}
c.addEventListener('touchstart',start,{passive:false});
c.addEventListener('touchmove',move,{passive:false});
c.addEventListener('touchend',end);
c.addEventListener('mousedown',start);
c.addEventListener('mousemove',move);
c.addEventListener('mouseup',end);
</script>
</body>
</html>`;

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { user, signOut } = useAuth();

  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"draw" | "upload">("draw");

  useEffect(() => {
    apiFetch<{ signatureData: string | null }>("/me")
      .then(d => setSavedSignature(d.signatureData ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "save") setPendingSignature(msg.data);
      else if (msg.type === "clear") setPendingSignature(null);
    } catch {}
  };

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      setPendingSignature(`data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!pendingSignature) return;
    setSaving(true);
    try {
      await apiFetch("/me/signature", {
        method: "PATCH",
        body: JSON.stringify({ signatureData: pendingSignature }),
      });
      setSavedSignature(pendingSignature);
      Alert.alert("Saved", "Your signature has been saved.");
    } catch {
      Alert.alert("Error", "Failed to save signature. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearSaved = () => {
    Alert.alert("Remove Signature", "Remove your saved signature?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await apiFetch("/me/signature", { method: "DELETE" });
            setSavedSignature(null);
            setPendingSignature(null);
          } catch {
            Alert.alert("Error", "Failed to remove signature.");
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      marginHorizontal: 16, marginTop: 16,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    sectionHeader: {
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      flexDirection: "row", alignItems: "center", gap: 8,
    },
    sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    desc: {
      fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground,
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, lineHeight: 18,
    },
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.mutedForeground, flex: 1 },
    rowValue: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    tabRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 },
    tabBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 9, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
    },
    tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.mutedForeground },
    tabBtnTextActive: { color: "#fff" },
    savedBanner: {
      marginHorizontal: 16, marginTop: 12, padding: 12,
      backgroundColor: "#eff6ff", borderRadius: colors.radius,
      borderWidth: 1, borderColor: "#bfdbfe",
    },
    savedLabel: {
      fontFamily: "Poppins_500Medium", fontSize: 11, color: "#1d4ed8",
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
    },
    sigImg: { height: 64, width: "100%", resizeMode: "contain" },
    canvasWrap: {
      margin: 16, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      overflow: "hidden", height: 230,
    },
    uploadWrap: { margin: 16, gap: 10 },
    uploadPreview: {
      borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border,
      padding: 12, alignItems: "center",
    },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, marginHorizontal: 16, marginTop: 12,
      paddingVertical: 13, borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
    dangerBtn: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fca5a5", marginBottom: 16 },
    dangerText: { color: "#991b1b" },
    outlineBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, marginHorizontal: 16, marginTop: 8, marginBottom: 48,
      paddingVertical: 13, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
    },
    outlineBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
  });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Profile ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
          <Text style={s.sectionTitle}>Profile</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>Email</Text>
          <Text style={s.rowValue} numberOfLines={1}>{user?.email ?? "—"}</Text>
        </View>
        <View style={[s.row, { borderBottomWidth: 0 }]}>
          <Text style={s.rowLabel}>Role</Text>
          <Text style={s.rowValue}>Teacher / Staff</Text>
        </View>
      </View>

      {/* ── My Signature ── */}
      <View style={[s.section, { overflow: "visible" }]}>
        <View style={s.sectionHeader}>
          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
          <Text style={s.sectionTitle}>My Signature</Text>
        </View>
        <Text style={s.desc}>
          Draw or upload your handwritten signature. It will be stamped onto student
          reports when you sign them. Drawn signatures appear in blue ink.
        </Text>

        {savedSignature && (
          <View style={s.savedBanner}>
            <Text style={s.savedLabel}>Saved signature</Text>
            <Image source={{ uri: savedSignature }} style={s.sigImg} />
          </View>
        )}

        {/* Tab switcher */}
        <View style={s.tabRow}>
          {(["draw", "upload"] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
              <Ionicons
                name={t === "draw" ? "pencil" : "image-outline"}
                size={15}
                color={tab === t ? "#fff" : colors.mutedForeground}
              />
              <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>
                {t === "draw" ? "Draw" : "Upload Photo"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "draw" ? (
          <View style={[s.canvasWrap, { overflow: "hidden" }]}>
            <WebView
              source={{ html: SIGNATURE_HTML }}
              onMessage={handleWebViewMessage}
              scrollEnabled={false}
              style={{ flex: 1, backgroundColor: "#fff" }}
              originWhitelist={["*"]}
            />
          </View>
        ) : (
          <View style={s.uploadWrap}>
            {pendingSignature && tab === "upload" && (
              <View style={s.uploadPreview}>
                <Image source={{ uri: pendingSignature }} style={{ height: 80, width: "100%", resizeMode: "contain" }} />
              </View>
            )}
            <TouchableOpacity style={[s.btn, { marginHorizontal: 0, marginTop: 0 }]} onPress={handleUpload}>
              <Ionicons name="image-outline" size={18} color="#fff" />
              <Text style={s.btnText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {pendingSignature && (
          <TouchableOpacity style={s.btn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.btnText}>Save Signature</Text></>
            }
          </TouchableOpacity>
        )}

        {savedSignature && (
          <TouchableOpacity style={[s.btn, s.dangerBtn]} onPress={handleClearSaved}>
            <Ionicons name="trash-outline" size={18} color="#991b1b" />
            <Text style={[s.btnText, s.dangerText]}>Remove Saved Signature</Text>
          </TouchableOpacity>
        )}

        {!savedSignature && !pendingSignature && <View style={{ height: 16 }} />}
      </View>

      {/* ── Sign Out ── */}
      <TouchableOpacity style={s.outlineBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.foreground} />
        <Text style={s.outlineBtnText}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
