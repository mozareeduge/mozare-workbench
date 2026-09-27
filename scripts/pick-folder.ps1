# Native folder chooser for Mozare Workbench (called by the local server with fixed arguments).
# Windows does not let a background process take focus, so the chooser is pinned always-on-top
# as soon as it appears; otherwise it opens behind the browser and looks like nothing happened.
# Prints the chosen path, or nothing when cancelled.
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class PinWindow {
  public delegate bool Callback(IntPtr handle, IntPtr state);
  [DllImport("user32.dll")] static extern bool EnumWindows(Callback callback, IntPtr state);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr handle, StringBuilder name, int size);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr handle, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr handle);
  public static bool Pin() {
    uint self = (uint)System.Diagnostics.Process.GetCurrentProcess().Id; bool pinned = false;
    EnumWindows((handle, state) => {
      uint owner; GetWindowThreadProcessId(handle, out owner);
      var name = new StringBuilder(64); GetClassName(handle, name, 64);
      if (owner == self && IsWindowVisible(handle) && name.ToString() == "#32770") {
        SetWindowPos(handle, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
        SetForegroundWindow(handle);
        pinned = true;
      }
      return true;
    }, IntPtr.Zero);
    return pinned;
  }
}
"@
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 150
$timer.Add_Tick({ if ([PinWindow]::Pin()) { $timer.Stop() } })
$timer.Start()
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Choose a project folder for Mozare Workbench'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }
$timer.Dispose()
