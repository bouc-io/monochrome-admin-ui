import { useState } from "react";
import { Settings, Keyboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, Theme } from "@/context/ThemeContext";
import { useLanguage, Language } from "@/context/LanguageContext";
import { useAuth } from "@/auth/authcontext";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [tempTheme, setTempTheme] = useState<Theme>(theme);
  const [tempLanguage, setTempLanguage] = useState<Language>(language);

  const userEmail = (user?.email ||
    user?.preferred_username ||
    "Admin") as string;
  const userName = (user?.name ||
    user?.preferred_username ||
    userEmail) as string;

  const handleSave = () => {
    setTheme(tempTheme);
    setLanguage(tempLanguage);
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your preferences and account.
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">{t.theme}</label>
              <p className="text-xs text-muted-foreground">{t.chooseTheme}</p>
            </div>
            <Select
              value={tempTheme}
              onValueChange={(v) => setTempTheme(v as Theme)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t.light}</SelectItem>
                <SelectItem value="dark">{t.dark}</SelectItem>
                <SelectItem value="system">{t.system}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">{t.language}</label>
              <p className="text-xs text-muted-foreground">
                {t.selectLanguage}
              </p>
            </div>
            <Select
              value={tempLanguage}
              onValueChange={(v) => setTempLanguage(v as Language)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">{t.english}</SelectItem>
                <SelectItem value="french">{t.french}</SelectItem>
                <SelectItem value="spanish">{t.spanish}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{userEmail}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span>{userName}</span>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span>{t.shortcutShowHelp}</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
              ?
            </kbd>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave}>{t.saveChanges}</Button>
      </div>
    </div>
  );
}
