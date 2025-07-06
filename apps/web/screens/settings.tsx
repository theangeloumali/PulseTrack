"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Settings as SettingsIcon,
  UserCircle,
  DollarSign,
  Key,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/lib/db/service";
import {
  useThemeStore,
  themePalettes,
  type ThemeMode,
  type ThemePalette,
} from "@/lib/stores/theme";

// Custom Switch Component
const Switch = ({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
  </label>
);

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile settings state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskUpdates, setTaskUpdates] = useState(true);
  const [timeReminders, setTimeReminders] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);

  // Theme state from theme store
  const {
    mode: themeMode,
    palette: themePalette,
    setMode,
    setPalette,
  } = useThemeStore();

  // Appearance settings state
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState("12");

  // Security settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Active tab state
  const [activeTab, setActiveTab] = useState("profile");

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setHourlyRate(user.hourly_rate?.toString() || "");
    }
  }, [user]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: any) => updateUser(user?.id || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      alert("Settings updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update settings:", error);
      alert("Failed to update settings");
    },
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const profileData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      updated_at: new Date().toISOString(),
    };

    updateUserMutation.mutate(profileData);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    alert(
      "Password change functionality will be implemented with Supabase Auth",
    );
  };

  const handleNotificationSave = () => {
    alert(
      "Notification settings saved! (This will be connected to backend later)",
    );
  };

  const handleAppearanceSave = () => {
    alert("Appearance settings saved!");
    // Theme changes are automatically applied through the theme store
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "system_admin":
        return "System Admin";
      case "company_admin":
        return "Company Admin";
      case "manager":
        return "Manager";
      default:
        return "User";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800";
      case "system_admin":
        return "bg-red-100 text-red-800";
      case "company_admin":
        return "bg-blue-100 text-blue-800";
      case "manager":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <SettingsIcon className="w-4 h-4 mr-1" />
          User Preferences
        </Badge>
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          {[
            { id: "profile", label: "Profile", icon: UserCircle },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "appearance", label: "Appearance", icon: Palette },
            { id: "security", label: "Security", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and professional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Avatar and Role */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-xl font-semibold text-muted-foreground">
                    {user.first_name?.[0] ||
                      user.email?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {user.first_name || "User"} {user.last_name || ""}
                  </h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <Badge
                    className={`mt-1 ${getRoleBadgeColor(user.role || "")}`}
                  >
                    {getRoleDisplayName(user.role || "")}
                  </Badge>
                </div>
              </div>

              <hr className="border-border" />

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Used for time tracking calculations and billing reports
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="w-full md:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your projects and tasks
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                </div>

                <hr className="border-border" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="task-updates">Task Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when tasks are assigned to you or updated
                    </p>
                  </div>
                  <Switch
                    id="task-updates"
                    checked={taskUpdates}
                    onChange={setTaskUpdates}
                  />
                </div>

                <hr className="border-border" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="time-reminders">
                      Time Tracking Reminders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Remind you to log time when you forget to start a timer
                    </p>
                  </div>
                  <Switch
                    id="time-reminders"
                    checked={timeReminders}
                    onChange={setTimeReminders}
                  />
                </div>

                <hr className="border-border" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weekly-reports">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a summary of your weekly activity and progress
                    </p>
                  </div>
                  <Switch
                    id="weekly-reports"
                    checked={weeklyReports}
                    onChange={setWeeklyReports}
                  />
                </div>
              </div>

              <Button
                onClick={handleNotificationSave}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance & Display
              </CardTitle>
              <CardDescription>
                Customize how PulseTrack looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme Mode</Label>
                    <Select
                      value={themeMode}
                      onValueChange={(value: ThemeMode) => setMode(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred color scheme
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="palette">Color Palette</Label>
                    <Select
                      value={themePalette}
                      onValueChange={(value: ThemePalette) => setPalette(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color palette" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(themePalettes).map(([key, palette]) => (
                          <SelectItem key={key} value={key}>
                            {palette.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {themePalettes[themePalette]?.description ||
                        "Choose your preferred color palette"}
                    </p>
                  </div>

                  {/* Color Preview */}
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="flex gap-2">
                      {Object.entries(themePalettes).map(([key, palette]) => (
                        <button
                          key={key}
                          onClick={() => setPalette(key as ThemePalette)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            themePalette === key
                              ? "border-foreground scale-110"
                              : "border-border"
                          }`}
                          style={{ backgroundColor: palette.primary }}
                          title={palette.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">
                        UTC (Coordinated Universal Time)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time (US & Canada)
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time (US & Canada)
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time (US & Canada)
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time (US & Canada)
                      </SelectItem>
                      <SelectItem value="Europe/London">
                        London (GMT)
                      </SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeFormat">Time Format</Label>
                    <Select value={timeFormat} onValueChange={setTimeFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAppearanceSave}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                  />
                </div>

                <Button type="submit" className="w-full md:w-auto">
                  <Key className="w-4 h-4 mr-2" />
                  Update Password
                </Button>
              </form>

              <hr className="border-border" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Account Status</h4>
                    <p className="text-sm text-muted-foreground">
                      Your account is active and secure
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600"
                  >
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Account Created</h4>
                    <p className="text-sm text-muted-foreground">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
